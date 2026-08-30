#!/usr/bin/env python3
"""
eLogix HRMS — Auto-patch undefined variables
Run from: C:\Users\DELL\Desktop\eLogix_HRMS\
Usage: python patch_errors.py
"""
import os, re

SNAP = os.path.join('src', 'components', 'dashboard', 'snapshots')
fixed = []

def read(f):
    path = os.path.join(SNAP, f)
    if not os.path.exists(path): return None, None
    with open(path, encoding='utf-8') as fh: return fh.read(), path

def write(content, path):
    with open(path, 'w', encoding='utf-8') as fh: fh.write(content)

# ════════════════════════════════════════════════════════════════
# Fix 1: ExitClearancePage — dc not defined inside departments.map
# ════════════════════════════════════════════════════════════════
c, path = read('ExitClearancePage.jsx')
if c:
    # Find every Object.entries(c.departments).map callback
    # and add const dc = DEPT_CFG[key] if missing
    pattern = r'(Object\.entries\(\w+\.departments\)\.map\(\(\[key,dept\]\)=>\{)(\s*const sc = STATUS_CFG\[dept\.status\])'
    replacement = r'\1\2\n                   const dc = DEPT_CFG[key] || {color:"#64748b",label:key,responsibility:""}'
    new_c = re.sub(pattern, replacement, c)
    if new_c != c:
        write(new_c, path); fixed.append('ExitClearancePage.jsx')
        print("✅ ExitClearancePage.jsx: dc added inside departments.map")
    elif 'const dc' not in c[c.find('Object.entries'):c.find('Object.entries')+500] if 'Object.entries' in c else True:
        # Simple string replacement
        old = 'const sc = STATUS_CFG[dept.status]'
        new = 'const sc = STATUS_CFG[dept.status]\n                   const dc = DEPT_CFG[key] || {color:"#64748b",label:key,responsibility:""}'
        if old in c and new not in c:
            new_c = c.replace(old, new, 1)
            write(new_c, path); fixed.append('ExitClearancePage.jsx')
            print("✅ ExitClearancePage.jsx: dc added (simple replacement)")
        else:
            print("ℹ️  ExitClearancePage.jsx: already fixed")

# ════════════════════════════════════════════════════════════════
# Fix 2: PositionManagementPage — isOpen not defined in map callbacks
# ════════════════════════════════════════════════════════════════
c, path = read('PositionManagementPage.jsx')
if c:
    orig = c
    lines = c.split("\n")
    changed = False
    
    # Find ALL .map callbacks that use isOpen but don't declare it
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect a .map( callback opening
        if re.search(r'\.map\(\w+=>\{|\.map\(\(\w+', line) and '=>{' in line:
            # Scan forward to find if this callback uses isOpen
            j = i + 1
            brace_depth = 1
            uses_isopen = False
            declares_isopen = False
            callback_lines = [i]
            
            while j < len(lines) and brace_depth > 0:
                l = lines[j]
                brace_depth += l.count('{') - l.count('}')
                if '\bisOpen\b' in l and 'const isOpen' not in l:
                    uses_isopen = True
                if 'const isOpen' in l:
                    declares_isopen = True
                callback_lines.append(j)
                j += 1
            
            if uses_isopen and not declares_isopen:
                # Find the iterator variable name from the .map line
                m = re.search(r'\.map\((\w+)=>|.map\(\((\w+)', line)
                iter_var = (m.group(1) or m.group(2)) if m else 'item'
                
                # Find the line after the map opening to inject isOpen
                # Look for first 'const' line inside the callback
                first_const = i + 1
                for k in range(i+1, min(i+5, len(lines))):
                    if 'const ' in lines[k]:
                        first_const = k
                        break
                
                # Inject const isOpen after first const line
                indent = re.match(r'(\s*)', lines[first_const]).group(1)
                inject = f"{indent}const isOpen = selected === {iter_var}.id"
                lines.insert(first_const + 1, inject)
                changed = True
                print(f"  Injected isOpen after L{first_const+1} (map at L{i+1})")
                # Reprocess from same position since we inserted a line
        i += 1
    
    if changed:
        write("\n".join(lines), path)
        fixed.append('PositionManagementPage.jsx')
        print("✅ PositionManagementPage.jsx: isOpen added to all map callbacks")
    else:
        print("ℹ️  PositionManagementPage.jsx: isOpen already declared in all maps")

# ════════════════════════════════════════════════════════════════
# Fix 3: OrgChartPage — handleSelect not at component level
# ════════════════════════════════════════════════════════════════
c, path = read('OrgChartPage.jsx')
if c:
    # Count component-level handleSelect (not inside helper functions)
    # Component-level = before the main "return (" statement
    # Find the main return ( — it's the one with most content after it
    
    # Strategy: inject handleSelect just before the last major "return (" 
    # in the OrgChartPage component (not inside sub-functions)
    
    lines = c.split("\n")
    # Find "export default function OrgChartPage"
    comp_start = next((i for i,l in enumerate(lines) if 'export default function OrgChartPage' in l), None)
    
    if comp_start:
        # Find the return ( that belongs to OrgChartPage component (not sub-functions)
        # It's the return ( that has 2-space indentation
        ret_line = None
        for i in range(comp_start, len(lines)):
            if lines[i].strip() == 'return (' and len(lines[i]) - len(lines[i].lstrip()) == 2:
                ret_line = i
                break
        
        if ret_line:
            # Check if handleSelect already exists between comp_start and ret_line
            comp_body = "\n".join(lines[comp_start:ret_line])
            if 'const handleSelect' not in comp_body:
                # Inject before return
                inject_lines = [
                    "  // handleSelect for component-level maps",
                    "  const handleSelect = (n) => {",
                    "    setSelectedNode(prev => prev?.id === n?.id ? null : n)",
                    "    if (n) setShowDetail(true)",
                    "  }",
                    "",
                ]
                lines = lines[:ret_line] + inject_lines + lines[ret_line:]
                write("\n".join(lines), path)
                fixed.append('OrgChartPage.jsx')
                print("✅ OrgChartPage.jsx: component-level handleSelect added")
            else:
                print("ℹ️  OrgChartPage.jsx: handleSelect already at component level")

print(f"\n{'='*50}")
print(f"Fixed {len(fixed)} files: {fixed}")
print("Run: git add src/components/dashboard/snapshots/")
print('     git commit -m "fix: patch undefined vars"')
print("     git push")
