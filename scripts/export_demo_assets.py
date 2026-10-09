"""scripts/export_demo_assets.py
Generates offline assets:
- frontend/public/demo/sample-savings.json
- frontend/public/demo/sample-scan-draft.json
from backend services and the shared fixture bundle.
Ensures single source of truth with zero duplicated catalog logic in TypeScript.
"""

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.services.ocr_service import MockOcrProvider, parse_ocr_document_to_draft
from app.services.savings_service import compute_savings_for_prescription
from app.utils.db import get_patient_bundle_from_db

ROOT_DIR = Path(__file__).resolve().parent.parent
DEMO_ASSETS_DIR = ROOT_DIR / "frontend" / "public" / "demo"


def export_assets():
    DEMO_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Export sample-savings.json for Ramesh Kumar (APL-RR-1410-RAME)
    bundle = get_patient_bundle_from_db("91-1234-5678-9012")
    if not bundle:
        raise ValueError("Could not retrieve bundle from database for Ramesh Kumar")

    med_requests = [
        {"raw_json": e["resource"], "summary_title": e["resource"].get("medicationCodeableConcept", {}).get("text")}
        for e in bundle.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "MedicationRequest"
    ]

    savings_res = compute_savings_for_prescription("APL-RR-1410-RAME", med_requests)
    savings_json_path = DEMO_ASSETS_DIR / "sample-savings.json"
    savings_json_path.write_text(savings_res.model_dump_json(indent=2), encoding="utf-8")
    print(f"[OK] Exported sample savings to {savings_json_path}")

    # 2. Export sample-scan-draft.json using MockOcrProvider
    provider = MockOcrProvider()
    ocr_doc = provider.analyze(b"", "image/png")
    draft = parse_ocr_document_to_draft(ocr_doc, abha_id="91-1234-5678-9012")

    draft_json_path = DEMO_ASSETS_DIR / "sample-scan-draft.json"
    draft_json_path.write_text(draft.model_dump_json(indent=2), encoding="utf-8")
    print(f"[OK] Exported sample scan draft to {draft_json_path}")


if __name__ == "__main__":
    export_assets()
