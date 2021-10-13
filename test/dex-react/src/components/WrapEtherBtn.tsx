import React, { useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import Modal, { useModal } from 'components/common/Modal'
import BN from 'bn.js'

import { DEFAULT_PRECISION, formatAmountFull, toWei, parseAmount, ZERO } from '@gnosis.pm/dex-js'

// utils
import { validatePositiveConstructor, validInputPattern, logDebug, getIsWrappable, getNativeTokenName } from 'utils'

// components
import { DEFAULT_MODAL_OPTIONS, ModalBodyWrapper } from 'components/Modal'
import { TooltipWrapper } from 'components/Tooltip'
import { InputBox } from 'components/InputBox'

// hooks
import useSafeState from 'hooks/useSafeState'
import { useWrapUnwrapEth } from 'hooks/useWrapUnwrapEth'
import { useTokenBalances } from 'hooks/useTokenBalances'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { composeOptionalParams } from 'utils/transaction'
import { toast } from 'toastify'
import { useEthBalances } from 'hooks/useEthBalance'
import { useWalletConnection } from 'hooks/useWalletConnection'

export const INPUT_ID_AMOUNT = 'wrapAmount'

const ModalWrapper = styled(ModalBodyWrapper)`
  > form {
    > div {
      margin: 3rem 1.5rem;

      ${InputBox} {
        position: relative;
        display: flex;
        flex-flow: row wrap;

        input {
          padding: 0 4.5rem 0 1rem;
        }

        i {
          position: absolute;
          right: 1rem;
          top: 0;
          bottom: 0;
          margin: 0;
          color: var(--color-svg-switcher);
          letter-spacing: -0.05rem;
          text-align: right;
          font-family: var(--font-default);
          font-weight: var(--font-weight-bold);
          font-size: 1.2rem;
          font-style: normal;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }
    }

    .error {
      color: var(--color-error);
    }

    > b {
      display: block;
      margin: 0 1.6rem 0 0;
      margin-bottom: 0.5rem;
      padding-left: -0.5;
      font-size: 1.3rem;
      color: var(--color-background-opaque-grey);
    }

    a {
      color: rgb(33, 141, 255);
    }

    p a {
      font-size: 1.2rem;
      margin-left: 0.2rem;
    }

    .more-info {
      font-size: 1.3rem;
      background: var(--color-background-validation-warning);
      padding: 0.1rem 1rem;
      margin: 1rem 0 0.25rem;
    }
  }
`

interface WrapUnwrapEtherBtnProps {
  wrap: boolean
  label?: string
  className?: string
}

export type WrapEtherBtnProps = Omit<WrapUnwrapEtherBtnProps, 'wrap'>

interface WrapUnwrapInfo {
  title: string
  symbolSource: string
  balance: BN | null
  tooltipText: React.ReactNode | string
  description: React.ReactNode
  amountLabel: string
  loading: boolean
}

interface GetModalParams {
  nativeToken: string
  wrappedToken: string
  wrap: boolean
  wethHelpVisible: boolean
  showWethHelp: React.Dispatch<React.SetStateAction<boolean>>
  wethBalance?: BN
  ethBalance: BN | null
  wrappingEth: boolean
  unwrappingWeth: boolean
}

function getModalParams(params: GetModalParams): WrapUnwrapInfo {
  const {
    nativeToken,
    wrappedToken,
    wrap,
    wethHelpVisible,
    showWethHelp,
    wethBalance,
    ethBalance,
    unwrappingWeth,
    wrappingEth,
  } = params
  const WethHelp = (
    <div className="more-info">
      <p>
        Gnosis Protocol allows the exchange of any ERC20 token. As {nativeToken} is not an ERC20 token, it must first be
        wrapped.
      </p>
      <p>
        By wrapping {nativeToken} you will be minting your submitted amount as {wrappedToken}.
      </p>
      <p>
        {nativeToken} can be <b>wrapped</b> as {wrappedToken} anytime. Equally, {wrappedToken} can be <b>unwrapped</b>{' '}
        back into {nativeToken}
      </p>
      {nativeToken === 'xDAI' && (
        <p>{wrappedToken} is a wrapped native token, in the same way WETH is to Ether in the Mainnet network.</p>
      )}
      <p>
        Learn more about WETH{' '}
        <a target="_blank" rel="noopener noreferrer" href="https://weth.io/">
          weth.io
        </a>
      </p>
    </div>
  )

  if (wrap) {
    const description = (
      <>
        <p>
          Wrap {nativeToken} into {wrappedToken}, so it can later be deposited into the exchange.{' '}
          {wethHelpVisible && WethHelp}
          <a onClick={(): void => showWethHelp(!wethHelpVisible)}>
            {wethHelpVisible ? '[-] Show less...' : '[+] Show more...'}
          </a>
        </p>
      </>
    )
    const tooltipText = (
      <div>
        Wrapping converts {nativeToken} into {wrappedToken},
        <br />
        so it can be deposited into the exchange
      </div>
    )

    return {
      title: 'Wrap ' + nativeToken,
      amountLabel: 'Amount to Wrap',
      symbolSource: nativeToken,
      balance: ethBalance,
      description,
      tooltipText,
      loading: wrappingEth,
    }
  } else {
    const description = (
      <>
        <p>
          Unwrapping converts {wrappedToken} back into {nativeToken}.{' '}
          {!wethHelpVisible && <a onClick={(): void => showWethHelp(true)}>Learn more...</a>}
        </p>
        {wethHelpVisible && WethHelp}
      </>
    )

    return {
      title: 'Unwrap ' + wrappedToken,
      amountLabel: 'Amount to Unwrap',
      symbolSource: wrappedToken,
      balance: wethBalance || null,
      description,
      tooltipText: `Unwrapping converts ${wrappedToken} back into ${nativeToken}`,
      loading: unwrappingWeth,
    }
  }
}

interface WrapEtherFormData {
  [INPUT_ID_AMOUNT]: string
}

const WrapUnwrapEtherBtn: React.FC<WrapUnwrapEtherBtnProps> = (props: WrapUnwrapEtherBtnProps) => {
  const { networkIdOrDefault } = useWalletConnection()
  const { nativeToken, wrappedToken } = getNativeTokenName(networkIdOrDefault)
  const { wrap, label, className } = props
  const [wethHelpVisible, showWethHelp] = useSafeState(false)
  const { wrapEth, unwrapWeth, wrappingEth, unwrappingWeth } = useWrapUnwrapEth()
  const { ethBalance } = useEthBalances()
  const { balances } = useTokenBalances()

  const wethBalanceDetails = balances.find((token) => getIsWrappable(networkIdOrDefault, token.address))
  const wethBalance = wethBalanceDetails?.walletBalance

  const { register, errors, handleSubmit, setValue, watch } = useForm<WrapEtherFormData>({
    mode: 'onChange',
  })
  const amountError = errors[INPUT_ID_AMOUNT]

  const { title, balance, symbolSource, tooltipText, description, amountLabel, loading } = useMemo(
    () =>
      getModalParams({
        nativeToken,
        wrappedToken,
        wrap,
        wethHelpVisible,
        showWethHelp,
        wethBalance,
        ethBalance,
        wrappingEth,
        unwrappingWeth,
      }),
    [
      nativeToken,
      wrappedToken,
      wrap,
      wethHelpVisible,
      showWethHelp,
      wethBalance,
      ethBalance,
      wrappingEth,
      unwrappingWeth,
    ],
  )

  // Show Warning: Check if the user is Wrapping all his balance
  const amountValue = watch(INPUT_ID_AMOUNT)
  const amount = parseAmount(amountValue, DEFAULT_PRECISION) || ZERO
  const wrapAllBalance = wrap && balance && !amount.isZero() && amount.eq(balance)

  // Show available balance
  //  * For wrapping, we just show the value
  //  * For unwrapping, we allow to click to unwrap all
  let availableBalanceComponent
  if (balance) {
    const amountFull = formatAmountFull({ amount: balance, precision: DEFAULT_PRECISION }) || '-'
    availableBalanceComponent = wrap ? (
      <span>
        {amountFull} {symbolSource}
      </span>
    ) : (
      <a
        onClick={(): void =>
          setValue(
            INPUT_ID_AMOUNT,
            formatAmountFull({ amount: balance, precision: DEFAULT_PRECISION, isLocaleAware: false }),
            { shouldValidate: true },
          )
        }
      >
        {amountFull} {symbolSource}
      </a>
    )
  } else {
    availableBalanceComponent = <span>...</span>
  }

  const toggleRef = useRef<() => void>()
  const isModalShownRef = useRef(false)

  const [modalHook, toggleModal] = useModal({
    ...DEFAULT_MODAL_OPTIONS,
    title,
    message: (
      <ModalWrapper>
        <form>
          <div>
            {description}
            <b>Available {symbolSource}</b>
            <div>{availableBalanceComponent}</div>
          </div>
          <div>
            <b>{amountLabel}</b>
            <div>
              <InputBox>
                <i>{symbolSource}</i>
                <input
                  type="text"
                  name={INPUT_ID_AMOUNT}
                  placeholder="0"
                  required
                  ref={register({
                    pattern: { value: validInputPattern, message: 'Invalid amount' },
                    validate: {
                      positive: validatePositiveConstructor('Invalid amount'),
                      max: (value: string): string | true => {
                        const amount = parseAmount(value, DEFAULT_PRECISION) || ZERO

                        if (balance && amount.gt(balance)) {
                          // Not enough balance
                          return "The amount cannot be bigger than what's available"
                        } else {
                          // Enough balance
                          return true
                        }
                      },
                    },
                    required: 'The amount is required',
                    min: 0,
                  })}
                  onBlur={(e): void => {
                    // react-hook-form does something onBlur that interferes with button clicks
                    // at the same time modali buttons rerender at every opportunity
                    // so click never arrives where we expect it to
                    // at least that is my guess
                    const { relatedTarget } = e
                    // here be hacks
                    if (relatedTarget instanceof HTMLButtonElement) {
                      relatedTarget.click()
                    }
                  }}
                />
              </InputBox>
            </div>
            {amountError && <p className="error">{amountError.message}</p>}
            {wrapAllBalance && (
              <p className="error">
                You are wrapping all your {nativeToken} balance. This would only make sense if your wallet doesn&apos;t
                need {nativeToken}
                to pay the gas (as in some wallets that use tokens as payment). <br />
                <br />
                Normally you would want to wrap a smaller fraction of your {nativeToken}.
                <br />
                <br />
                Are you sure you want to continue?
              </p>
            )}
          </div>
        </form>
      </ModalWrapper>
    ),
    buttons: [
      <Modal.Button label="Cancel" key="no" isStyleCancel onClick={(): void => modalHook.hide()} />,
      <Modal.Button
        label="Continue"
        key="yes"
        isStyleDefault
        onClick={handleSubmit((data: WrapEtherFormData): void => {
          const { wrapAmount: wrapAmountEther } = data
          const wrapAmount = toWei(wrapAmountEther)

          // Hide modal once the transaction is sent
          const txOptionalParams = composeOptionalParams(() => {
            if (isModalShownRef.current) toggleRef.current?.()
          })

          let wrapUnwrapPromise, successMessage: string, errorMessage: string
          if (wrap) {
            logDebug(`[WrapEtherBtn] Wrap ${wrapAmount} ${nativeToken}`)

            wrapUnwrapPromise = wrapEth(wrapAmount, txOptionalParams)
            successMessage = `Successfully wrapped ${wrapAmountEther} ${nativeToken}`
            errorMessage = `Error wrapping ${wrapAmountEther} ${nativeToken}`
          } else {
            logDebug(`[WrapEtherBtn] Unwrap ${wrapAmount} ${wrappedToken}`)
            wrapUnwrapPromise = unwrapWeth(wrapAmount, txOptionalParams)
            successMessage = `Successfully unwrapped ${wrapAmountEther} ${wrappedToken}`
            errorMessage = `Error unwrapping ${wrapAmountEther} ${wrappedToken}`
          }

          wrapUnwrapPromise
            .then(() => toast.success(successMessage))
            .catch((error) => {
              console.error(errorMessage, error)
              toast.error(errorMessage)
            })
        })}
      />,
    ],
  })

  // toggleModal recreated every time, keep ref to always use current in async code
  toggleRef.current = toggleModal
  // same for modalHook.isShown
  isModalShownRef.current = modalHook.isShown

  return (
    <>
      <TooltipWrapper as="button" type="button" className={className} onClick={toggleModal} tooltip={tooltipText}>
        {loading && <FontAwesomeIcon icon={faSpinner} spin />} {label || title}
      </TooltipWrapper>
      <Modal.Modal {...modalHook} />
    </>
  )
}

export const WrapEtherBtn: React.FC<WrapEtherBtnProps> = (props: WrapEtherBtnProps) => (
  <WrapUnwrapEtherBtn wrap {...props} />
)

export const UnwrapEtherBtn: React.FC<WrapEtherBtnProps> = (props: WrapEtherBtnProps) => (
  <WrapUnwrapEtherBtn wrap={false} {...props} />
)
