// ============================================================
// FILE: src/utils/dateUtils.js
// PURPOSE: Date utilities — AD/BS conversion, formatters,
//          Nepal-specific date helpers
// ============================================================

// ── AD to BS Conversion (Bikram Sambat) ─────────────────────
// Nepal uses BS calendar (approx AD + 56.7 years)
// Full conversion table would be used in production
// This is a simplified version for demo

export const AD_TO_BS_OFFSET = 56  // years approx

export const adToBs = (adDate) => {
  const d = new Date(adDate)
  const bsYear = d.getFullYear() + AD_TO_BS_OFFSET
  // Note: Real production would use full BS calendar lookup table
  const months = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadra',
                  'Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra']
  return {
    year:  bsYear,
    month: months[d.getMonth()],
    day:   d.getDate(),
    full:  `${d.getDate()} ${months[d.getMonth()]} ${bsYear}`,
  }
}

// ── Format date ──────────────────────────────────────────────
// format('2026-05-20', 'DD MMM YYYY')  => "20 May 2026"
export const formatDate = (dateStr, format = 'DD MMM YYYY') => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr

  const pad = (n) => String(n).padStart(2, '0')
  const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthFull  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']

  return format
    .replace('YYYY', d.getFullYear())
    .replace('YY',   String(d.getFullYear()).slice(-2))
    .replace('MMMM', monthFull[d.getMonth()])
    .replace('MMM',  monthShort[d.getMonth()])
    .replace('MM',   pad(d.getMonth() + 1))
    .replace('DD',   pad(d.getDate()))
    .replace('D',    d.getDate())
}

// ── Time ago ─────────────────────────────────────────────────
// timeAgo('2026-06-04T10:30:00') => "2 hours ago"
export const timeAgo = (dateStr) => {
  const now  = new Date()
  const then = new Date(dateStr)
  const diff = Math.floor((now - then) / 1000) // seconds

  if (diff < 60)          return `${diff} sec ago`
  if (diff < 3600)        return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400)       return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 604800)      return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`
  if (diff < 2592000)     return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) > 1 ? 's' : ''} ago`
  return formatDate(dateStr)
}

// ── Days until ───────────────────────────────────────────────
export const daysUntil = (dateStr) => {
  const now  = new Date()
  const then = new Date(dateStr)
  const diff = Math.ceil((then - now) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0)   return `${Math.abs(diff)} days ago`
  return `In ${diff} days`
}

// ── Current Nepal time ───────────────────────────────────────
export const getNepalTime = () => {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Working days between two dates ──────────────────────────
export const workingDays = (startDate, endDate) => {
  const start = new Date(startDate)
  const end   = new Date(endDate)
  let count   = 0
  const cur   = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++ // skip Sat, Sun
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// ── Nepal fiscal year ────────────────────────────────────────
// Nepal fiscal year: Shrawan 1 to Ashadh end (mid-July to mid-July)
export const getNepalFiscalYear = () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  // Approximate: if month >= 7 (July), fiscal year is current/next
  if (month >= 7) return `${year}/${year + 1}`
  return `${year - 1}/${year}`
}

// ── Month names array ────────────────────────────────────────
export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
]

// ── Nepali month names (BS) ──────────────────────────────────
export const NEPALI_MONTHS = [
  'बैशाख','जेठ','असार','साउन','भदौ','असोज',
  'कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'
]

export const TODAY = new Date().toISOString().split('T')[0]
export const THIS_YEAR = new Date().getFullYear()
