/**
 * FILE: src/hooks/useCurrency.js
 * Currency formatting hook.
 * Usage: const { format, symbol } = useCurrency()
 */
import { useContext } from 'react'
import { AppContext } from '../App.jsx'

export function useCurrency() {
  const ctx = useContext(AppContext)
  const currency = ctx?.currency || 'NPR'
  const SYMBOLS = { NPR:'रू', USD:'$', EUR:'€', GBP:'£', INR:'₹', JPY:'¥', CNY:'¥' }
  const symbol  = SYMBOLS[currency] || currency

  const format = (amount, opts = {}) => {
    if (amount === null || amount === undefined) return `${symbol}0`
    const num = parseFloat(amount) || 0
    if (opts.lakh && num >= 100000)  return `${symbol}${(num/100000).toFixed(1)}L`
    if (opts.thousands && num >= 1000) return `${symbol}${(num/1000).toFixed(0)}K`
    return `${symbol}${num.toLocaleString('en-IN')}`
  }

  return { format, symbol, currency }
}

export default useCurrency
