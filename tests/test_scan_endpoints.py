"""tests/test_scan_endpoints.py
Integration tests for FastAPI Scan-to-FHIR and Care-Gap endpoints using TestClient.
Tests validation, error shapes, abuse protections, server-side FHIR reconstruction,
and care-gap status transitions.
"""

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.utils.db import reset_demo_scanned_resources

client = TestClient(app)
SAMPLE_REPORT_PNG = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sample-lab-report.png"


@pytest.fixture(autouse=True)
def clean_demo_state():
    reset_demo_scanned_resources("91-1234-5678-9012")
    yield
    reset_demo_scanned_resources("91-1234-5678-9012")


def _generate_valid_png_bytes() -> bytes:
    img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_scan_report_rejects_non_demo_patient():
    png_bytes = _generate_valid_png_bytes()
    response = client.post(
        "/api/fhir/scan-report",
        data={"abha_id": "99-9999-9999-9999"},  # Non-demo ABHA
        files={"file": ("report.png", png_bytes, "image/png")},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "PATIENT_NOT_FOUND"


def test_scan_report_rejects_invalid_content_type():
    response = client.post(
        "/api/fhir/scan-report",
        data={"abha_id": "91-1234-5678-9012"},
        files={"file": ("report.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_scan_report_rejects_spoofed_magic_bytes():
    # Content-type claimed as image/png, but payload is plain text
    response = client.post(
        "/api/fhir/scan-report",
        data={"abha_id": "91-1234-5678-9012"},
        files={"file": ("spoofed.png", b"NOT_A_PNG_HEADER", "image/png")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "CORRUPT_OR_SPOOFED_FILE"


def test_scan_report_rejects_oversized_file(monkeypatch):
    monkeypatch.setenv("OCR_MAX_UPLOAD_MB", "1")  # Cap at 1MB
    big_png = b"\x89PNG\r\n\x1a\n" + b"0" * (2 * 1024 * 1024)  # 2MB
    response = client.post(
        "/api/fhir/scan-report",
        data={"abha_id": "91-1234-5678-9012"},
        files={"file": ("big.png", big_png, "image/png")},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_scan_report_successful_draft_does_not_persist():
    png_bytes = _generate_valid_png_bytes()
    response = client.post(
        "/api/fhir/scan-report",
        data={"abha_id": "91-1234-5678-9012"},
        files={"file": ("report.png", png_bytes, "image/png")},
    )
    assert response.status_code == 200
    draft = response.json()
    assert draft["provider"] == "mock"
    assert len(draft["items"]) >= 3
    test_keys = [i["test_key"] for i in draft["items"]]
    assert "hba1c" in test_keys
    assert "fasting_glucose" in test_keys

    # Check that care-gaps still shows HBA1C_OVERDUE (scan report makes NO database write)
    cg_res = client.get("/api/patient/91-1234-5678-9012/care-gaps")
    assert cg_res.status_code == 200
    cg_codes = [g["code"] for g in cg_res.json()]
    assert "HBA1C_OVERDUE" in cg_codes


def test_confirm_requires_acknowledgment():
    payload = {
        "abha_id": "91-1234-5678-9012",
        "effective_date": "2024-10-20",
        "items": [{"test_key": "hba1c", "value": 7.2, "unit": "%"}],
        "acknowledged": False,  # Missing acknowledgment
    }
    response = client.post("/api/fhir/scan-report/confirm", json=payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "NOT_ACKNOWLEDGED"


def test_confirm_rejects_future_date():
    payload = {
        "abha_id": "91-1234-5678-9012",
        "effective_date": "2099-01-01",  # Future date
        "items": [{"test_key": "hba1c", "value": 7.2, "unit": "%"}],
        "acknowledged": True,
    }
    response = client.post("/api/fhir/scan-report/confirm", json=payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_DATE"


def test_confirm_rebuilds_observation_and_clears_care_gap():
    """End-to-end test:

    1. Ramesh Kumar starts with HBA1C_OVERDUE, UNCONTROLLED_BP, BP_RISING_TREND.
    2. Patient confirms scanned HbA1c 7.2% on 2024-10-14.
    3. Confirm is idempotent (second call flags already_existed).
    4. Observation is persisted with source = 'ocr_scan'.
    5. GET /api/patient/{abha_id}/care-gaps now shows HBA1C_OVERDUE cleared!
    """
    # 1. Initial state check
    cg_initial = client.get("/api/patient/91-1234-5678-9012/care-gaps?as_of=2024-10-14T12:00:00%2B05:30")
    assert cg_initial.status_code == 200
    initial_codes = [g["code"] for g in cg_initial.json()]
    assert "HBA1C_OVERDUE" in initial_codes
    assert "UNCONTROLLED_BP" in initial_codes
    assert "BP_RISING_TREND" in initial_codes

    # 2. Confirm scanned HbA1c
    confirm_payload = {
        "abha_id": "91-1234-5678-9012",
        "effective_date": "2024-10-10",
        "items": [
            {"test_key": "hba1c", "value": 7.2, "unit": "%"},
            {"test_key": "fasting_glucose", "value": 118, "unit": "mg/dL"},
        ],
        "acknowledged": True,
    }

    res_confirm = client.post("/api/fhir/scan-report/confirm", json=confirm_payload)
    assert res_confirm.status_code == 200
    body = res_confirm.json()
    assert body["success"] is True
    assert body["created_count"] == 2
    assert body["already_existed_count"] == 0

    # Verify deterministic observation structure
    hba1c_res = next(r for r in body["resources"] if r["code"]["coding"][0]["code"] == "4548-4")
    assert hba1c_res["status"] == "preliminary"
    assert hba1c_res["valueQuantity"]["value"] == 7.2
    assert hba1c_res["meta"]["tag"][0]["code"] == "ocr-scan"

    # 3. Idempotent second confirmation
    res_second = client.post("/api/fhir/scan-report/confirm", json=confirm_payload)
    assert res_second.status_code == 200
    body_second = res_second.json()
    assert body_second["already_existed_count"] == 2

    # 4. Re-check care-gaps: HBA1C_OVERDUE must now be CLEARED!
    cg_after = client.get("/api/patient/91-1234-5678-9012/care-gaps?as_of=2024-10-14T12:00:00%2B05:30")
    assert cg_after.status_code == 200
    after_codes = [g["code"] for g in cg_after.json()]
    assert "HBA1C_OVERDUE" not in after_codes
    assert "UNCONTROLLED_BP" in after_codes
    assert "BP_RISING_TREND" in after_codes


def test_env_example_has_no_secrets():
    """Assert that .env.example contains no real-looking API keys or secret tokens."""
    env_example_path = Path(__file__).resolve().parent.parent / ".env.example"
    assert env_example_path.exists()
    content = env_example_path.read_text(encoding="utf-8")

    # Disallowed active secrets
    assert "sb_secret_" not in content
    assert "eyJ" not in content  # JWT prefix
    assert "AKIA" not in content  # AWS access key prefix
