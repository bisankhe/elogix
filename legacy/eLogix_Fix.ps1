# eLogix HRMS — Auto-Fix Script
# Run this in PowerShell from: C:\Users\DELL\Desktop\eLogix_HRMS
# Command: .\eLogix_Fix.ps1

$SNAP = "src\components\dashboard\snapshots"
$total = 0

Write-Host "eLogix HRMS — Fixing all syntax errors..." -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# FIX 1: AIHRLettersPage.jsx — Missing const r = await fetch
# ═══════════════════════════════════════════════════════════════
$f1 = "$SNAP\AIHRLettersPage.jsx"
if (Test-Path $f1) {
    $c = Get-Content $f1 -Raw
    $old = "    try {`r`n        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },`r`n        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, system: sys, messages: [{ role: 'user', content: prompt }] }),`r`n      })"
    $new = "    try {`r`n      const r = await fetch('https://api.anthropic.com/v1/messages', {`r`n        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },`r`n        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, system: sys, messages: [{ role: 'user', content: prompt }] }),`r`n      })"
    if ($c.Contains("        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VK")) {
        $c = $c -replace "(?s)(    try \{)\s*\r?\n(\s+)method: 'POST',\s*\r?\n(\s+)headers: \{ 'Content-Type': 'application/json', 'x-api-key': VK[^\n]+\r?\n(\s+)body: JSON\.stringify\(\{ model: 'claude-sonnet-4-6', max_tokens: 3000[^\n]+\r?\n(\s+)\}\)","    try {`r`n      const r = await fetch('https://api.anthropic.com/v1/messages', {`r`n        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },`r`n        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, system: sys, messages: [{ role: 'user', content: prompt }] }),`r`n      })"
        Set-Content $f1 -Value $c -NoNewline
        Write-Host "FIXED: AIHRLettersPage.jsx" -ForegroundColor Green
        $total++
    } else { Write-Host "SKIP:  AIHRLettersPage.jsx (already fixed or different format)" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════
# FIX 2: CreateJobDescriptionPage.jsx
# ═══════════════════════════════════════════════════════════════
$f2 = "$SNAP\CreateJobDescriptionPage.jsx"
if (Test-Path $f2) {
    $c = Get-Content $f2 -Raw
    if ($c -match "(?s)try \{\s*\r?\n\s+method: 'POST'") {
        $c = $c -replace "(?s)(    try \{)\s*\r?\n(\s+)method: 'POST',\s*\r?\n(\s+)headers: \{ 'Content-Type': 'application/json', 'x-api-key': VK[^\n]+\r?\n(\s+)body: JSON\.stringify\(\{ model: 'claude-sonnet-4-6', max_tokens: 4000[^\n]+\r?\n(\s+)\}\)","    try {`r`n      const r = await fetch('https://api.anthropic.com/v1/messages', {`r`n        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },`r`n        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system, messages: [{ role: 'user', content: prompt }] }),`r`n      })"
        Set-Content $f2 -Value $c -NoNewline
        Write-Host "FIXED: CreateJobDescriptionPage.jsx" -ForegroundColor Green
        $total++
    } else { Write-Host "SKIP:  CreateJobDescriptionPage.jsx" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════
# FIX 3: DraftHRPolicyPage.jsx
# ═══════════════════════════════════════════════════════════════
$f3 = "$SNAP\DraftHRPolicyPage.jsx"
if (Test-Path $f3) {
    $c = Get-Content $f3 -Raw
    if ($c -match "(?s)try \{\s*\r?\n\s+method:'POST'") {
        $c = $c -replace "(?s)(    try \{)\s*\r?\n(\s+)method:'POST',\s*\r?\n(\s+)headers:\{'Content-Type':'application/json','x-api-key':VK[^\n]+\r?\n(\s+)body:JSON\.stringify[^\n]+\r?\n(\s+)\}\)","    try {`r`n      const r = await fetch('https://api.anthropic.com/v1/messages', {`r`n        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },`r`n        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system: sys, messages: [{ role: 'user', content: prompt }] }),`r`n      })"
        Set-Content $f3 -Value $c -NoNewline
        Write-Host "FIXED: DraftHRPolicyPage.jsx" -ForegroundColor Green
        $total++
    } else { Write-Host "SKIP:  DraftHRPolicyPage.jsx" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════
# FIX 4: AIBusinessIntelligencePage.jsx
# ═══════════════════════════════════════════════════════════════
$f4 = "$SNAP\AIBusinessIntelligencePage.jsx"
if (Test-Path $f4) {
    $c = Get-Content $f4 -Raw
    if ($c -match "(?s)try \{\s*\r?\n\s+method:'POST'") {
        $c = $c -replace "(?s)(    try \{)\s*\r?\n(\s+)method:'POST',\s*\r?\n(\s+)headers:\{ 'Content-Type':'application/json', 'x-api-key':VITE_KEY[^\n]+\r?\n[^\n]+\r?\n(\s+)body: JSON\.stringify[^\n]+\r?\n(\s+)\}\)","    try {`r`n      const r = await fetch('https://api.anthropic.com/v1/messages', {`r`n        method: 'POST',`r`n        headers: { 'Content-Type': 'application/json', 'x-api-key': VITE_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },`r`n        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system, messages }),`r`n      })"
        Set-Content $f4 -Value $c -NoNewline
        Write-Host "FIXED: AIBusinessIntelligencePage.jsx" -ForegroundColor Green
        $total++
    } else { Write-Host "SKIP:  AIBusinessIntelligencePage.jsx" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════
# FIX 5: HRPoliciesPage.jsx — return outside function
# ═══════════════════════════════════════════════════════════════
$f5 = "$SNAP\HRPoliciesPage.jsx"
if (Test-Path $f5) {
    $c = Get-Content $f5 -Raw
    $lines = $c -split "`n"
    # Check if handleSign function is missing (line ~489 should have "const handleSign")
    $hasHandleSign = $c.Contains("const handleSign")
    if (-not $hasHandleSign) {
        # Find "const saveAck" closing } and insert handleSign after
        $c = $c -replace "(const saveAck = \(data\) => \{[^}]+\})", "`$1`r`n`r`n  const handleSign = (policyId) => {"
        Set-Content $f5 -Value $c -NoNewline
        Write-Host "FIXED: HRPoliciesPage.jsx - added handleSign" -ForegroundColor Green
        $total++
    } else { Write-Host "SKIP:  HRPoliciesPage.jsx (handleSign exists)" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════
# FIX 6: DeptTeamSetupPage.jsx — orphaned ternary at line 576
# ═══════════════════════════════════════════════════════════════
$f6 = "$SNAP\DeptTeamSetupPage.jsx"
if (Test-Path $f6) {
    $c = Get-Content $f6 -Raw
    if ($c -match "(?s)\{data\.map\(loc => \{\s*\r?\n\s+\? Math\.round") {
        $c = $c -replace "(\{data\.map\(loc => \{)\s*\r?\n(\s+)\? Math\.round\(loc\.current_headcount \* 100 / loc\.max_capacity\)\s*\r?\n(\s+): 0","{ data.map(loc => {`r`n          const pct = loc.max_capacity > 0`r`n            ? Math.round(loc.current_headcount * 100 / loc.max_capacity)`r`n            : 0"
        Set-Content $f6 -Value $c -NoNewline
        Write-Host "FIXED: DeptTeamSetupPage.jsx - const pct added" -ForegroundColor Green
        $total++
    } else { Write-Host "SKIP:  DeptTeamSetupPage.jsx" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════
# FIX 7: OrgChartPage.jsx — orphaned handler (lines 979-981)
# ═══════════════════════════════════════════════════════════════
$f7 = "$SNAP\OrgChartPage.jsx"
if (Test-Path $f7) {
    $c = Get-Content $f7 -Raw
    # Remove orphaned lines: setSelectedNode and setShowDetail between isSel and cLevel
    $c = $c -replace "(?s)(const isSel\s+=\s+selectedNode\?\.id === root\.id)\s*\r?\n\s*\r?\n(\s+setSelectedNode[^\n]+\r?\n\s+setShowDetail[^\n]+\r?\n\s+\}\s*\r?\n\s*\r?\n)(\s+const cLevel)","const isSel = selectedNode?.id === root.id`r`n`r`n              const cLevel"
        Set-Content $f7 -Value $c -NoNewline
        Write-Host "FIXED: OrgChartPage.jsx - removed orphaned handler" -ForegroundColor Green
        $total++
}

# ═══════════════════════════════════════════════════════════════
# FIX 8: > characters in JSX text nodes
# ═══════════════════════════════════════════════════════════════
$gtFiles = @{
    "GoalAssignmentPage.jsx" = @(
        @("Quarterly (25% each) > Monthly (≈8.33% each) > Weekly > Daily", "Quarterly (25% each) &gt; Monthly (≈8.33% each) &gt; Weekly &gt; Daily")
    )
    "SuggestionBoxPage.jsx" = @(
        @("New > Reviewing > Implementing > Implemented", "New &gt; Reviewing &gt; Implementing &gt; Implemented")
    )
    "DiversityDashboardPage.jsx" = @(
        @("Applicant > Hire > Promotion", "Applicant &gt; Hire &gt; Promotion")
    )
    "CashAdvancePage.jsx" = @(
        @("Employee > Supervisor > HR", "Employee &gt; Supervisor &gt; HR")
    )
}

foreach ($fname in $gtFiles.Keys) {
    $fp = "$SNAP\$fname"
    if (Test-Path $fp) {
        $c = Get-Content $fp -Raw
        $changed = $false
        foreach ($pair in $gtFiles[$fname]) {
            if ($c.Contains($pair[0])) {
                $c = $c.Replace($pair[0], $pair[1])
                $changed = $true
            }
        }
        if ($changed) {
            Set-Content $fp -Value $c -NoNewline
            Write-Host "FIXED: $fname - > replaced with &gt;" -ForegroundColor Green
            $total++
        } else {
            Write-Host "SKIP:  $fname (already fixed)" -ForegroundColor Yellow
        }
    }
}

# ═══════════════════════════════════════════════════════════════
# FIX 9: Create src\utils\exportUtils.js (xlsx import fix)
# ═══════════════════════════════════════════════════════════════
$utilsDir = "src\utils"
if (-not (Test-Path $utilsDir)) { New-Item -ItemType Directory -Path $utilsDir | Out-Null }
$exportUtils = "$utilsDir\exportUtils.js"
$exportContent = @'
// FILE: src/utils/exportUtils.js
// eLogix HRMS — Export utilities (CSV, XLSX)
// Uses dynamic import for xlsx to avoid build-time errors
export async function exportToCSV(data, filename = 'export.csv') {
  if (!data || !data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
export async function exportToXLSX(data, filename = 'export.xlsx', sheetName = 'Sheet1') {
  try {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.mjs')
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
  } catch { await exportToCSV(data, filename.replace('.xlsx', '.csv')) }
}
'@
Set-Content $exportUtils -Value $exportContent
Write-Host "FIXED: exportUtils.js created" -ForegroundColor Green
$total++

# ═══════════════════════════════════════════════════════════════
# FIX 10: Create src\assets\Logo.png placeholder if missing
# ═══════════════════════════════════════════════════════════════
$assetsDir = "src\assets"
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }
$logoPath = "$assetsDir\Logo.png"
if (-not (Test-Path $logoPath)) {
    # Create minimal valid PNG (1x1 transparent)
    $pngBytes = [byte[]](
        0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
        0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,
        0x89,0x00,0x00,0x00,0x0A,0x49,0x44,0x41,0x54,0x78,0x9C,0x62,0x00,0x01,0x00,0x00,
        0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,
        0x42,0x60,0x82
    )
    [System.IO.File]::WriteAllBytes((Resolve-Path $assetsDir).Path + "\Logo.png", $pngBytes)
    Write-Host "FIXED: Logo.png placeholder created (replace with real logo)" -ForegroundColor Green
    $total++
} else {
    Write-Host "OK:    Logo.png already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  $total fixes applied!" -ForegroundColor Green
Write-Host "  Now run: npm run dev" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
