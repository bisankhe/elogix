// FILE: src/data/currencies.js
// eLogix HRMS — Supported Currencies
// Primary: NPR (Nepal Rupee) — required for Nepal Labour Act 2074 compliance
// eLogix Technologies · www.elogix.com.np

export const CURRENCIES = [
  {
    code    : 'NPR',
    name    : 'Nepali Rupee',
    symbol  : 'रु',
    symbolEn: 'NPR',
    locale  : 'ne-NP',
    flag    : '🇳🇵',
    default : true,
  },
  {
    code    : 'USD',
    name    : 'US Dollar',
    symbol  : '$',
    symbolEn: 'USD',
    locale  : 'en-US',
    flag    : '🇺🇸',
  },
  {
    code    : 'INR',
    name    : 'Indian Rupee',
    symbol  : '₹',
    symbolEn: 'INR',
    locale  : 'en-IN',
    flag    : '🇮🇳',
  },
  {
    code    : 'EUR',
    name    : 'Euro',
    symbol  : '€',
    symbolEn: 'EUR',
    locale  : 'en-EU',
    flag    : '🇪🇺',
  },
  {
    code    : 'GBP',
    name    : 'British Pound',
    symbol  : '£',
    symbolEn: 'GBP',
    locale  : 'en-GB',
    flag    : '🇬🇧',
  },
  {
    code    : 'AED',
    name    : 'UAE Dirham',
    symbol  : 'د.إ',
    symbolEn: 'AED',
    locale  : 'ar-AE',
    flag    : '🇦🇪',
  },
  {
    code    : 'SGD',
    name    : 'Singapore Dollar',
    symbol  : 'S$',
    symbolEn: 'SGD',
    locale  : 'en-SG',
    flag    : '🇸🇬',
  },
  {
    code    : 'AUD',
    name    : 'Australian Dollar',
    symbol  : 'A$',
    symbolEn: 'AUD',
    locale  : 'en-AU',
    flag    : '🇦🇺',
  },
]

// Format an amount in a given currency
export function formatCurrency(amount, code = 'NPR', options = {}) {
  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
  const num = parseFloat(amount || 0)
  if (isNaN(num)) return `${currency.symbolEn} 0`

  const { decimals = 0, compact = false } = options

  if (compact) {
    if (Math.abs(num) >= 10_000_000) return `${currency.symbolEn} ${(num / 10_000_000).toFixed(2)} Cr`
    if (Math.abs(num) >= 100_000)    return `${currency.symbolEn} ${(num / 100_000).toFixed(2)} L`
    if (Math.abs(num) >= 1_000)      return `${currency.symbolEn} ${(num / 1_000).toFixed(1)} K`
  }

  return `${currency.symbol} ${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}
