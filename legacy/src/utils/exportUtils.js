// FILE: src/utils/exportUtils.js
// eLogix HRMS — Export utilities
// eLogix Technologies · www.elogix.com.np

export async function exportToCSV(data, filename = 'export.csv') {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' })
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
  } catch {
    await exportToCSV(data, filename.replace('.xlsx', '.csv'))
  }
}

// Aliases used by various pages
export const exportToExcel = exportToXLSX
export const exportToXls   = exportToXLSX

export async function exportToPDF(data, filename = 'export.pdf', title = 'eLogix Report') {
  const headers = data.length ? Object.keys(data[0]) : []
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;padding:20px}h2{color:#0369a1}
  table{border-collapse:collapse;width:100%}
  th{background:#0369a1;color:#fff;padding:8px;font-size:11px;text-align:left}
  td{border:1px solid #e2e8f0;padding:6px 8px;font-size:11px}
  tr:nth-child(even){background:#f8fafc}
  @media print{button{display:none}}</style></head>
  <body><h2>${title}</h2>
  <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${data.map(row=>`<tr>${headers.map(h=>`<td>${row[h]??''}</td>`).join('')}</tr>`).join('')}</tbody>
  </table><br><button onclick="window.print()">🖨 Print / Save as PDF</button></body></html>`
  const win = window.open(URL.createObjectURL(new Blob([html],{type:'text/html'})))
  setTimeout(()=>win?.print(), 800)
}

export function downloadJSON(data, filename = 'export.json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
  a.download = filename
  a.click()
}
