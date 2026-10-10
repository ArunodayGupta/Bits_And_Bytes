from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_demo_patients():
    res = client.get("/api/demo/patients")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Ramesh Kumar should be among demo patients
    assert any(p["abha_id"] == "91-1234-5678-9012" for p in data)

def test_patient_bundle_non_demo():
    res = client.get("/api/patient/99-99/bundle")
    assert res.status_code == 404

def test_patient_care_gaps_non_demo():
    res = client.get("/api/patient/99-99/care-gaps")
    assert res.status_code == 404

def test_patient_care_gaps_demo():
    res = client.get("/api/patient/91-1234-5678-9012/care-gaps?as_of=2024-10-14T12:00:00%2B05:30")
    assert res.status_code == 200
    gaps = res.json()
    assert isinstance(gaps, list)
    gap_codes = [g["code"] for g in gaps]
    assert "UNCONTROLLED_BP" in gap_codes

def test_prescription_savings_unknown():
    res = client.get("/api/prescription/UNK-NO-0101-WNNN/savings")
    assert res.status_code == 404

def test_prescription_savings_demo():
    res = client.get("/api/prescription/APL-RR-1410-RAME/savings")
    assert res.status_code == 200
    data = res.json()
    assert data["rx_id"] == "APL-RR-1410-RAME"
    assert "total_monthly_savings" in data
    assert len(data["medications"]) > 0

def test_admin_metrics():
    res = client.get("/api/admin/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_patients" in data
