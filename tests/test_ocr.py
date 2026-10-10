"""tests/test_ocr.py
Unit tests for OCR service and parser (app.services.ocr_service).
Tests Mock provider, day-first date parsing, table interpretation, plausibility checks,
and FHIR Observation reconstruction.
"""

import os
import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.ocr_service import (
    MockOcrProvider,
    OcrDocument,
    OcrKeyValuePair,
    OcrTable,
    OcrTableCell,
    build_fhir_medication_request,
    build_fhir_observation,
    parse_day_first_date,
    parse_ocr_document_to_draft,
)
from app.utils.lab_catalog import LAB_CATALOG


def test_mock_ocr_provider_output():
    provider = MockOcrProvider()
    doc = provider.analyze(b"", "image/png")
    assert isinstance(doc, OcrDocument)
    assert doc.provider_name == "mock"
    assert len(doc.tables) == 1
    assert len(doc.tables[0].rows) == 4  # 1 header + 3 test rows
    assert any(kv.key == "Report Date" for kv in doc.key_value_pairs)


def test_day_first_date_parsing():
    # Indian format DD/MM/YYYY
    assert parse_day_first_date("20/10/2024") == "2024-10-20"
    assert parse_day_first_date("Report Date: 05/04/2024") == "2024-04-05"
    assert parse_day_first_date("15-08-2023") == "2023-08-15"

    # Future date rejected
    future_year = date.today().year + 2
    assert parse_day_first_date(f"10/10/{future_year}") is None

    # Invalid string
    assert parse_day_first_date("Not a date") is None


def test_plausibility_check_catches_decimal_slip():
    """A misread HbA1c of 72 instead of 7.2 must flag needs_review=True."""
    doc = OcrDocument(
        provider_name="test",
        lines=[],
        key_value_pairs=[OcrKeyValuePair(key="Report Date", value="20/10/2024")],
        tables=[
            OcrTable(
                rows=[
                    [
                        OcrTableCell(text="Test", row_index=0, col_index=0),
                        OcrTableCell(text="Result", row_index=0, col_index=1),
                        OcrTableCell(text="Unit", row_index=0, col_index=2),
                    ],
                    [
                        OcrTableCell(text="HbA1c", row_index=1, col_index=0),
                        OcrTableCell(text="72", row_index=1, col_index=1),  # Slip: 72 instead of 7.2
                        OcrTableCell(text="%", row_index=1, col_index=2),
                    ],
                ]
            )
        ],
    )

    draft = parse_ocr_document_to_draft(doc, abha_id="91-1234-5678-9012")
    assert len(draft.items) == 1
    item = draft.items[0]
    assert item.value == 72.0
    assert item.needs_review is True
    assert any("plausible range" in issue.lower() for issue in item.issues)


def test_low_confidence_triggers_needs_review():
    doc = OcrDocument(
        provider_name="test",
        tables=[
            OcrTable(
                rows=[
                    [
                        OcrTableCell(text="HbA1c", row_index=0, col_index=0, confidence=75.0),
                        OcrTableCell(text="6.8", row_index=0, col_index=1, confidence=72.0),
                        OcrTableCell(text="%", row_index=0, col_index=2, confidence=80.0),
                    ]
                ]
            )
        ],
    )

    draft = parse_ocr_document_to_draft(doc, abha_id="91-1234-5678-9012")
    assert len(draft.items) == 1
    item = draft.items[0]
    assert item.needs_review is True
    assert any("confidence" in issue.lower() for issue in item.issues)


def test_build_fhir_observation():
    hba1c_entry = LAB_CATALOG["hba1c"]
    obs = build_fhir_observation(
        abha_id="91-1234-5678-9012",
        lab_entry=hba1c_entry,
        value=7.2,
        unit="%",
        effective_date="2024-10-20",
    )

    assert obs["resourceType"] == "Observation"
    assert obs["status"] == "preliminary"
    assert obs["code"]["coding"][0]["code"] == "4548-4"
    assert obs["code"]["coding"][0]["system"] == "http://loinc.org"
    assert obs["valueQuantity"]["value"] == 7.2
    assert obs["valueQuantity"]["unit"] == "%"
    assert obs["valueQuantity"]["code"] == "%"
    assert obs["valueQuantity"]["system"] == "http://unitsofmeasure.org"
    assert obs["effectiveDateTime"] == "2024-10-20"
    assert obs["meta"]["tag"][0]["code"] == "ocr-scan"
    assert "patient-91-1234-5678-9012" in obs["subject"]["reference"]
    assert "Extracted from a patient-uploaded report" in obs["note"][0]["text"]


@pytest.mark.skipif(
    os.getenv("RUN_TEXTRACT_INTEGRATION") != "1",
    reason="Live AWS Textract integration test skipped unless RUN_TEXTRACT_INTEGRATION=1",
)
def test_live_textract_integration():
    sample_img = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sample-lab-report.png"
    assert sample_img.exists()
    from app.services.ocr_service import TextractProvider
    provider = TextractProvider()
    doc = provider.analyze(sample_img.read_bytes(), "image/png")
    assert len(doc.tables) >= 1


def test_named_month_date_parsing():
    assert parse_day_first_date("Date: 14-Oct-2024") == "2024-10-14"
    assert parse_day_first_date("14 Oct 2024") == "2024-10-14"
    assert parse_day_first_date("01-Jan-2024") == "2024-01-01"


def test_find_lab_entry_by_alias_rejects_prescription_noise():
    from app.utils.lab_catalog import find_lab_entry_by_alias
    assert find_lab_entry_by_alias("1") is None
    assert find_lab_entry_by_alias("#") is None
    assert find_lab_entry_by_alias("Tab. Metformin 500 mg") is None
    assert find_lab_entry_by_alias("Tab. Amlodipine 5 mg") is None
    assert find_lab_entry_by_alias("Medicine") is None
    assert find_lab_entry_by_alias("Dose") is None
    # Valid aliases must match
    assert find_lab_entry_by_alias("HbA1c") is not None
    assert find_lab_entry_by_alias("Fasting Blood Glucose") is not None
    assert find_lab_entry_by_alias("TSH") is not None


def test_prescription_note_with_recent_investigations_and_rx_table():
    """Simulates Image 2: Ms. Priya Sharma's clinical note with Recent Investigations

    and an Rx table. The parser must extract HbA1c (7.4%), Fasting Blood Glucose (132 mg/dL),
    and TSH (6.2 mIU/L), while rejecting the Rx table rows from being treated as lab tests.
    """
    from app.services.ocr_service import OcrLine

    doc = OcrDocument(
        provider_name="gemini",
        key_value_pairs=[
            OcrKeyValuePair(key="Report Date", value="14-Oct-2024"),
            OcrKeyValuePair(key="Patient Name", value="Ms. Priya Sharma"),
            OcrKeyValuePair(key="HbA1c", value="7.4 %"),
            OcrKeyValuePair(key="Fasting Blood Glucose", value="132 mg/dL"),
            OcrKeyValuePair(key="TSH", value="6.2 mIU/L"),
        ],
        lines=[
            OcrLine(text="RECENT INVESTIGATIONS"),
            OcrLine(text="HbA1c: 7.4 %   Fasting Blood Glucose: 132 mg/dL"),
            OcrLine(text="TSH: 6.2 mIU/L"),
            OcrLine(text="Rx"),
            OcrLine(text="# Medicine Dose Frequency Duration"),
            OcrLine(text="1 Tab. Metformin 500 mg 500 mg 1-0-1 (after food) 30 days"),
        ],
        tables=[
            # Prescription table that should NOT be parsed as lab tests
            OcrTable(
                rows=[
                    [
                        OcrTableCell(text="#", row_index=0, col_index=0),
                        OcrTableCell(text="Medicine", row_index=0, col_index=1),
                        OcrTableCell(text="Dose", row_index=0, col_index=2),
                        OcrTableCell(text="Frequency", row_index=0, col_index=3),
                        OcrTableCell(text="Duration", row_index=0, col_index=4),
                    ],
                    [
                        OcrTableCell(text="1", row_index=1, col_index=0),
                        OcrTableCell(text="Tab. Metformin 500 mg", row_index=1, col_index=1),
                        OcrTableCell(text="500 mg", row_index=1, col_index=2),
                        OcrTableCell(text="1-0-1 (after food)", row_index=1, col_index=3),
                        OcrTableCell(text="30 days", row_index=1, col_index=4),
                    ],
                    [
                        OcrTableCell(text="2", row_index=2, col_index=0),
                        OcrTableCell(text="Tab. Amlodipine 5 mg", row_index=2, col_index=1),
                        OcrTableCell(text="5 mg", row_index=2, col_index=2),
                        OcrTableCell(text="0-0-1 (at night)", row_index=2, col_index=3),
                        OcrTableCell(text="30 days", row_index=2, col_index=4),
                    ],
                ]
            )
        ],
    )

    draft = parse_ocr_document_to_draft(doc, abha_id="91-1234-5678-9012")

    # Date should be parsed correctly
    assert draft.report_date == "2024-10-14"

    # Exactly 3 lab items extracted
    assert len(draft.items) == 3
    items_by_key = {item.test_key: item for item in draft.items}

    assert "hba1c" in items_by_key
    assert items_by_key["hba1c"].value == 7.4
    assert items_by_key["hba1c"].unit == "%"
    assert items_by_key["hba1c"].needs_review is False

    assert "fasting_glucose" in items_by_key
    assert items_by_key["fasting_glucose"].value == 132.0
    assert items_by_key["fasting_glucose"].unit == "mg/dL"
    assert items_by_key["fasting_glucose"].needs_review is False

    assert "tsh" in items_by_key
    assert items_by_key["tsh"].value == 6.2
    assert items_by_key["tsh"].unit in ["mIU/L", "m[IU]/L"]
    assert items_by_key["tsh"].needs_review is False

    # Metformin 500 mg must NEVER be present as an item
    for item in draft.items:
        assert item.value != 500.0
        assert item.unit != "500 mg"

    # Prescription rows must be parsed into draft.medications
    assert len(draft.medications) == 2
    assert draft.medications[0].name == "Tab. Metformin 500 mg"
    assert draft.medications[0].dosage == "500 mg"
    assert draft.medications[0].frequency == "1-0-1 (after food)"
    assert draft.medications[0].duration == "30 days"

    assert draft.medications[1].name == "Tab. Amlodipine 5 mg"
    assert draft.medications[1].dosage == "5 mg"
    assert draft.medications[1].frequency == "0-0-1 (at night)"
    assert draft.medications[1].duration == "30 days"


def test_build_fhir_medication_request():
    med_req = build_fhir_medication_request(
        abha_id="91-1234-5678-9012",
        name="Tab. Metformin 500 mg",
        dosage="500 mg",
        frequency="1-0-1 (after food)",
        duration="30 days",
        authored_on="2024-10-14",
    )

    assert med_req["resourceType"] == "MedicationRequest"
    assert med_req["status"] == "active"
    assert med_req["intent"] == "order"
    assert med_req["medicationCodeableConcept"]["text"] == "Tab. Metformin 500 mg"
    assert "patient-91-1234-5678-9012" in med_req["subject"]["reference"]
    assert med_req["authoredOn"].startswith("2024-10-14")
    assert med_req["dosageInstruction"][0]["text"] == "500 mg - 1-0-1 (after food) - 30 days"
    assert med_req["meta"]["tag"][0]["code"] == "ocr-scan"


