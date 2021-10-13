import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import styled from 'styled-components'

import Modal from 'components/common/Modal'
import { openGlobalModal, useGlobalModalContext, setOuterModalContext, closeGlobalModal } from './SingletonModal'

const WaitForTxWrapper = styled.div`
  font-size: 1.3em;
`

interface GlobaModalContextSlice {
  pendingTxApprovals: Set<number | string>
}

const PenidngTxApprovalsMessage: React.FC<{ txNumber: number }> = ({ txNumber }) => {
  return (
    <>
      <h4>No response from wallet for pending transaction</h4>
      <p>There are currently {txNumber} transactions waiting for approval from your wallet.</p>
      <p>Please validate with your wallet that you have properly accepted or rejected the transaction.</p>
      <p>Do you need more time signing the transaction?</p>
    </>
  )
}

const NoTxsWillClose: React.FC = () => {
  return (
    <>
      <h4>All transactions have been handled</h4>
      <p>Responses received for all pending transactions.</p>
      <p>This modal will close in a moment.</p>
    </>
  )
}

// time to display `Will Close` message
const CLOSE_DELAY = 3000

export const WaitForTxApprovalMessage: React.FC = () => {
  const { pendingTxApprovals } = useGlobalModalContext<GlobaModalContextSlice>()

  const [initialHeight, setInitialHeight] = useState(0)

  const wrapperRef = useRef<HTMLDivElement>(null)

  // layout effect for sync rerendering on style change
  // otherwise we get layout thrashing
  useLayoutEffect(() => {
    if (!wrapperRef.current) return
    setInitialHeight(wrapperRef.current.offsetHeight)
  }, [])

  const pendingTxNumber = pendingTxApprovals.size

  useEffect(() => {
    // don't close immediately when txs resolved/rejected
    // allow time to read `Will Close` message
    if (pendingTxNumber === 0) setTimeout(closeGlobalModal, CLOSE_DELAY)
  }, [pendingTxNumber])

  return (
    <WaitForTxWrapper ref={wrapperRef} style={initialHeight ? { height: initialHeight + 'px' } : undefined}>
      {pendingTxNumber ? <PenidngTxApprovalsMessage txNumber={pendingTxNumber} /> : <NoTxsWillClose />}
    </WaitForTxWrapper>
  )
}

const leftButton: typeof Modal.Button = (props) => <Modal.Button {...props} label="No, stop waiting" />
const rightButton: typeof Modal.Button = (props) => <Modal.Button {...props} label="Yes" />

let txsPendingApprovalCount = 0
export const areTxsPendingApproval = (): boolean => txsPendingApprovalCount > 0

export const addTxPendingApproval = (id: number | string | void): void => {
  if (id === undefined) return

  setOuterModalContext<GlobaModalContextSlice>(({ pendingTxApprovals = new Set(), ...rest }) => {
    const newPendingTxApprovals = new Set(pendingTxApprovals)
    newPendingTxApprovals.add(id)
    txsPendingApprovalCount = newPendingTxApprovals.size

    return {
      ...rest,
      pendingTxApprovals: newPendingTxApprovals,
    }
  })
}
export const removeTxPendingApproval = (id: number | string | void): void => {
  if (id === undefined) return

  setOuterModalContext<GlobaModalContextSlice>(({ pendingTxApprovals = new Set(), ...rest }) => {
    const newPendingTxApprovals = new Set(pendingTxApprovals)
    newPendingTxApprovals.delete(id)

    txsPendingApprovalCount = newPendingTxApprovals.size

    return {
      ...rest,
      pendingTxApprovals: newPendingTxApprovals,
    }
  })
}

export const removeAllTxsPendingApproval = (): void => {
  setOuterModalContext<GlobaModalContextSlice>((oldState) => ({
    ...oldState,
    pendingTxApprovals: new Set(),
  }))
}

export const openWaitForTxApprovalModal = (): Promise<boolean> =>
  openGlobalModal({
    message: <WaitForTxApprovalMessage />,
    leftButton,
    rightButton,
  })
