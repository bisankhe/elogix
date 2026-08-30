#!/usr/bin/env python3
"""
Run this from C:\Users\DELL\Desktop\eLogix_HRMS\
It will print the relevant lines so we can fix them.
Usage: python get_file_content.py
"""
import os

SNAP = os.path.join('src', 'components', 'dashboard', 'snapshots')

FILES = {
    'PositionManagementPage.jsx': [
        (1145, 1160),  # map start around L1150
        (1283, 1295),  # isOpen usage at L1289
    ],
    'OrgChartPage.jsx': [
        (1938, 1950),  # map start around L1944
        (2025, 2035),  # handleSelect usage at L2031
    ],
    'ExitClearancePage.jsx': [
        (155, 170),    # map area around L158
        (258, 268),    # second map around L261
        (308, 320),    # dc usage at L314
    ],
}

for fname, ranges in FILES.items():
    path = os.path.join(SNAP, fname)
    if not os.path.exists(path):
        print(f"FILE NOT FOUND: {path}")
        continue
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    print(f"\n{'='*70}")
    print(f"FILE: {fname} ({len(lines)} lines)")
    for start, end in ranges:
        print(f"\n  --- Lines {start}-{end} ---")
        for i in range(max(0,start-1), min(len(lines), end)):
            print(f"  L{i+1}: {lines[i].rstrip()[:110]}")

print("\nDone. Copy this output and send it.")
