#!/usr/bin/env python3
# FILE: scripts/fix_fstring_syntax.py
# Fixes the two f-string syntax errors identified in QA report
# attendance_reports_routes.py:425 and salary_tax_routes.py:439
# Run: python3 scripts/fix_fstring_syntax.py

import re, os

def fix_fstring(filepath):
    """Fix bare } inside f-strings — must be escaped as }}"""
    if not os.path.exists(filepath):
        print(f"  SKIP (not found): {filepath}")
        return
    
    with open(filepath, encoding='utf-8') as f:
        c = f.read()
    
    original = c
    lines = c.splitlines()
    fixed_lines = []
    
    for i, line in enumerate(lines):
        # Find f-strings with unescaped single }
        # Pattern: inside f"..." or f'...' a lone } not part of {expr}
        if "f'" in line or 'f"' in line:
            # Fix: replace lone } that are not }} with }}
            # Be careful not to fix valid closing braces of {expressions}
            # A lone } means: } preceded by non-{ content that already closed
            fixed = re.sub(
                r"(f['"][^'"]*)\}([^}])",
                lambda m: m.group(0) if m.group(0).count('{') >= m.group(0).count('}') else m.group(1) + '}}' + m.group(2),
                line
            )
            fixed_lines.append(fixed)
        else:
            fixed_lines.append(line)
    
    c = '\n'.join(fixed_lines)
    if c != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"  ✅ Fixed: {filepath}")
    else:
        print(f"  ℹ️  No changes needed: {filepath}")

# Try to compile both files to verify they have syntax errors
import py_compile, tempfile

files_to_fix = [
    'backend/routes/attendance_reports_routes.py',
    'backend/routes/salary_tax_routes.py',
]

for fpath in files_to_fix:
    if os.path.exists(fpath):
        try:
            py_compile.compile(fpath, doraise=True)
            print(f"✅ No syntax error: {fpath}")
        except py_compile.PyCompileError as e:
            print(f"❌ Syntax error found: {fpath} — {e}")
            fix_fstring(fpath)
    else:
        print(f"  NOT FOUND: {fpath}")

print("\nDone. Re-run to verify.")
