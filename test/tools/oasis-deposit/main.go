package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

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

// Default address is derived from the following ETH mnemonic: "tray ripple elevator ramp insect butter top mouse old cinnamon panther chief"
// Correcponging ETH address: 0x90adE3B7065fa715c7a150313877dF1d33e777D5
const defaultToAddr = "oasis1qpupfu7e2n6pkezeaw0yhj8mcem8anj64ytrayne"

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
	amount := flag.Uint64("amount", 0, "amount to deposit")
	sock := flag.String("sock", "", "oasis-net-runner UNIX socket address")
	rtid := flag.String("rtid", "8000000000000000000000000000000000000000000000000000000000000000", "Runtime ID")
	to := flag.String("to", defaultToAddr, "deposit receiver")
	flag.Parse()

	if (*amount == 0) || (*sock == "") {
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

	var addr types.Address
	if err = addr.UnmarshalText([]byte(*to)); err != nil {
		fmt.Println("unmarshal addr err:", err)
		os.Exit(1)
	}
	ba := types.NewBaseUnits(*quantity.NewFromUint64(*amount), types.NativeDenomination)
	txb := consAcc.Deposit(&addr, ba).SetFeeConsensusMessages(1)
	_, err = SignAndSubmitTx(ctx, rtc, testing.Alice.Signer, *txb.GetTransaction(), 0)
	if err != nil {
		fmt.Printf("can't deposit: %s\n", err)
		os.Exit(1)
	}

	fmt.Printf("Done.\n")
}
