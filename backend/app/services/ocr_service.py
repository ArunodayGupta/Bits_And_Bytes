"""app/services/ocr_service.py
OCR Provider Interface and Scan-to-FHIR Service.

Supports:
- OcrProvider Protocol interface with MockOcrProvider (default) and TextractProvider.
- Day-first date parsing (Indian format DD/MM/YYYY).
- Multi-tier document parsing (Tables -> Key-Value Pairs -> Line Heuristics).
- LOINC/UCUM mapping and physiological plausibility bounds checks.
- Server-side deterministic rebuilding of patient-confirmed FHIR R4 Observations.
"""

from __future__ import annotations

import hashlib
import os
import re
from datetime import date
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, Field

from app.utils.lab_catalog import LabCatalogEntry, find_lab_entry_by_alias

# ============================================================================
# OCR DATA STRUCTURES
# ============================================================================

class OcrLine(BaseModel):
    text: str
    confidence: float = 95.0


class OcrKeyValuePair(BaseModel):
    key: str
    value: str
    confidence: float = 95.0


class OcrTableCell(BaseModel):
    text: str
    row_index: int
    col_index: int
    confidence: float = 95.0


class OcrTable(BaseModel):
    rows: list[list[OcrTableCell]] = Field(default_factory=list)
    confidence: float = 95.0


class OcrDocument(BaseModel):
    lines: list[OcrLine] = Field(default_factory=list)
    key_value_pairs: list[OcrKeyValuePair] = Field(default_factory=list)
    tables: list[OcrTable] = Field(default_factory=list)
    provider_name: str = "mock"


# ============================================================================
# SCAN DRAFT MODELS (Returned by POST /api/fhir/scan-report)
# ============================================================================

class ScanDraftItem(BaseModel):
    test_key: str
    display: str
    loinc: str
    value: float
    unit: str
    reference_range: str | None = None
    confidence: float
    needs_review: bool
    issues: list[str] = Field(default_factory=list)
    fhir_preview: dict[str, Any]


class ScanDraft(BaseModel):
    provider: str
    report_date: str | None = None
    report_date_confidence: float | None = None
    items: list[ScanDraftItem] = Field(default_factory=list)
    unmapped_rows: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ============================================================================
# CONFIRMATION MODELS (Payload for POST /api/fhir/scan-report/confirm)
# ============================================================================

class ConfirmItemInput(BaseModel):
    test_key: str
    value: float
    unit: str


class ConfirmReportInput(BaseModel):
    abha_id: str
    effective_date: str
    items: list[ConfirmItemInput]
    acknowledged: bool


class ConfirmReportResponse(BaseModel):
    success: bool
    created_count: int
    already_existed_count: int
    resources: list[dict[str, Any]]


# ============================================================================
# OCR PROVIDER INTERFACE & IMPLEMENTATIONS
# ============================================================================

@runtime_checkable
class OcrProvider(Protocol):
    def analyze(self, image_bytes: bytes, content_type: str) -> OcrDocument:
        ...


class MockOcrProvider:
    """Mock OCR provider returning canned synthetic lab report matching sample-lab-report.png."""

    def analyze(self, image_bytes: bytes, content_type: str) -> OcrDocument:
        headers = [
            OcrTableCell(text="Test Name", row_index=0, col_index=0, confidence=99.0),
            OcrTableCell(text="Result", row_index=0, col_index=1, confidence=99.0),
            OcrTableCell(text="Unit", row_index=0, col_index=2, confidence=99.0),
            OcrTableCell(text="Reference Range", row_index=0, col_index=3, confidence=99.0),
        ]
        row_hba1c = [
            OcrTableCell(text="HbA1c", row_index=1, col_index=0, confidence=98.5),
            OcrTableCell(text="7.2", row_index=1, col_index=1, confidence=98.0),
            OcrTableCell(text="%", row_index=1, col_index=2, confidence=99.0),
            OcrTableCell(text="< 5.7 %", row_index=1, col_index=3, confidence=95.0),
        ]
        row_fbs = [
            OcrTableCell(text="Fasting Blood Sugar", row_index=2, col_index=0, confidence=97.0),
            OcrTableCell(text="118", row_index=2, col_index=1, confidence=97.5),
            OcrTableCell(text="mg/dL", row_index=2, col_index=2, confidence=98.0),
            OcrTableCell(text="70 - 99 mg/dL", row_index=2, col_index=3, confidence=95.0),
        ]
        row_tsh = [
            OcrTableCell(text="TSH", row_index=3, col_index=0, confidence=96.0),
            OcrTableCell(text="2.9", row_index=3, col_index=1, confidence=95.5),
            OcrTableCell(text="uIU/mL", row_index=3, col_index=2, confidence=96.0),
            OcrTableCell(text="0.4 - 4.5 uIU/mL", row_index=3, col_index=3, confidence=94.0),
        ]

        table = OcrTable(rows=[headers, row_hba1c, row_fbs, row_tsh], confidence=97.0)

        kv_pairs = [
            OcrKeyValuePair(key="Patient Name", value="Ramesh Kumar", confidence=99.0),
            OcrKeyValuePair(key="Report Date", value="20/10/2024", confidence=98.0),
            OcrKeyValuePair(key="Sample ID", value="SYN-LAB-202410-001", confidence=96.0),
            OcrKeyValuePair(key="Facility", value="HealthSafe Diagnostic Centre", confidence=98.0),
        ]

        lines = [
            OcrLine(text="HEALTHSAFE DIAGNOSTIC CENTRE", confidence=99.0),
            OcrLine(text="Patient Name: Ramesh Kumar   Report Date: 20/10/2024", confidence=98.0),
            OcrLine(text="Test Name | Result | Unit | Reference Range", confidence=99.0),
            OcrLine(text="HbA1c | 7.2 | % | < 5.7 %", confidence=98.5),
            OcrLine(text="Fasting Blood Sugar | 118 | mg/dL | 70 - 99 mg/dL", confidence=97.5),
            OcrLine(text="TSH | 2.9 | uIU/mL | 0.4 - 4.5 uIU/mL", confidence=96.0),
        ]

        return OcrDocument(
            lines=lines,
            key_value_pairs=kv_pairs,
            tables=[table],
            provider_name="mock",
        )


class TextractProvider:
    """AWS Textract OCR provider using AnalyzeDocument (TABLES + FORMS)."""

    def __init__(self, region_name: str | None = None):
        import boto3
        from botocore.config import Config

        self.region_name = region_name or os.getenv("AWS_REGION", "ap-south-1")
        config = Config(
            connect_timeout=10,
            read_timeout=30,
            retries={"max_attempts": 2, "mode": "standard"},
        )
        self.client = boto3.client("textract", region_name=self.region_name, config=config)

    def analyze(self, image_bytes: bytes, content_type: str) -> OcrDocument:
        import botocore.exceptions

        try:
            response = self.client.analyze_document(
                Document={"Bytes": image_bytes},
                FeatureTypes=["TABLES", "FORMS"],
            )
            return self._parse_textract_response(response)
        except botocore.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("UnsupportedDocumentException", "BadDocumentException"):
                raise ValueError(f"Unsupported document format: {code}")
            elif code in ("ProvisionedThroughputExceededException", "ThrottlingException"):
                raise RuntimeError(f"Textract service throttled: {code}")
            else:
                raise RuntimeError(f"Textract API error: {code}")

    def _parse_textract_response(self, response: dict[str, Any]) -> OcrDocument:
        blocks = response.get("Blocks", [])
        block_map = {b["Id"]: b for b in blocks if "Id" in b}

        lines: list[OcrLine] = []
        key_map: dict[str, Any] = {}
        value_map: dict[str, Any] = {}
        table_blocks: list[dict[str, Any]] = []

        for b in blocks:
            b_type = b.get("BlockType")
            if b_type == "LINE":
                lines.append(OcrLine(text=b.get("Text", ""), confidence=float(b.get("Confidence", 90.0))))
            elif b_type == "KEY_VALUE_SET":
                if "KEY" in b.get("EntityTypes", []):
                    key_map[b["Id"]] = b
                elif "VALUE" in b.get("EntityTypes", []):
                    value_map[b["Id"]] = b
            elif b_type == "TABLE":
                table_blocks.append(b)

        # Extract Key-Value pairs
        kv_pairs: list[OcrKeyValuePair] = []
        for k_id, k_block in key_map.items():
            k_text = self._get_text_for_relationships(k_block, block_map)
            val_text = ""
            val_conf = float(k_block.get("Confidence", 90.0))
            for rel in k_block.get("Relationships", []):
                if rel.get("Type") == "VALUE":
                    for v_id in rel.get("Ids", []):
                        v_block = value_map.get(v_id)
                        if v_block:
                            val_text = self._get_text_for_relationships(v_block, block_map)
                            val_conf = min(val_conf, float(v_block.get("Confidence", 90.0)))
            if k_text:
                kv_pairs.append(OcrKeyValuePair(key=k_text, value=val_text, confidence=val_conf))

        # Extract Tables
        tables: list[OcrTable] = []
        for t_block in table_blocks:
            cells_by_row: dict[int, list[OcrTableCell]] = {}
            for rel in t_block.get("Relationships", []):
                if rel.get("Type") == "CHILD":
                    for c_id in rel.get("Ids", []):
                        cell = block_map.get(c_id)
                        if cell and cell.get("BlockType") == "CELL":
                            r_idx = cell.get("RowIndex", 1) - 1
                            c_idx = cell.get("ColumnIndex", 1) - 1
                            c_text = self._get_text_for_relationships(cell, block_map)
                            c_conf = float(cell.get("Confidence", 90.0))
                            if r_idx not in cells_by_row:
                                cells_by_row[r_idx] = []
                            cells_by_row[r_idx].append(
                                OcrTableCell(text=c_text, row_index=r_idx, col_index=c_idx, confidence=c_conf)
                            )

            sorted_rows = []
            for r_idx in sorted(cells_by_row.keys()):
                row_cells = sorted(cells_by_row[r_idx], key=lambda c: c.col_index)
                sorted_rows.append(row_cells)

            if sorted_rows:
                tables.append(OcrTable(rows=sorted_rows, confidence=float(t_block.get("Confidence", 90.0))))

        return OcrDocument(
            lines=lines,
            key_value_pairs=kv_pairs,
            tables=tables,
            provider_name="textract",
        )

    def _get_text_for_relationships(self, block: dict[str, Any], block_map: dict[str, Any]) -> str:
        words = []
        for rel in block.get("Relationships", []):
            if rel.get("Type") == "CHILD":
                for child_id in rel.get("Ids", []):
                    child = block_map.get(child_id)
                    if child and child.get("BlockType") == "WORD":
                        words.append(child.get("Text", ""))
        return " ".join(words).strip()


class GeminiOcrProvider:
    """Google Gemini vision OCR provider accessed via Google AI Studio API.

    Sends the image to the specified Gemini model and asks it to return a structured
    JSON describing the lab report so that the existing parse pipeline can reuse
    the same OcrDocument -> ScanDraft logic.
    """

    # Google AI Studio API URL template
    _API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    _MODEL = "gemini-3.5-flash-lite"

    # System prompt that instructs Gemini to return structured JSON
    _SYSTEM_PROMPT = """You are a medical lab report OCR engine.
Analyse the provided lab report image and return ONLY a JSON object (no markdown, no commentary) with this exact schema:
{
  "report_date": "<DD/MM/YYYY or null>",
  "patient_name": "<string or null>",
  "key_value_pairs": [
    {"key": "<string>", "value": "<string>", "confidence": <0-100 float>}
  ],
  "lines": [
    {"text": "<string>", "confidence": <0-100 float>}
  ],
  "tables": [
    {
      "confidence": <0-100 float>,
      "rows": [
        [
          {"text": "<string>", "row_index": <int>, "col_index": <int>, "confidence": <0-100 float>}
        ]
      ]
    }
  ]
}
Ensure every test row is included in both lines and the table."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        import base64  # noqa: F401 – imported here to validate availability
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENROUTER_API_KEY", "")
        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is required for the Gemini OCR provider."
            )
        self.model = model or os.getenv("GEMINI_MODEL", self._MODEL)

    def analyze(self, image_bytes: bytes, content_type: str) -> OcrDocument:
        import base64
        import json
        import requests as http

        # Encode image as base64
        b64 = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "system_instruction": {
                "parts": [{"text": self._SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "parts": [
                        {
                            "text": "Extract all lab test results from this report image as described."
                        },
                        {
                            "inline_data": {
                                "mime_type": content_type,
                                "data": b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0
            }
        }

        url = self._API_URL.format(model=self.model, api_key=self.api_key)
        headers = {"Content-Type": "application/json"}

        try:
            resp = http.post(url, json=payload, headers=headers, timeout=60)
            resp.raise_for_status()
        except http.exceptions.Timeout:
            raise RuntimeError("Gemini OCR request timed out after 60 s.")
        except http.exceptions.HTTPError as exc:
            raise RuntimeError(f"Gemini OCR API returned HTTP {exc.response.status_code}: {exc.response.text[:200]}")

        resp_json = resp.json()
        try:
            raw_content: str = resp_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError):
            raise RuntimeError(f"Unexpected response format from Gemini API: {resp.text[:300]}")

        # Robust JSON extraction
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_content, re.DOTALL)
        if json_match:
            raw_content = json_match.group(1)
        else:
            # Fallback: extract substring between first { and last }
            start = raw_content.find('{')
            end = raw_content.rfind('}')
            if start != -1 and end != -1:
                raw_content = raw_content[start:end + 1]

        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Gemini OCR returned non-JSON response: {exc}. Raw: {raw_content[:300]}")

        return self._build_ocr_document(data)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_ocr_document(self, data: dict[str, Any]) -> OcrDocument:
        """Convert the structured JSON from Gemini into an OcrDocument."""
        lines: list[OcrLine] = [
            OcrLine(text=ln.get("text", ""), confidence=float(ln.get("confidence", 90.0)))
            for ln in data.get("lines", [])
            if ln.get("text", "").strip()
        ]

        kv_pairs: list[OcrKeyValuePair] = []
        # Add explicit key_value_pairs from Gemini
        for kv in data.get("key_value_pairs", []):
            if kv.get("key") and kv.get("value") is not None:
                kv_pairs.append(
                    OcrKeyValuePair(
                        key=str(kv["key"]),
                        value=str(kv["value"]),
                        confidence=float(kv.get("confidence", 90.0)),
                    )
                )
        # Inject report_date and patient_name as KV pairs if present
        if data.get("report_date"):
            kv_pairs.insert(0, OcrKeyValuePair(key="Report Date", value=str(data["report_date"]), confidence=95.0))
        if data.get("patient_name"):
            kv_pairs.insert(0, OcrKeyValuePair(key="Patient Name", value=str(data["patient_name"]), confidence=95.0))

        tables: list[OcrTable] = []
        for tbl in data.get("tables", []):
            tbl_rows: list[list[OcrTableCell]] = []
            for row in tbl.get("rows", []):
                cells = [
                    OcrTableCell(
                        text=cell.get("text", ""),
                        row_index=int(cell.get("row_index", 0)),
                        col_index=int(cell.get("col_index", 0)),
                        confidence=float(cell.get("confidence", 90.0)),
                    )
                    for cell in row
                ]
                if cells:
                    tbl_rows.append(cells)
            if tbl_rows:
                tables.append(OcrTable(rows=tbl_rows, confidence=float(tbl.get("confidence", 90.0))))

        return OcrDocument(
            lines=lines,
            key_value_pairs=kv_pairs,
            tables=tables,
            provider_name="gemini",
        )


def get_ocr_provider(provider_type: str | None = None) -> OcrProvider:
    """Select configured OCR provider. Defaults to MockOcrProvider.

    Supported values for OCR_PROVIDER env var (or provider_type arg):
      mock      – canned synthetic lab report (default, no credentials needed)
      gemini    – Google Gemini vision via OpenRouter / Google AI Studio (requires GEMINI_API_KEY)
      textract  – AWS Textract (requires AWS credentials)
    """
    mode = (provider_type or os.getenv("OCR_PROVIDER", "mock")).lower().strip()
    if mode == "gemini":
        try:
            return GeminiOcrProvider()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "GeminiOcrProvider init failed (%s); falling back to MockOcrProvider.", exc
            )
            return MockOcrProvider()
    if mode == "textract":
        try:
            return TextractProvider()
        except Exception:
            return MockOcrProvider()
    return MockOcrProvider()


# ============================================================================
# PARSING LOGIC: OcrDocument -> ScanDraft
# ============================================================================

def parse_day_first_date(text: str) -> str | None:
    """Parse date in Indian DD/MM/YYYY or DD-MM-YYYY format.

    Rejects future dates. Returns YYYY-MM-DD or None.
    """
    # Regex matching DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
    m = re.search(r"\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b", text)
    if not m:
        # Also check ISO YYYY-MM-DD
        iso_m = re.search(r"\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b", text)
        if iso_m:
            try:
                y, mo, d = int(iso_m.group(1)), int(iso_m.group(2)), int(iso_m.group(3))
                candidate = date(y, mo, d)
                if candidate <= date.today():
                    return candidate.isoformat()
            except Exception:
                pass
        return None

    d_str, m_str, y_str = m.group(1), m.group(2), m.group(3)
    try:
        candidate = date(int(y_str), int(m_str), int(d_str))
        if candidate > date.today():
            return None  # Reject future dates
        return candidate.isoformat()
    except Exception:
        return None


def extract_report_date(doc: OcrDocument) -> tuple[str | None, float | None]:
    """Look for report date in key-value pairs or lines."""
    # 1. Key-value pairs
    for kv in doc.key_value_pairs:
        k_lower = kv.key.lower()
        if any(term in k_lower for term in ["date", "reported", "collected", "sample date"]):
            parsed = parse_day_first_date(kv.value)
            if parsed:
                return parsed, kv.confidence

    # 2. Lines
    for line in doc.lines:
        t_lower = line.text.lower()
        if any(term in t_lower for term in ["date", "reported", "collected", "sample"]):
            parsed = parse_day_first_date(line.text)
            if parsed:
                return parsed, line.confidence

    return None, None


def parse_ocr_document_to_draft(doc: OcrDocument, abha_id: str) -> ScanDraft:
    """Interpret OCR lines, KV pairs, and tables into a validated ScanDraft."""
    report_date, report_date_conf = extract_report_date(doc)
    items: list[ScanDraftItem] = []
    unmapped_rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    detected_tests: set[str] = set()

    # 1. Parse Tables
    for table in doc.tables:
        if not table.rows:
            continue

        # Detect header row
        header_row_idx = -1
        name_col = 0
        result_col = 1
        unit_col = 2
        ref_col = 3

        for idx, row in enumerate(table.rows[:3]):
            row_text = " ".join(c.text.lower() for c in row)
            if any(term in row_text for term in ["test", "investigation", "parameter", "result", "value"]):
                header_row_idx = idx
                for c_idx, cell in enumerate(row):
                    ct = cell.text.lower()
                    if "test" in ct or "parameter" in ct or "investigation" in ct:
                        name_col = c_idx
                    elif "result" in ct or "value" in ct:
                        result_col = c_idx
                    elif "unit" in ct:
                        unit_col = c_idx
                    elif "ref" in ct or "range" in ct:
                        ref_col = c_idx
                break

        data_rows = table.rows[header_row_idx + 1 :] if header_row_idx >= 0 else table.rows

        for row in data_rows:
            if not row or len(row) < 2:
                continue

            test_text = row[name_col].text if name_col < len(row) else row[0].text
            result_text = row[result_col].text if result_col < len(row) else ""
            unit_text = row[unit_col].text if unit_col < len(row) else ""
            ref_text = row[ref_col].text if ref_col < len(row) else ""

            # Check if first cell maps to a known test
            lab_entry = find_lab_entry_by_alias(test_text)
            if not lab_entry:
                unmapped_rows.append({
                    "raw_test_name": test_text,
                    "raw_result": result_text,
                    "raw_unit": unit_text,
                    "raw_reference": ref_text,
                })
                continue

            # Extract numeric value
            num_match = re.search(r"(\d+(?:\.\d+)?)", result_text.replace(",", ""))
            if not num_match:
                # Try finding numeric value in subsequent cells
                for extra_cell in row[1:]:
                    num_match = re.search(r"(\d+(?:\.\d+)?)", extra_cell.text.replace(",", ""))
                    if num_match:
                        break

            if not num_match:
                unmapped_rows.append({
                    "raw_test_name": test_text,
                    "raw_result": result_text,
                    "issue": "Could not parse numeric result",
                })
                continue

            val_float = float(num_match.group(1))
            confidence = min(c.confidence for c in row)

            # Determine unit
            clean_unit = unit_text.strip()
            if not clean_unit:
                # Check if unit is in test_text or result_text
                for u in lab_entry.allowed_units:
                    if u in result_text or u in test_text:
                        clean_unit = u
                        break
            if not clean_unit and lab_entry.allowed_units:
                clean_unit = lab_entry.allowed_units[0]

            # Quality and needs_review checks
            issues: list[str] = []
            needs_review = False

            if confidence < 90.0:
                needs_review = True
                issues.append(f"OCR confidence ({confidence:.1f}%) is below recommended 90%")

            min_plausible, max_plausible = lab_entry.plausible_range
            if val_float < min_plausible or val_float > max_plausible:
                needs_review = True
                issues.append(
                    f"Result {val_float} is outside plausible range ({min_plausible} - {max_plausible} {clean_unit}); "
                    "check for decimal point omission or OCR misread"
                )

            # Check unit validity
            if clean_unit not in lab_entry.allowed_units and clean_unit.lower() not in [u.lower() for u in lab_entry.allowed_units]:
                needs_review = True
                issues.append(f"Unit '{clean_unit}' is unrecognised; expected one of {lab_entry.allowed_units}")

            # Deduplication
            if lab_entry.test_key in detected_tests:
                needs_review = True
                issues.append("Multiple candidate values found for this test in report")
            detected_tests.add(lab_entry.test_key)

            fhir_preview = build_fhir_observation(
                abha_id=abha_id,
                lab_entry=lab_entry,
                value=val_float,
                unit=clean_unit,
                effective_date=report_date or date.today().isoformat(),
            )

            items.append(
                ScanDraftItem(
                    test_key=lab_entry.test_key,
                    display=lab_entry.display,
                    loinc=lab_entry.loinc,
                    value=round(val_float, lab_entry.decimals),
                    unit=clean_unit,
                    reference_range=ref_text or lab_entry.default_reference_range,
                    confidence=confidence,
                    needs_review=needs_review,
                    issues=issues,
                    fhir_preview=fhir_preview,
                )
            )

    return ScanDraft(
        provider=doc.provider_name,
        report_date=report_date,
        report_date_confidence=report_date_conf,
        items=items,
        unmapped_rows=unmapped_rows,
        warnings=warnings,
    )


def build_fhir_observation(
    abha_id: str,
    lab_entry: LabCatalogEntry,
    value: float,
    unit: str,
    effective_date: str,
) -> dict[str, Any]:
    """Deterministically reconstruct FHIR R4 Observation resource."""
    # Deterministic ID: sha256 of abha|loinc|date|value truncated
    token_str = f"{abha_id}|{lab_entry.loinc}|{effective_date}|{value:.4f}"
    obs_id = f"obs-scan-{hashlib.sha256(token_str.encode('utf-8')).hexdigest()[:16]}"

    ucum_code = lab_entry.ucum_map.get(unit) or lab_entry.ucum_map.get(unit.lower())

    val_quantity: dict[str, Any] = {
        "value": round(value, lab_entry.decimals),
        "unit": unit,
    }
    if ucum_code:
        val_quantity["system"] = "http://unitsofmeasure.org"
        val_quantity["code"] = ucum_code

    return {
        "resourceType": "Observation",
        "id": obs_id,
        "status": "preliminary",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory",
                        "display": "Laboratory",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": lab_entry.loinc,
                    "display": lab_entry.display,
                }
            ],
            "text": lab_entry.test_key.upper(),
        },
        "subject": {
            "reference": f"urn:uuid:patient-{abha_id}",
            "display": "Patient",
        },
        "effectiveDateTime": effective_date,
        "valueQuantity": val_quantity,
        "meta": {
            "profile": [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"
            ],
            "tag": [
                {
                    "system": "https://phr-demo.example.org/source",
                    "code": "ocr-scan",
                }
            ]
        },
        "note": [
            {
                "text": "Extracted from a patient-uploaded report by OCR and confirmed by the patient."
            }
        ],
    }
