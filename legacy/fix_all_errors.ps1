# fix_all_errors.ps1
# Run from: C:\Users\DELL\Desktop\eLogix_HRMS\
# Usage: PowerShell -ExecutionPolicy Bypass -File fix_all_errors.ps1

$SNAP = "src\components\dashboard\snapshots"
$fixed = @()

function Fix-MsgNotify {
    param($filename)
    $path = Join-Path $SNAP $filename
    if (-not (Test-Path $path)) { Write-Host "NOT FOUND: $filename"; return }
    
    $content = Get-Content $path -Raw -Encoding UTF8
    
    # Check if msg is already declared
    if ($content -match "const \[msg, setMsg\]") {
        Write-Host "  SKIP: $filename (msg already declared)"
        return
    }
    
    # Find the export default function line and inject after its opening brace
    $pattern = '(export default function \w+[^{]*\{)'
    $inject = "`n  const [msg, setMsg] = useState('')`n  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }"
    
    $newContent = $content -replace $pattern, "`$1$inject"
    
    if ($newContent -ne $content) {
        Set-Content $path $newContent -Encoding UTF8
        Write-Host "  FIXED: $filename"
        $script:fixed += $filename
    } else {
        Write-Host "  WARN: Could not fix $filename"
    }
}

function Fix-IsOpen {
    param($filename)
    $path = Join-Path $SNAP $filename
    if (-not (Test-Path $path)) { Write-Host "NOT FOUND: $filename"; return }
    
    $content = Get-Content $path -Raw -Encoding UTF8
    
    # Find .map callbacks that use isOpen but don't declare it
    # Pattern: inside a .map callback, after const declarations, add isOpen
    # We look for the specific pattern: map callback with const st/rc but no const isOpen
    
    $lines = $content -split "`n"
    $changed = $false
    $newLines = New-Object System.Collections.ArrayList
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $newLines.Add($line) | Out-Null
        
        # Detect map callback openings
        if ($line -match '\.map\(\w+=>\{|\.map\(\(\w+') {
            # Look ahead: if next few lines have const but no isOpen, and later uses isOpen
            $lookAhead = ($lines[$i..([Math]::Min($i+200, $lines.Count-1))]) -join "`n"
            
            if ($lookAhead -match '\bisOpen\b' -and $lookAhead -notmatch 'const isOpen') {
                # Find the iterator variable
                $iterMatch = [regex]::Match($line, '\.map\((\w+)=>|\.map\(\((\w+)')
                $iterVar = if ($iterMatch.Groups[1].Value) { $iterMatch.Groups[1].Value } else { $iterMatch.Groups[2].Value }
                
                if (-not $iterVar) { $iterVar = "item" }
                
                # Find the first const line after the map opening
                $j = $i + 1
                while ($j -lt $lines.Count -and $lines[$j] -notmatch '^\s+const ') { $j++ }
                
                if ($j -lt $lines.Count -and ($j - $i) -lt 10) {
                    # Get indentation
                    $indent = [regex]::Match($lines[$j], '^\s+').Value
                    $isOpenLine = "${indent}const isOpen = selected === ${iterVar}.id"
                    
                    Write-Host "  Adding isOpen at L$($j+2) in $filename"
                    $newLines.Add($lines[$j]) | Out-Null
                    $newLines.Add($isOpenLine) | Out-Null
                    $i = $j
                    $changed = $true
                    continue
                }
            }
        }
    }
    
    if ($changed) {
        $newContent = $newLines -join "`n"
        Set-Content $path $newContent -Encoding UTF8
        Write-Host "  FIXED: $filename"
        $script:fixed += $filename
    }
}

function Fix-HandleSelect {
    param($filename)
    $path = Join-Path $SNAP $filename
    if (-not (Test-Path $path)) { Write-Host "NOT FOUND: $filename"; return }
    
    $content = Get-Content $path -Raw -Encoding UTF8
    $lines = $content -split "`n"
    
    # Find the component function start and its return (
    $compStart = -1
    $retLine = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'export default function \w+') { $compStart = $i }
        if ($compStart -gt 0 -and $lines[$i] -match '^\s{2}return \(' -and $i -gt $compStart) {
            $retLine = $i
            break
        }
    }
    
    if ($retLine -lt 0) { Write-Host "  WARN: Could not find return in $filename"; return }
    
    # Check if handleSelect already exists at component level
    $compBody = ($lines[$compStart..$retLine]) -join "`n"
    if ($compBody -match 'const handleSelect') {
        Write-Host "  SKIP: $filename (handleSelect already at component level)"
        return
    }
    
    # Inject before return
    $inject = @(
        "  // Component-level handleSelect for root map",
        "  const handleSelect = (n) => {",
        "    setSelectedNode(prev => prev?.id === n?.id ? null : n)",
        "    if (n) setShowDetail(true)",
        "  }",
        ""
    )
    
    $newLines = [System.Collections.ArrayList]($lines[0..($retLine-1)])
    foreach ($l in $inject) { $newLines.Add($l) | Out-Null }
    for ($i = $retLine; $i -lt $lines.Count; $i++) { $newLines.Add($lines[$i]) | Out-Null }
    
    Set-Content $path ($newLines -join "`n") -Encoding UTF8
    Write-Host "  FIXED: $filename"
    $script:fixed += $filename
}

function Fix-DcDept {
    param($filename)
    $path = Join-Path $SNAP $filename
    if (-not (Test-Path $path)) { Write-Host "NOT FOUND: $filename"; return }
    
    $content = Get-Content $path -Raw -Encoding UTF8
    
    # Find Object.entries(*.departments).map and add dc declaration after sc
    $old = 'const sc = STATUS_CFG[dept.status]'
    $new = 'const sc = STATUS_CFG[dept.status]' + "`r`n" + '                   const dc = DEPT_CFG[key] || {color:"#64748b",label:key,responsibility:""}'
    
    if ($content -notmatch 'const dc = DEPT_CFG\[key\]') {
        $count = ([regex]::Matches($content, [regex]::Escape($old))).Count
        if ($count -gt 0) {
            $newContent = $content -replace [regex]::Escape($old), $new
            Set-Content $path $newContent -Encoding UTF8
            Write-Host "  FIXED: $filename (added dc in $count location(s))"
            $script:fixed += $filename
        }
    } else {
        Write-Host "  SKIP: $filename (dc already declared)"
    }
}

Write-Host "eLogix HRMS — Fixing undefined variable errors"
Write-Host "Working directory: $(Get-Location)"
Write-Host ""

# Fix msg undefined (attendance pages)
Write-Host "--- Fixing msg not defined ---"
$msgFiles = @(
    "GPSAttendancePage.jsx",
    "LiveAttendancePage.jsx",
    "EmployeeMovementPage.jsx",
    "BiometricAttendancePage.jsx",
    "GeoAttendancePage.jsx",
    "InsourceAttendancePage.jsx",
    "OvertimeMonitoringPage.jsx",
    "AttendanceProcessingPage.jsx",
    "AttendanceApprovalPage.jsx",
    "PayrollAttendanceGenerationPage.jsx"
)
foreach ($f in $msgFiles) { Fix-MsgNotify $f }

Write-Host ""
Write-Host "--- Fixing isOpen not defined ---"
Fix-IsOpen "PositionManagementPage.jsx"

Write-Host ""
Write-Host "--- Fixing handleSelect not defined ---"
Fix-HandleSelect "OrgChartPage.jsx"

Write-Host ""
Write-Host "--- Fixing dc not defined ---"
Fix-DcDept "ExitClearancePage.jsx"

Write-Host ""
Write-Host "==============================================="
Write-Host "Fixed $($fixed.Count) files: $($fixed -join ', ')"
Write-Host ""
Write-Host "Now run:"
Write-Host "  git add src/components/dashboard/snapshots/"
Write-Host "  git commit -m 'fix: undefined vars msg/isOpen/handleSelect/dc'"
Write-Host "  git push"
