"""tests/test_care_gaps.py
Unit tests for Care-Gap Engine v2 (app.services.care_gaps).
Tests pure logic, data prep helpers, BP rules, HbA1c rules, and runs the shared test vectors.
"""

import json
from pathlib import Path

from app.services.care_gaps import (
    evaluate_care_gaps,
    extract_bp_readings,
    has_hypertension,
)

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "backend" / "fixtures"
SHARED_VECTORS_PATH = Path(__file__).resolve().parent.parent / "shared" / "test-vectors" / "care-gaps.json"


def test_extract_bp_readings_basic_and_helpers():
    # Observations with valid BP, same-day multiple, entered-in-error, and missing component
    observations = [
        {
            "id": "obs-bp-1",
            "event_date": "2024-10-14T09:00:00Z",
            "raw_json": {
                "status": "final",
                "effectiveDateTime": "2024-10-14T09:00:00Z",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 140}},
                    {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 90}},
                ],
            },
        },
        # Same day, slightly later -> should take precedence over obs-bp-1
        {
            "id": "obs-bp-2",
            "event_date": "2024-10-14T11:00:00Z",
            "raw_json": {
                "status": "final",
                "effectiveDateTime": "2024-10-14T11:00:00Z",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 148}},
                    {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 92}},
                ],
            },
        },
        # Entered in error -> ignored
        {
            "id": "obs-bp-err",
            "event_date": "2024-09-01T10:00:00Z",
            "raw_json": {
                "status": "entered-in-error",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 180}},
                    {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 110}},
                ],
            },
        },
        # Missing diastolic component -> skipped with warning
        {
            "id": "obs-bp-missing",
            "event_date": "2024-08-01T10:00:00Z",
            "raw_json": {
                "status": "final",
                "effectiveDateTime": "2024-08-01T10:00:00Z",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 130}},
                ],
            },
        },
    ]

    readings, warnings = extract_bp_readings(observations)

    assert len(readings) == 1
    # Check that latest same-day reading was chosen (148/92)
    assert readings[0].systolic == 148
    assert readings[0].diastolic == 92
    assert any("obs-bp-missing skipped" in w for w in warnings)


def test_has_hypertension_helper():
    # Active hypertension SNOMED 59621000
    active_htn = [{
        "resource_type": "Condition",
        "raw_json": {
            "clinicalStatus": {"coding": [{"code": "active"}]},
            "code": {"coding": [{"system": "http://snomed.info/sct", "code": "59621000"}]},
        },
    }]
    assert has_hypertension(active_htn) is True

    # Resolved hypertension -> should be False
    resolved_htn = [{
        "resource_type": "Condition",
        "raw_json": {
            "clinicalStatus": {"coding": [{"code": "resolved"}]},
            "code": {"coding": [{"system": "http://snomed.info/sct", "code": "59621000"}]},
        },
    }]
    assert has_hypertension(resolved_htn) is False


def test_uncontrolled_bp_with_3_high_readings():
    resources = [
        {
            "resource_type": "Condition",
            "raw_json": {
                "clinicalStatus": {"coding": [{"code": "active"}]},
                "code": {"coding": [{"code": "59621000"}]},
            },
        },
        # 3 readings (all >= 140/90, not strictly rising: 150 -> 142 -> 146)
        {
            "resource_type": "Observation",
            "event_date": "2024-06-01T10:00:00Z",
            "raw_json": {
                "status": "final",
                "effectiveDateTime": "2024-06-01T10:00:00Z",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 150}},
                    {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 95}},
                ],
            },
        },
        {
            "resource_type": "Observation",
            "event_date": "2024-08-01T10:00:00Z",
            "raw_json": {
                "status": "final",
                "effectiveDateTime": "2024-08-01T10:00:00Z",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 142}},
                    {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 90}},
                ],
            },
        },
        {
            "resource_type": "Observation",
            "event_date": "2024-10-01T10:00:00Z",
            "raw_json": {
                "status": "final",
                "effectiveDateTime": "2024-10-01T10:00:00Z",
                "component": [
                    {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 146}},
                    {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 92}},
                ],
            },
        },
    ]

    gaps = evaluate_care_gaps(resources, as_of="2024-10-01T12:00:00Z")
    codes = [g.code for g in gaps]
    assert "UNCONTROLLED_BP" in codes
    assert "BP_RISING_TREND" not in codes  # not strictly increasing (150 > 142)


def test_shared_test_vectors():
    """Execute all test cases from shared/test-vectors/care-gaps.json."""
    assert SHARED_VECTORS_PATH.exists()
    vectors = json.loads(SHARED_VECTORS_PATH.read_text(encoding="utf-8"))

    for idx, case in enumerate(vectors):
        desc = case.get("description", f"Vector #{idx}")
        resources = case["resources"]
        as_of = case.get("as_of")
        expected_codes = case["expected_codes"]

        gaps = evaluate_care_gaps(resources, as_of=as_of)
        actual_codes = [g.code for g in gaps]

        assert actual_codes == expected_codes, f"Failed on '{desc}': expected {expected_codes}, got {actual_codes}"


def test_seeded_ramesh_kumar_fixture_care_gaps():
    """Verify seeded Ramesh Kumar bundle triggers the three expected care gaps."""
    fixture_path = FIXTURES_DIR / "ramesh-kumar.bundle.json"
    assert fixture_path.exists()
    bundle = json.loads(fixture_path.read_text(encoding="utf-8"))

    resources = []
    for entry in bundle.get("entry", []):
        res = entry.get("resource", {})
        rtype = res.get("resourceType")
        if rtype in ("Condition", "Observation"):
            resources.append({
                "id": res.get("id"),
                "resource_type": rtype,
                "fhir_id": res.get("id"),
                "event_date": res.get("effectiveDateTime") or res.get("recordedDate"),
                "summary_title": res.get("code", {}).get("text") or "Clinical Item",
                "raw_json": res,
            })

    gaps = evaluate_care_gaps(resources, as_of="2024-10-14T12:00:00+05:30")
    codes = [g.code for g in gaps]

    assert "HBA1C_OVERDUE" in codes
    assert "UNCONTROLLED_BP" in codes
    assert "BP_RISING_TREND" in codes
    assert len(codes) == 3
