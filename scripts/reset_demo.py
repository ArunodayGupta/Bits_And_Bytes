"""scripts/reset_demo.py
Deletes source = 'ocr_scan' resources for demo patients so the demo can be cleanly repeated.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.utils.db import reset_demo_scanned_resources


def main():
    abha_id = sys.argv[1] if len(sys.argv) > 1 else None
    if abha_id:
        print(f"[*] Resetting demo scanned resources for ABHA: {abha_id}...")
    else:
        print("[*] Resetting all demo scanned resources...")

    count = reset_demo_scanned_resources(abha_id)
    print(f"[OK] Demo reset complete. Removed {count} scanned demo observation(s).")


if __name__ == "__main__":
    main()
