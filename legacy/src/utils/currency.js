// ============================================================
// FILE: src/utils/currency.js
// PURPOSE: 26 world currencies, formatting, conversion helpers
// ============================================================

export const CURRENCIES = [
  { code: 'NPR', symbol: 'Rs',    name: 'Nepali Rupee',         flag: '🇳🇵', decimal: 2 },
  { code: 'USD', symbol: '$',     name: 'US Dollar',            flag: '🇺🇸', decimal: 2 },
  { code: 'EUR', symbol: '€',     name: 'Euro',                 flag: '🇪🇺', decimal: 2 },
  { code: 'GBP', symbol: '£',     name: 'British Pound',        flag: '🇬🇧', decimal: 2 },
  { code: 'INR', symbol: '₹',     name: 'Indian Rupee',         flag: '🇮🇳', decimal: 2 },
  { code: 'AED', symbol: 'د.إ',   name: 'UAE Dirham',           flag: '🇦🇪', decimal: 2 },
  { code: 'SAR', symbol: '﷼',     name: 'Saudi Riyal',          flag: '🇸🇦', decimal: 2 },
  { code: 'QAR', symbol: 'QR',    name: 'Qatari Riyal',         flag: '🇶🇦', decimal: 2 },
  { code: 'KWD', symbol: 'KD',    name: 'Kuwaiti Dinar',        flag: '🇰🇼', decimal: 3 },
  { code: 'OMR', symbol: 'OMR',   name: 'Omani Rial',           flag: '🇴🇲', decimal: 3 },
  { code: 'JPY', symbol: '¥',     name: 'Japanese Yen',         flag: '🇯🇵', decimal: 0 },
  { code: 'CNY', symbol: '¥',     name: 'Chinese Yuan',         flag: '🇨🇳', decimal: 2 },
  { code: 'KRW', symbol: '₩',     name: 'South Korean Won',     flag: '🇰🇷', decimal: 0 },
  { code: 'SGD', symbol: 'S$',    name: 'Singapore Dollar',     flag: '🇸🇬', decimal: 2 },
  { code: 'MYR', symbol: 'RM',    name: 'Malaysian Ringgit',    flag: '🇲🇾', decimal: 2 },
  { code: 'THB', symbol: '฿',     name: 'Thai Baht',            flag: '🇹🇭', decimal: 2 },
  { code: 'IDR', symbol: 'Rp',    name: 'Indonesian Rupiah',    flag: '🇮🇩', decimal: 0 },
  { code: 'BDT', symbol: '৳',     name: 'Bangladeshi Taka',     flag: '🇧🇩', decimal: 2 },
  { code: 'PKR', symbol: '₨',     name: 'Pakistani Rupee',      flag: '🇵🇰', decimal: 2 },
  { code: 'LKR', symbol: 'Rs',    name: 'Sri Lankan Rupee',     flag: '🇱🇰', decimal: 2 },
  { code: 'AUD', symbol: 'A$',    name: 'Australian Dollar',    flag: '🇦🇺', decimal: 2 },
  { code: 'CAD', symbol: 'C$',    name: 'Canadian Dollar',      flag: '🇨🇦', decimal: 2 },
  { code: 'CHF', symbol: 'Fr',    name: 'Swiss Franc',          flag: '🇨🇭', decimal: 2 },
  { code: 'BRL', symbol: 'R$',    name: 'Brazilian Real',       flag: '🇧🇷', decimal: 2 },
  { code: 'ZAR', symbol: 'R',     name: 'South African Rand',   flag: '🇿🇦', decimal: 2 },
  { code: 'NGN', symbol: '₦',     name: 'Nigerian Naira',       flag: '🇳🇬', decimal: 2 },
  { code: 'KES', symbol: 'KSh',   name: 'Kenyan Shilling',      flag: '🇰🇪', decimal: 2 },
  { code: 'MXN', symbol: 'MX$',   name: 'Mexican Peso',         flag: '🇲🇽', decimal: 2 },
  { code: 'RUB', symbol: '₽',     name: 'Russian Ruble',        flag: '🇷🇺', decimal: 2 },
  { code: 'TRY', symbol: '₺',     name: 'Turkish Lira',         flag: '🇹🇷', decimal: 2 },
]

// ── Get currency by code ─────────────────────────────────────
export const getCurrency = (code) =>
  CURRENCIES.find(c => c.code === code) || CURRENCIES[0]

// ── Format amount ────────────────────────────────────────────
// compact=true  → Rs 4.2M / Rs 320K
// compact=false → Rs 4,200,000
export const formatAmount = (amount, currencyCode = 'NPR', compact = false) => {
  const curr = getCurrency(currencyCode)
  const sym  = curr.symbol

  if (amount == null || isNaN(amount)) return `${sym}0`

  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `${sym}${(amount / 1_000_000_000).toFixed(1)}B`
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `${sym}${(amount / 1_000_000).toFixed(1)}M`
    }
    if (Math.abs(amount) >= 1_000) {
      return `${sym}${(amount / 1_000).toFixed(0)}K`
    }
    return `${sym}${amount.toFixed(curr.decimal)}`
  }

  // Full format with commas
  return `${sym}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: curr.decimal,
  })}`
}

// ── Format for charts (tooltip) ─────────────────────────────
export const formatChartAmount = (value, currencyCode = 'NPR') => {
  return formatAmount(value, currencyCode, true)
}

// ── Payroll scale formatter for Y-axis ──────────────────────
export const payrollAxisFormatter = (value, currencyCode = 'NPR') => {
  const curr = getCurrency(currencyCode)
  return `${curr.symbol}${(value / 1_000_000).toFixed(1)}M`
}
