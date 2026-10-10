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
    sample_img = Path(__file__).resolve().parent.parent / "fixtures" / "sample-lab-report.png"
    assert sample_img.exists()
    from app.services.ocr_service import TextractProvider
    provider = TextractProvider()
    doc = provider.analyze(sample_img.read_bytes(), "image/png")
    assert len(doc.tables) >= 1

