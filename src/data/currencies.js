// ============================================
// FILE: src/data/currencies.js
// PURPOSE: 26 world currencies with symbols
// ============================================

export const CURRENCIES = [
  { code: 'NPR', symbol: 'Rs',     name: 'Nepali Rupee',         flag: '🇳🇵' },
  { code: 'USD', symbol: '$',      name: 'US Dollar',            flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',      name: 'Euro',                 flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',      name: 'British Pound',        flag: '🇬🇧' },
  { code: 'INR', symbol: '₹',      name: 'Indian Rupee',         flag: '🇮🇳' },
  { code: 'AED', symbol: 'د.إ',    name: 'UAE Dirham',           flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼',      name: 'Saudi Riyal',          flag: '🇸🇦' },
  { code: 'QAR', symbol: 'QR',     name: 'Qatari Riyal',         flag: '🇶🇦' },
  { code: 'KWD', symbol: 'KD',     name: 'Kuwaiti Dinar',        flag: '🇰🇼' },
  { code: 'JPY', symbol: '¥',      name: 'Japanese Yen',         flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥',      name: 'Chinese Yuan',         flag: '🇨🇳' },
  { code: 'KRW', symbol: '₩',      name: 'South Korean Won',     flag: '🇰🇷' },
  { code: 'SGD', symbol: 'S$',     name: 'Singapore Dollar',     flag: '🇸🇬' },
  { code: 'MYR', symbol: 'RM',     name: 'Malaysian Ringgit',    flag: '🇲🇾' },
  { code: 'THB', symbol: '฿',      name: 'Thai Baht',            flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp',     name: 'Indonesian Rupiah',    flag: '🇮🇩' },
  { code: 'BDT', symbol: '৳',      name: 'Bangladeshi Taka',     flag: '🇧🇩' },
  { code: 'PKR', symbol: '₨',      name: 'Pakistani Rupee',      flag: '🇵🇰' },
  { code: 'LKR', symbol: 'Rs',     name: 'Sri Lankan Rupee',     flag: '🇱🇰' },
  { code: 'AUD', symbol: 'A$',     name: 'Australian Dollar',    flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$',     name: 'Canadian Dollar',      flag: '🇨🇦' },
  { code: 'CHF', symbol: 'Fr',     name: 'Swiss Franc',          flag: '🇨🇭' },
  { code: 'BRL', symbol: 'R$',     name: 'Brazilian Real',       flag: '🇧🇷' },
  { code: 'ZAR', symbol: 'R',      name: 'South African Rand',   flag: '🇿🇦' },
  { code: 'NGN', symbol: '₦',      name: 'Nigerian Naira',       flag: '🇳🇬' },
  { code: 'KES', symbol: 'KSh',    name: 'Kenyan Shilling',      flag: '🇰🇪' },
]

export const getCurrency = (code) =>
  CURRENCIES.find(c => c.code === code) || CURRENCIES[0]

export const formatAmount = (amount, currencyCode = 'NPR', compact = false) => {
  const curr = getCurrency(currencyCode)
  if (compact) {
    if (amount >= 1000000) return `${curr.symbol}${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000)    return `${curr.symbol}${(amount / 1000).toFixed(0)}K`
  }
  return `${curr.symbol}${amount.toLocaleString()}`
}
