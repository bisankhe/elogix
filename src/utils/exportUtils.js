// FILE: src/utils/exportUtils.js
// eLogix HRMS — Export utilities (CSV, XLSX, PDF)
// eLogix Technologies · www.elogix.com.np

export async function exportToCSV(data, filename = 'export.csv') {
  if (!data || !data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

export async function exportToXLSX(data, filename = 'export.xlsx', sheetName = 'Sheet1') {
  try {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.mjs')
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
  } catch (e) {
    console.warn('xlsx not available, falling back to CSV')
    await exportToCSV(data, filename.replace('.xlsx', '.csv'))
  }
}

// Alias — many pages import as exportToExcel
export const exportToExcel = exportToXLSX

export async function exportToPDF(data, filename = 'export.pdf', title = 'eLogix Report') {
  // Simple PDF via print dialog (no external lib needed)
  const headers = data.length ? Object.keys(data[0]) : []
  const rows = data.map(row => headers.map(h => `<td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:11px">${row[h] ?? ''}</td>`).join(''))
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;padding:20px}
  h2{color:#0369a1;margin-bottom:16px}
  table{border-collapse:collapse;width:100%}
  th{background:#0369a1;color:#fff;padding:8px 10px;font-size:11px;text-align:left}
  tr:nth-child(even){background:#f8fafc}
  @media print{button{display:none}}</style></head>
  <body><h2>${title}</h2>
  <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r=>`<tr>${r}</tr>`).join('')}</tbody></table>
  <br><button onclick="window.print()">🖨 Print / Save as PDF</button>
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const win = window.open(URL.createObjectURL(blob))
  setTimeout(() => win?.print(), 800)
}

export function downloadJSON(data, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}
