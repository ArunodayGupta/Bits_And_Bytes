"""tests/test_savings.py
Unit tests for Generic Savings Engine (app.services.savings_service).
Tests catalog validation, conservative matching, frequency parsing, and exact Decimal financial math.
"""

import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.savings_service import (
    CatalogEntry,
    compute_savings_for_prescription,
    load_and_validate_catalog,
    match_medication,
    parse_frequency,
)


def test_catalog_validates_at_startup():
    catalog = load_and_validate_catalog()
    assert len(catalog) >= 6
    for entry in catalog:
        assert isinstance(entry, CatalogEntry)
        assert entry.illustrative is True
        assert entry.brand_price_per_strip > Decimal(0)
        assert entry.generic_price_per_strip > Decimal(0)
        assert entry.generic_price_per_strip <= entry.brand_price_per_strip


def test_conservative_matcher_cases():
    catalog = load_and_validate_catalog()

    # 1. Telmisartan 40 mg
    entry, reason = match_medication("Telmisartan 40 mg oral tablet", catalog)
    assert entry is not None
    assert entry.id == "telmisartan-40"
    assert reason is None

    # 2. Brand alias "Telma 40"
    entry, reason = match_medication("Telma 40", catalog)
    assert entry is not None
    assert entry.id == "telmisartan-40"

    # 3. Combination product -> unmatched
    entry, reason = match_medication("Telmisartan 40 mg + Hydrochlorothiazide 12.5 mg", catalog)
    assert entry is None
    assert "Combination product" in reason

    # 4. Metformin 500 mg IR vs SR -> separate entries
    entry_ir, _ = match_medication("Metformin 500 mg oral tablet", catalog)
    assert entry_ir is not None
    assert entry_ir.id == "metformin-500-ir"
    assert entry_ir.release == "IR"

    entry_sr, _ = match_medication("Metformin 500 mg SR tablet", catalog)
    assert entry_sr is not None
    assert entry_sr.id == "metformin-500-sr"
    assert entry_sr.release == "SR"

    # 5. Metformin 850 mg -> unmatched (strength mismatch)
    entry_850, reason = match_medication("Metformin 850 mg", catalog)
    assert entry_850 is None
    assert "Strength mismatch" in reason

    # 6. Levothyroxine 50 mcg -> matched with caution
    entry_levo, _ = match_medication("Levothyroxine 50 mcg oral tablet", catalog)
    assert entry_levo is not None
    assert entry_levo.id == "levothyroxine-50"
    assert entry_levo.caution is not None
    assert "Narrow therapeutic index" in entry_levo.caution


def test_frequency_parsing():
    # Structured timing
    doses, assumed = parse_frequency({
        "timing": {"repeat": {"frequency": 2, "period": 1, "periodUnit": "d"}}
    })
    assert doses == 2
    assert assumed is False

    # Text "BD"
    doses, assumed = parse_frequency({"text": "Take 1 tablet BD after meals"})
    assert doses == 2
    assert assumed is False

    # Text "1-0-1"
    doses, assumed = parse_frequency({"text": "1-0-1 with water"})
    assert doses == 2
    assert assumed is False

    # Text "1-1-1"
    doses, assumed = parse_frequency({"text": "1-1-1 after food"})
    assert doses == 3
    assert assumed is False

    # Unknown -> default 1 with assumed_frequency True
    doses, assumed = parse_frequency({"text": "As needed for pain"})
    assert doses == 1
    assert assumed is True


def test_worked_example_telmisartan_40_od():
    """Worked test from prompt:

    Telmisartan 40 mg once daily, brand 220 and generic 28 per 15-tablet strip:
    total units = 30 -> 2 strips each -> 440 vs 56 -> savings 384 (87.3%).
    """
    medication_requests = [
        {
            "raw_json": {
                "medicationCodeableConcept": {"text": "Telmisartan 40 mg oral tablet"},
                "dosageInstruction": [{"text": "Take 1 tablet (40 mg) once daily in the morning"}],
            }
        }
    ]

    res = compute_savings_for_prescription("APL-RR-1410-RAME", medication_requests)
    assert len(res.medications) == 1
    assert len(res.unmatched) == 0

    m = res.medications[0]
    assert m.monthly_cost_brand == Decimal("440.00")
    assert m.monthly_cost_generic == Decimal("56.00")
    assert m.monthly_savings_rupees == Decimal("384.00")
    assert m.savings_percentage == Decimal("87.3")
    assert res.total_monthly_savings == Decimal("384.00")


def test_twice_daily_dosing_metformin():
    """Metformin 500 mg twice daily:

    total units = 2 * 30 = 60.
    Brand 35 / 10-tab strip -> 6 strips = 210.00.
    Generic 7.50 / 10-tab strip -> 6 strips = 45.00.
    Savings = 165.00 (78.6%).
    """
    medication_requests = [
        {
            "raw_json": {
                "medicationCodeableConcept": {"text": "Metformin 500 mg oral tablet"},
                "dosageInstruction": [{"text": "Take 1 tablet twice daily with meals"}],
            }
        }
    ]

    res = compute_savings_for_prescription("APL-RR-1410-RAME", medication_requests)
    m = res.medications[0]
    assert m.doses_per_day == 2
    assert m.monthly_cost_brand == Decimal("210.00")
    assert m.monthly_cost_generic == Decimal("45.00")
    assert m.monthly_savings_rupees == Decimal("165.00")
    assert m.savings_percentage == Decimal("78.6")


def test_generic_not_cheaper_floors_at_zero():
    """Mock catalog entry where generic is more expensive than brand."""
    mock_entry = CatalogEntry(
        id="expensive-generic",
        ingredients=["testdrug"],
        strength_value=Decimal(10),
        strength_unit="mg",
        form="tablet",
        release="IR",
        brand_name="Brand X",
        brand_aliases=["brand x", "testdrug 10"],
        brand_price_per_strip=Decimal("50.00"),
        brand_units_per_strip=10,
        generic_name="Jan Aushadhi Testdrug",
        generic_price_per_strip=Decimal("60.00"),
        generic_units_per_strip=10,
        price_as_of="2024-10-01",
        source_note="Test note",
        illustrative=True,
    )

    medication_requests = [
        {
            "raw_json": {
                "medicationCodeableConcept": {"text": "testdrug 10 mg"},
                "dosageInstruction": [{"text": "1 tablet daily"}],
            }
        }
    ]

    res = compute_savings_for_prescription(
        "TEST-RX", medication_requests, catalog=[mock_entry]
    )
    assert len(res.medications) == 1
    m = res.medications[0]
    assert m.monthly_savings_rupees == Decimal("0.00")
    assert m.savings_percentage == Decimal("0.0")
    assert res.total_monthly_savings == Decimal("0.00")
