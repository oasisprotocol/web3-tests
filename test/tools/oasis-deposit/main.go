package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/miguelmota/go-ethereum-hdwallet"
	"google.golang.org/grpc"

	"github.com/oasisprotocol/oasis-core/go/common"
	"github.com/oasisprotocol/oasis-core/go/common/cbor"
	cmnGrpc "github.com/oasisprotocol/oasis-core/go/common/grpc"
	"github.com/oasisprotocol/oasis-core/go/common/quantity"

	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/client"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/crypto/signature"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/crypto/signature/ed25519"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/crypto/signature/secp256k1"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/crypto/signature/sr25519"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/modules/accounts"
	consAccClient "github.com/oasisprotocol/oasis-sdk/client-sdk/go/modules/consensusaccounts"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/modules/core"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/testing"
	"github.com/oasisprotocol/oasis-sdk/client-sdk/go/types"
)

const highGasAmount = 1000000

// Dave ETH mnemonic: "tray ripple elevator ramp insect butter top mouse old cinnamon panther chief"
// Corresponding ETH address: 0x90adE3B7065fa715c7a150313877dF1d33e777D5
const defaultToAddr = "oasis1qpupfu7e2n6pkezeaw0yhj8mcem8anj64ytrayne"

// Number of keys to derive from the mnemonic, if provided.
const numMnemonicDerivations = 10

func sigspecForSigner(signer signature.Signer) types.SignatureAddressSpec {
	switch pk := signer.Public().(type) {
	case ed25519.PublicKey:
		return types.NewSignatureAddressSpecEd25519(pk)
	case secp256k1.PublicKey:
		return types.NewSignatureAddressSpecSecp256k1Eth(pk)
	case sr25519.PublicKey:
		return types.NewSignatureAddressSpecSr25519(pk)
	default:
		panic(fmt.Sprintf("unsupported signer type: %T", pk))
	}
}

// GetChainContext returns the chain context.
func GetChainContext(ctx context.Context, rtc client.RuntimeClient) (signature.Context, error) {
	info, err := rtc.GetInfo(ctx)
	if err != nil {
		return "", err
	}
	return info.ChainContext, nil
}

// EstimateGas estimates the amount of gas the transaction will use.
// Returns modified transaction that has just the right amount of gas.
func EstimateGas(ctx context.Context, rtc client.RuntimeClient, tx types.Transaction, extraGas uint64) types.Transaction {
	var gas uint64
	oldGas := tx.AuthInfo.Fee.Gas
	// Set the starting gas to something high, so we don't run out.
	tx.AuthInfo.Fee.Gas = highGasAmount
	// Estimate gas usage.
	gas, err := core.NewV1(rtc).EstimateGas(ctx, client.RoundLatest, &tx)
	if err != nil {
		tx.AuthInfo.Fee.Gas = oldGas + extraGas
		return tx
	}
	// Specify only as much gas as was estimated.
	tx.AuthInfo.Fee.Gas = gas + extraGas
	return tx
}

// SignAndSubmitTx signs and submits the given transaction.
// Gas estimation is done automatically.
func SignAndSubmitTx(ctx context.Context, rtc client.RuntimeClient, signer signature.Signer, tx types.Transaction, extraGas uint64) (cbor.RawMessage, error) {
	// Get chain context.
	chainCtx, err := GetChainContext(ctx, rtc)
	if err != nil {
		return nil, err
	}

	// Get current nonce for the signer's account.
	ac := accounts.NewV1(rtc)
	nonce, err := ac.Nonce(ctx, client.RoundLatest, types.NewAddress(sigspecForSigner(signer)))
	if err != nil {
		return nil, err
	}
	tx.AppendAuthSignature(sigspecForSigner(signer), nonce)

	// Estimate gas.
	etx := EstimateGas(ctx, rtc, tx, extraGas)

	// Sign the transaction.
	stx := etx.PrepareForSigning()
	if err = stx.AppendSign(chainCtx, signer); err != nil {
		return nil, err
	}

	// Submit the signed transaction.
	var result cbor.RawMessage
	if result, err = rtc.SubmitTx(ctx, stx.UnverifiedTransaction()); err != nil {
		return nil, err
	}
	return result, nil
}

func main() {
	amount := flag.String("amount", "1_000_000_000_000_000_000", "amount to deposit in ParaTime base units")
	sock := flag.String("sock", "", "oasis-net-runner UNIX socket address")
	rtid := flag.String("rtid", "8000000000000000000000000000000000000000000000000000000000000000", "Runtime ID")
	to := flag.String("to", defaultToAddr, "deposit receiver")
	toMnemonic := flag.String("tomnemonic", "", "first ten deposit receivers generated from mnemonic")
	flag.Parse()

	*amount = strings.ReplaceAll(*amount, "_", "")
	if (*amount == "") || (*sock == "") {
		flag.PrintDefaults()
		os.Exit(1)
	}

	var runtimeID common.Namespace
	if err := runtimeID.UnmarshalHex(*rtid); err != nil {
		fmt.Printf("can't decode runtime ID: %s\n", err)
		os.Exit(1)
	}

	conn, err := cmnGrpc.Dial(*sock, grpc.WithInsecure())
	if err != nil {
		fmt.Printf("can't connect to socket: %s\n", err)
		os.Exit(1)
	}
	defer conn.Close()

	rtc := client.New(conn, runtimeID)
	consAcc := consAccClient.NewV1(rtc)

	ctx, cancelFn := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancelFn()

	toAddresses := []string{*to}
	if *toMnemonic != "" {
		wallet, err := hdwallet.NewFromMnemonic(*toMnemonic)
		if err != nil {
			log.Fatal(err)
		}

		toAddresses = []string{}
		for i := uint32(0); i < numMnemonicDerivations; i++ {
			path := hdwallet.MustParseDerivationPath(fmt.Sprintf("m/44'/60'/0'/0/%d", i))
			account, err := wallet.Derive(path, false)
			if err != nil {
				log.Fatal(err)
			}
			fmt.Println("generated address", account.Address)
			addr := types.NewAddressRaw(types.AddressV0Secp256k1EthContext, account.Address[:])
			toAddresses = append(toAddresses, addr.String())
		}
	}
	for _, a := range toAddresses {
		var addr types.Address
		if err = addr.UnmarshalText([]byte(a)); err != nil {
			fmt.Println("unmarshal addr err:", err)
			os.Exit(1)
		}
		quantity := *quantity.NewQuantity()
		amountBigInt, succ := new(big.Int).SetString(*amount, 0)
		if succ == false {
			fmt.Printf("can't parse amount %s, obtained value %s\n", *amount, amountBigInt.String())
			os.Exit(1)
		}
		if err = quantity.FromBigInt(amountBigInt); err != nil {
			fmt.Printf("can't parse quantity: %s\n", err)
			os.Exit(1)
		}
		ba := types.NewBaseUnits(quantity, types.NativeDenomination)
		txb := consAcc.Deposit(&addr, ba).SetFeeConsensusMessages(1)
		_, err = SignAndSubmitTx(ctx, rtc, testing.Alice.Signer, *txb.GetTransaction(), 0)
		if err != nil {
			fmt.Printf("can't deposit: %s\n", err)
			os.Exit(1)
		}
		fmt.Printf("Deposited %s to %s\n", ba.String(), a)
	}

	fmt.Printf("Done.\n")
}
