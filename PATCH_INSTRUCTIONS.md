# eLogix HRMS — Error Fix Instructions
# Apply these patches to each file manually or use fix_errors.js (node fix_errors.js)
# All paths relative to project root: src/components/dashboard/snapshots/
# eLogix Technologies · www.elogix.com.np

=============================================================================
## ERROR 1: `msg is not defined` — 6 files
=============================================================================

Files:  GPSAttendancePage.jsx     (line 47)
        LiveAttendancePage.jsx    (line 67)
        GeoAttendancePage.jsx     (line 51)
        OvertimeMonitoringPage.jsx (line 55)
        AttendanceProcessingPage.jsx (line 46)
        AttendanceApprovalPage.jsx (line 65)

CAUSE:  `msg` is used in JSX (likely `{msg && <div>{msg}</div>}`) but was
        never declared with useState.

FIX:    In each file, find the first existing useState line, e.g.:
          const [tab, setTab] = useState('dashboard')
        
        Add this line immediately after it:
          const [msg, setMsg] = useState('')

        Also check if `setMsg` is called without being defined — if the file
        calls `setMsg(...)` without declaring it, add the same line.

QUICK CHECK — open each file and search for:
  - `{msg &&`  or  `{msg}`  → this is where msg is used (will crash if undeclared)
  - `setMsg(`              → this is where msg is set (needs useState)
  - `const [msg,`          → this is the declaration (if missing, add it)

=============================================================================
## ERROR 2: `cfg is not defined` — RosterManagementPage.jsx (line 443)
=============================================================================

File:   RosterManagementPage.jsx
Error:  Uncaught ReferenceError: cfg is not defined
Stack:  renderWeekly (line 415) → .map (line 439) → cfg used at line 443

CAUSE:  Inside the `renderWeekly` function, a `.map()` callback at line 439
        uses a variable `cfg` that was defined in an OUTER scope and is not
        accessible inside the callback, OR `cfg` was a renamed variable that
        is now referenced with the old name.

FIX:    Find the `renderWeekly` function (~line 415):

        function renderWeekly(...) {
          ...line 439: something.map((shift, i) => (
          ...line 443: cfg.color  ← THIS CRASHES
          ))
        }

        Look at what `cfg` should be. Most likely it is:
          a) the loop variable (shift/item/row from the .map)
          b) a config object defined outside renderWeekly

        OPTION A — If cfg should be the map loop variable:
          Change `cfg.color` → `shift.color` (or whatever the map variable is)

        OPTION B — If cfg is a config object from outer scope:
          Add at the top of renderWeekly:
            const cfg = shiftConfig || SHIFT_CONFIGS || {}

        OPTION C — Safe fallback (prevents crash, fix properly later):
          Find line 443 and change:
            cfg.color  → (typeof cfg !== 'undefined' ? cfg.color : '#94a3b8')
          
          Or add at the very top of the renderWeekly function body:
            const cfg = typeof cfg !== 'undefined' ? cfg : {}

        RECOMMENDED: Run `node fix_errors.js` which will auto-detect
        the pattern and apply the safest fix.

=============================================================================
## ERROR 3: Missing `key` prop — LeaveBalancePage.jsx (line 211)
=============================================================================

File:   LeaveBalancePage.jsx
Error:  Warning: Each child in a list should have a unique "key" prop.
Line:   211

FIX:    Find line ~211 in LeaveBalancePage.jsx. It will look like:
          {someArray.map((item, i) => (
            <tr style={...}>   ← ADD key HERE

        Change to:
          {someArray.map((item, i) => (
            <tr key={i} style={...}>

        If the array items have an id field:
          <tr key={item.id} style={...}>

        Search the file for ALL `.map(` calls and verify each JSX element
        returned by the map has a `key` prop.

=============================================================================
## ERROR 4: BiometricAttendancePage — API 500 error
=============================================================================

File:   BiometricAttendancePage.jsx
Error:  GET /api/v1/biometric/devices 500 (Internal Server Error)
Line:   61

CAUSE:  The page makes a real fetch() call to the backend on mount.
        The backend endpoint exists but returns 500 (DB not connected or
        migration not run).

FIX A — Add .catch() fallback with mock data (quick dev fix):

        Find this block (around line 61):
          fetch('/api/v1/biometric/devices')
            .then(r => r.json())
            .then(data => setDevices(data.devices || data))

        Replace with:
          fetch('/api/v1/biometric/devices')
            .then(r => r.ok ? r.json() : Promise.resolve({ devices: MOCK_DEVICES }))
            .catch(() => ({ devices: MOCK_DEVICES }))
            .then(data => setDevices(data.devices || data || MOCK_DEVICES))

        And add before the component:
          const MOCK_DEVICES = [
            { id:'BIO-001', name:'Main Entrance', location:'Ground Floor',
              type:'Fingerprint', status:'online', employees:245, lastSync:'2 min ago' },
            { id:'BIO-002', name:'HR Department', location:'2nd Floor',
              type:'Face ID', status:'online', employees:18, lastSync:'5 min ago' },
            { id:'BIO-003', name:'Finance Dept', location:'3rd Floor',
              type:'Fingerprint', status:'online', employees:22, lastSync:'1 min ago' },
          ]

FIX B — Backend fix (permanent fix, run after DB migrations work):
        The biometric_devices table needs to be created. Once `alembic upgrade head`
        runs successfully (after the alembic/env.py fix from the previous session),
        the endpoint should start working.

=============================================================================
## FASTEST WAY — run the auto-fix script
=============================================================================

1. Copy fix_errors.js to your project root (same folder as package.json)
2. Run:
     node fix_errors.js
3. The script will:
   - Read each file, detect the exact error pattern, apply the minimal fix
   - Report which files were fixed, skipped, or failed
4. Then run: npm run dev
5. Verify no more errors in the console

If fix_errors.js reports "SKIP (not found)" for any file, the file path may
differ. Check: src/components/dashboard/snapshots/ for the exact filename.

=============================================================================
## IGNORE THESE (not real errors)
=============================================================================

favicon.ico: 404  → Normal in dev. Add a favicon.ico to /public/ or set
                    <link rel="icon"> in index.html to a local file.

react-devtools warning  → Just a suggestion, not an error. Safe to ignore.

ERR_NETWORK_CHANGED     → Your WiFi/VPN reconnected while the page was loading.
                          Not a code bug. Refresh the browser tab.
