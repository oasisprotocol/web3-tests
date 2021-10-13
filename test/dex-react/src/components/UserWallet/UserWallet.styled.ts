import styled from 'styled-components'
import arrow from 'assets/img/arrow.svg'
import { MEDIA } from 'const'

export const UserWalletWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  line-height: 1;
  text-align: left;
  position: relative;

  .QRCode {
    border: 2rem solid #fff;
    border-radius: var(--border-radius);
    box-sizing: content-box;
    margin: 1rem auto;
  }
`

export const UserWalletItem = styled.div`
  display: flex;
  flex-flow: column wrap;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  white-space: initial;
  font-family: var(--font-mono);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: 0;
  flex: 1 1 auto;
  padding: 0;
  box-sizing: border-box;

  > a {
    line-height: 1;
    box-sizing: border-box;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
  }

  > a > svg {
    margin: 0 0.5rem 0 0;
  }
`

const WalletButton = styled.button`
  border-radius: 3rem;
  color: var(--color-text-CTA);
  font-size: 1.5rem;
  margin: 1.2rem 0;
  padding: 1rem 2rem;
  white-space: nowrap;
  width: auto;
`

export const BlockExplorerButton = styled(WalletButton)`
  background: transparent;
  color: var(--color-text-primary);
  > a,
  > a:link,
  > a:visited {
    color: inherit;
    text-decoration: none;

    > span {
      text-decoration: underline;
    }
  }

  &:hover {
    color: var(--color-text-primary);
    background: none;
  }
`

export const LogInOutButton = styled(WalletButton)<{ $loggedIn?: boolean }>`
  background: ${(props): string => (props.$loggedIn ? 'var(--color-button-danger)' : 'none')};
  color: ${(props): string => (props.$loggedIn ? 'var(--color-text-button-hover)' : 'var(--color-text-primary)')};
  margin: 0;
  font-family: var(--font-mono);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0;
  flex: 1;

  &:hover {
    background: ${(props): string => (props.$loggedIn ? 'var(--color-button-danger)' : 'none')};
    color: ${(props): string => (props.$loggedIn ? 'var(--color-text-button-hover)' : 'var(--color-text-primary)')};
    filter: grayscale(1);
  }

  > a {
    width: 100%;
    font-size: inherit;
  }

  @media ${MEDIA.mobile} {
    font-size: ${(props): string | false => !props.$loggedIn && '1.2rem'};
    padding: ${(props): string | false => !props.$loggedIn && '0'};
  }
`

export const ConnectWallet = styled.div`
  font-size: 1.4rem;
  line-height: 1;
  display: flex;
  flex-flow: row nowrap;
  margin: 0;

  > svg {
    margin: 0 0.5rem 0 0;
  }
`

export const UserAddress = styled.div`
  font-weight: var(--font-weight-bold);
  font-size: 1.6rem;
  color: var(--color-text-primary);
  letter-spacing: 0;

  @media ${MEDIA.mobile} {
    font-size: 1.3rem;
  }
`

export const UserWalletToggler = styled(UserWalletItem)`
  cursor: pointer;
  margin: 0;
  flex-flow: row nowrap;

  &::after {
    content: '';
    background: url(${arrow}) no-repeat center/contain;
    height: 1.4rem;
    width: 1.4rem;
    display: flex;
    transform: rotate(90deg);
    align-items: center;
    justify-content: center;
    align-content: center;
    margin: 0 0 0 0.7rem;
    opacity: 0.5;
    transition: transform 0.2s ease-in-out;
  }
  &.visible::after {
    transform: rotate(-90deg);
  }
`
// no filter: invert(100%);
// as it looks bad with most icons
export const WalletImage = styled.img`
  width: 2.4rem;
  height: 2.4rem;
  object-fit: contain;
  margin: 0 0.5rem 0 0;

  @media ${MEDIA.xSmallDown} {
    display: none;
  }
`

export const EtherImage = styled(WalletImage)`
  @media (prefers-color-scheme: dark) {
    body:not(.light-theme) & {
      filter: invert(100%);
    }
  }

  body.dark-theme & {
    filter: invert(100%);
  }
`

export const CopyDiv = styled.div`
  background: #90ee90ad;
  border-radius: 0.6rem;
  width: 100%;
  font-size: 1.2rem;
  padding: 0.5rem;
  margin: 0 0 1rem;
  text-align: center;

  @media ${MEDIA.mobile} {
    width: 100%;
    width: calc(100% - 3.2rem);
  }
`

export const UserWalletSlideWrapper = styled.div`
  position: absolute;
  left: 0;
  background: var(--color-background-pageWrapper);
  width: 31rem;
  display: flex;
  border-radius: 0.6rem;
  padding: 2.6rem 1.6rem;
  box-sizing: border-box;
  z-index: 10;
  flex-flow: column wrap;
  top: calc(100% + 0.7rem);
  margin: 1rem 0 0;
  box-shadow: var(--box-shadow-wrapper);

  @media ${MEDIA.mobile} {
    width: 100%;
    position: fixed;
    top: 0;
    box-sizing: border-box;
    box-shadow: 0 90vh 0 100vw rgba(47, 62, 78, 0.5);
    border-radius: 1.2rem;
    padding: 0 0 3rem;
  }

  > button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    background: transparent;
    height: 5.4rem;
    align-items: center;
    padding: 0 1.6rem;

    @media ${MEDIA.mediumUp} {
      display: none;
    }
  }

  > button > b {
    color: var(--color-text-primary);
    font-size: 1.6rem;
  }

  > button > i {
    font-style: normal;
    font-size: 4rem;
    font-family: Arial, sans-serif;
    color: #526877;
    font-weight: lighter;
    opacity: 0.5;
  }
`

export const NetworkTitle = styled.div`
  color: inherit;
  position: absolute;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.3rem;
  top: -0.8rem;
  white-space: nowrap;
`

export const WalletName = styled.div`
  position: absolute;
  top: 100%;
  font-size: 1rem;
`

export const MonospaceAddress = styled.div`
  cursor: pointer;
  margin: 0 0 1.6rem;
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: var(--font-weight-normal);
  word-break: break-all;
  line-height: 1.4;
  text-align: center;
  width: 90%;

  @media ${MEDIA.mobile} {
    border: solid 0.1rem var(--color-background-banner);
    border-radius: 0.6rem 0.6rem 0 0;
    padding: 1rem;
    box-sizing: border-box;
    width: calc(100% - 3.2rem);
  }

  > b {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  > svg {
    margin: 0 0 0 0.5rem;
  }
`
