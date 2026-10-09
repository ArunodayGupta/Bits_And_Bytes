import pytest
from app.utils.rx_id import generate_speakable_rx_id, allocate_rx_id, normalize_rx_id
from fastapi import HTTPException
from app.utils.care_gaps import evaluate_care_gaps
from datetime import datetime, timezone

def test_rx_id_generation():
    # Apollo Hospital -> APL, Dr. Rajesh Rao -> RR, 2024-10-14 -> 1410, Ramesh Kumar -> RAME
    rx = generate_speakable_rx_id("Apollo Hospital", "Dr. Rajesh Rao", "2024-10-14", "Ramesh Kumar")
    assert rx == "APL-RR-1410-RAME"
    
    # Generic titles stripping
    rx2 = generate_speakable_rx_id("Healthcare Pvt Ltd City", "Prof. John Doe", "2024-12-05", "Al")
    # City -> CTY. John Doe -> JD. 0512. Al -> ALXX
    assert rx2 == "CTY-JD-0512-ALXX"

def test_rx_id_allocation():
    reg = {}
    c1 = allocate_rx_id("APL-RR-1410-RAME", "enc-1", reg)
    assert c1 == "APL-RR-1410-RAME"
    assert reg[c1] == "enc-1"
    
    # same encounter reuse
    c2 = allocate_rx_id("APL-RR-1410-RAME", "enc-1", reg)
    assert c2 == "APL-RR-1410-RAME"
    
    # different encounter collision -> RAMEA
    c3 = allocate_rx_id("APL-RR-1410-RAME", "enc-2", reg)
    assert c3 == "APL-RR-1410-RAMEA"
    assert reg[c3] == "enc-2"

def test_normalize_rx_id():
    assert normalize_rx_id("apl rr 1410 rame") == "APL-RR-1410-RAME"
    assert normalize_rx_id("APLRR1410RAME") == "APL-RR-1410-RAME"
    
    with pytest.raises(HTTPException):
        normalize_rx_id("invalid123")

def test_care_gaps():
    # 1. 187 days ago -> Gap
    res1 = [
        {"resource_type": "Condition", "raw_json": {"code": {"coding": [{"system": "http://snomed.info/sct", "code": "44054006"}]}}},
        {"resource_type": "Observation", "raw_json": {"code": {"coding": [{"system": "http://loinc.org", "code": "4548-4"}]}, "effectiveDateTime": "2024-04-10T00:00:00Z", "valueQuantity": {"value": 8.1, "unit": "%"}}}
    ]
    as_of = datetime(2024, 10, 15, tzinfo=timezone.utc)
    gaps1 = evaluate_care_gaps(res1, as_of)
    assert len(gaps1) == 1
    assert gaps1[0]["code"] == "HBA1C_OVERDUE"
    
    # 2. 90 days ago -> No gap
    as_of2 = datetime(2024, 6, 10, tzinfo=timezone.utc)
    gaps2 = evaluate_care_gaps(res1, as_of2)
    assert len(gaps2) == 0
    
    # 3. No HbA1c -> Gap
    res3 = [
        {"resource_type": "Condition", "raw_json": {"code": {"coding": [{"system": "http://snomed.info/sct", "code": "44054006"}]}}}
    ]
    gaps3 = evaluate_care_gaps(res3, as_of)
    assert len(gaps3) == 1
    assert gaps3[0]["code"] == "HBA1C_OVERDUE"
