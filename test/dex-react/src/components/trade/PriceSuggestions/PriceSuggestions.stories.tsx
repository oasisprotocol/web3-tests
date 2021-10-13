import React, { useState } from 'react'

// also exported from '@storybook/react' if you can deal with breaking changes in 6.1
import { Meta, Story } from '@storybook/react/types-6-0'
import { PriceSuggestions, Props } from './PriceSuggestions'
import BigNumber from 'bignumber.js'
import { DAI, GNO } from 'storybook/data'
import { FormEmpty } from 'storybook/decorators'

export default {
  title: 'Trade/PriceSuggestions',
  component: PriceSuggestions,
  decorators: [FormEmpty],
} as Meta

const defaultProps = {
  baseToken: GNO,
  quoteToken: DAI,
  fillPrice: new BigNumber('55.13245672'),
  fillPriceLoading: false,
  isPriceInverted: false,
  amount: '100',
}

const Template: Story<Partial<Props>> = (props) => {
  const [isPriceInverted, setIsPriceInverted] = useState<boolean>(false)

  return (
    <PriceSuggestions
      {...defaultProps}
      isPriceInverted={isPriceInverted}
      onSwapPrices={(): void => setIsPriceInverted((isPriceInverted) => !isPriceInverted)}
      onClickPrice={(price, invertedPrice) => (): void =>
        console.log('Click price', price, invertedPrice, isPriceInverted)}
      {...props}
    />
  )
}

export const Basic = Template.bind({})

export const NoAmount = Template.bind({})
NoAmount.args = {
  amount: undefined,
}

export const LoadingFillPrice = Template.bind({})
LoadingFillPrice.args = {
  fillPriceLoading: true,
}

export const NoPrice = Template.bind({})
NoPrice.args = {
  fillPrice: null,
}
