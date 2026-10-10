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


class ScanDraftMedication(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""
    confidence: float = 95.0


class OcrDocument(BaseModel):
    lines: list[OcrLine] = Field(default_factory=list)
    key_value_pairs: list[OcrKeyValuePair] = Field(default_factory=list)
    tables: list[OcrTable] = Field(default_factory=list)
    medications: list[ScanDraftMedication] = Field(default_factory=list)
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
    medications: list[ScanDraftMedication] = Field(default_factory=list)
    unmapped_rows: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ============================================================================
# CONFIRMATION MODELS (Payload for POST /api/fhir/scan-report/confirm)
# ============================================================================

class ConfirmItemInput(BaseModel):
    test_key: str
    value: float
    unit: str


class ConfirmMedicationInput(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""


class ConfirmReportInput(BaseModel):
    abha_id: str
    effective_date: str
    items: list[ConfirmItemInput] = Field(default_factory=list)
    medications: list[ConfirmMedicationInput] = Field(default_factory=list)
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
    _SYSTEM_PROMPT = """You are an expert medical lab report and clinical document OCR engine.
Analyse the provided document (which may be a laboratory report, clinical consultation note, prescription note, or discharge summary) and extract all diagnostic test results and clinical investigations.

CRITICAL INSTRUCTIONS:
1. DIAGNOSTIC LAB TESTS & INVESTIGATIONS:
   Extract all diagnostic test parameters, such as HbA1c, Fasting Blood Glucose / Sugar, TSH, Serum Creatinine, Cholesterol, etc., found in the document (including under 'RECENT INVESTIGATIONS', 'INVESTIGATIONS', 'LAB RESULTS', 'VITALS', or doctor's notes).

2. TABLES OUTPUT:
   In the "tables" field, provide a clean table containing ONLY diagnostic laboratory test results.
   Columns should represent: [Test Name, Result, Unit, Reference Range].
   If the investigations in the image are listed as text or key-values (for example: "HbA1c: 7.4 %", "Fasting Blood Glucose: 132 mg/dL", "TSH: 6.2 mIU/L"), STRUCTURE THEM AS ROWS in this table so they are recognized!
   DO NOT put prescription medication rows into the lab test table.

3. PRESCRIBED MEDICATIONS (Rx):
   If the document contains a prescription (Rx) table or medication list (e.g., "Tab. Metformin 500 mg", "Tab. Amlodipine 5 mg", "Tab. Levothyroxine 50 mcg"), extract them into the "medications" field with name, dosage, frequency, duration, and instructions.

4. KEY-VALUE PAIRS:
   Include every test parameter, vital, and metadata item as a key-value pair (e.g. {"key": "HbA1c", "value": "7.4 %"}, {"key": "Fasting Blood Glucose", "value": "132 mg/dL"}, {"key": "TSH", "value": "6.2 mIU/L"}, {"key": "Report Date", "value": "14/10/2024"}).

5. DATE FORMAT:
   Extract the document/report date (e.g., "14-Oct-2024" -> "14/10/2024") into the "report_date" field.

Return ONLY a JSON object (no markdown, no commentary) with this exact schema:
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
  ],
  "medications": [
    {
      "name": "<string>",
      "dosage": "<string>",
      "frequency": "<string>",
      "duration": "<string>",
      "instructions": "<string>",
      "confidence": <0-100 float>
    }
  ]
}"""

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
                            "text": "Extract all diagnostic laboratory test results and prescribed medications from this document as described. Convert text investigations into structured table rows, and extract prescription drugs into the medications list."
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

        meds: list[ScanDraftMedication] = [
            ScanDraftMedication(
                name=str(m.get("name", "")).strip(),
                dosage=str(m.get("dosage", "")).strip(),
                frequency=str(m.get("frequency", "")).strip(),
                duration=str(m.get("duration", "")).strip(),
                instructions=str(m.get("instructions", "")).strip(),
                confidence=float(m.get("confidence", 95.0)),
            )
            for m in data.get("medications", [])
            if m.get("name") and str(m.get("name")).strip()
        ]

        return OcrDocument(
            lines=lines,
            key_value_pairs=kv_pairs,
            tables=tables,
            medications=meds,
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

MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}


def parse_day_first_date(text: str) -> str | None:
    """Parse date in Indian DD/MM/YYYY, DD-MM-YYYY, or DD-Mon-YYYY format.

    Rejects future dates. Returns YYYY-MM-DD or None.
    """
    if not text:
        return None

    # 1. Named month format: e.g. 14-Oct-2024, 14 Oct 2024, 14-October-2024
    named_m = re.search(r"\b(\d{1,2})[\/\-\s]+([A-Za-z]{3,9})[\/\-\s,]+(\d{2,4})\b", text)
    if named_m:
        d_str, mon_str, y_str = named_m.group(1), named_m.group(2).lower(), named_m.group(3)
        if mon_str in MONTH_MAP:
            try:
                y = int(y_str)
                if y < 100:
                    y += 2000
                mo = MONTH_MAP[mon_str]
                d = int(d_str)
                candidate = date(y, mo, d)
                if candidate <= date.today():
                    return candidate.isoformat()
            except Exception:
                pass

    # 2. Regex matching DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
    m = re.search(r"\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b", text)
    if m:
        d_str, m_str, y_str = m.group(1), m.group(2), m.group(3)
        try:
            y = int(y_str)
            if y < 100:
                y += 2000
            candidate = date(y, int(m_str), int(d_str))
            if candidate <= date.today():
                return candidate.isoformat()
        except Exception:
            pass

    # 3. ISO YYYY-MM-DD
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


def parse_rx_table_row(row: list[OcrTableCell]) -> ScanDraftMedication | None:
    """Extract medication name, dosage, frequency, and duration from an Rx table row."""
    if not row:
        return None
    row_text = " ".join(c.text.lower() for c in row).strip()
    if not row_text:
        return None
    # Skip pure header row
    if any(h in row_text for h in ["medicine", "frequency", "duration"]) and not any(m in row_text for m in ["tab.", "cap.", "mg", "mcg", "1-0-1", "0-0-1"]):
        return None

    cells = [c.text.strip() for c in row if c.text.strip()]
    if not cells:
        return None

    # Strip leading pure row numbers like "1", "2"
    while cells and re.match(r"^[\d\W_]+$", cells[0]) and len(cells[0]) < 3:
        cells.pop(0)

    if not cells:
        return None

    # Name: prefer cell starting with Tab. / Cap. / Syp. / Inj.
    name = cells[0]
    dosage = ""
    frequency = ""
    duration = ""

    for c in cells:
        c_low = c.lower()
        if any(c_low.startswith(p) for p in ["tab.", "tab ", "cap.", "cap ", "syp.", "inj."]):
            name = c
            break

    # Look for dosage, frequency, duration among remaining cells
    for c in cells:
        if c == name:
            continue
        c_low = c.lower()
        if not dosage and re.search(r"\b\d+\s*(?:mg|mcg|ml|g|iu)\b", c, re.IGNORECASE):
            dosage = c
        elif not frequency and any(k in c_low for k in ["1-0-1", "0-0-1", "1-0-0", "0-1-0", "1-1-1", "daily", "night", "food", "stomach", "morning"]):
            frequency = c
        elif not duration and any(k in c_low for k in ["day", "days", "week", "month"]):
            duration = c

    conf = min(c.confidence for c in row)
    return ScanDraftMedication(
        name=name,
        dosage=dosage,
        frequency=frequency,
        duration=duration,
        confidence=conf,
    )


def is_rx_table(table: OcrTable) -> bool:
    """Detect if table contains prescription medications rather than diagnostic tests."""
    rx_indicators = {
        "medicine", "dose", "frequency", "duration", "drug",
        "tab.", "tablet", "cap.", "capsule", "syp.", "syrup",
        "after food", "empty stomach", "at night", "before food",
        "1-0-1", "0-0-1", "1-0-0", "0-1-0", "1-1-1",
    }
    rx_hits = 0
    total_cells = 0
    for row in table.rows:
        for cell in row:
            total_cells += 1
            ct = cell.text.lower()
            if any(ind in ct for ind in rx_indicators):
                rx_hits += 1
    return total_cells > 0 and (rx_hits >= 2 or (rx_hits / total_cells) > 0.15)


def parse_ocr_document_to_draft(doc: OcrDocument, abha_id: str) -> ScanDraft:
    """Interpret OCR lines, KV pairs, and tables into a validated ScanDraft.
    
    Uses a multi-tier extraction pipeline:
      Tier 1: Tables (with prescription Rx table extraction & filtering)
      Tier 2: Key-Value pairs (e.g. recent investigations blocks)
      Tier 3: Line heuristics (free-form test lines)
    """
    report_date, report_date_conf = extract_report_date(doc)
    items: list[ScanDraftItem] = []
    medications: list[ScanDraftMedication] = []
    unmapped_rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    detected_tests: set[str] = set()

    # -------------------------------------------------------------------------
    # Tier 1: Parse Tables
    # -------------------------------------------------------------------------
    for table in doc.tables:
        if not table.rows:
            continue

        # If table is a prescription medication table, extract medications
        if is_rx_table(table):
            for row in table.rows:
                med_item = parse_rx_table_row(row)
                if med_item:
                    medications.append(med_item)
                else:
                    row_text = " | ".join(c.text.strip() for c in row if c.text.strip())
                    if row_text and not row_text.lower().startswith("# | medicine"):
                        unmapped_rows.append({
                            "raw_test_name": row_text,
                            "raw_result": "",
                            "raw_unit": "",
                            "category": "prescription_medication",
                            "issue": "Prescription medication header",
                        })
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

            # Check if cell maps to a known lab test
            lab_entry = find_lab_entry_by_alias(test_text)
            if not lab_entry:
                # If first cell didn't match, check if second cell has test name
                if len(row) > 1:
                    lab_entry = find_lab_entry_by_alias(row[1].text)
                    if lab_entry:
                        test_text = row[1].text
                        result_text = row[2].text if len(row) > 2 else ""
                        unit_text = row[3].text if len(row) > 3 else ""
                        ref_text = row[4].text if len(row) > 4 else ""

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
                # Try finding numeric value in other cells
                for extra_cell in row:
                    if extra_cell.text != test_text:
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
                for u in lab_entry.allowed_units:
                    if u.lower() in result_text.lower() or u.lower() in test_text.lower():
                        clean_unit = u
                        break
            if not clean_unit and lab_entry.allowed_units:
                clean_unit = lab_entry.allowed_units[0]

            # Incongruous unit rejection (e.g. HbA1c measured in mg or mcg is impossible)
            if lab_entry.test_key == "hba1c" and any(bad in clean_unit.lower() for bad in ["mg", "mcg"]):
                unmapped_rows.append({
                    "raw_test_name": test_text,
                    "raw_result": result_text,
                    "raw_unit": clean_unit,
                    "issue": f"Unit '{clean_unit}' is impossible for HbA1c; rejected invalid match",
                })
                continue

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

    # -------------------------------------------------------------------------
    # Tier 2: Parse Key-Value Pairs (e.g. Recent Investigations / Vitals)
    # -------------------------------------------------------------------------
    for kv in doc.key_value_pairs:
        k_text = kv.key.strip()
        v_text = kv.value.strip()
        if not k_text or not v_text:
            continue

        lab_entry = find_lab_entry_by_alias(k_text)
        if not lab_entry or lab_entry.test_key in detected_tests:
            continue

        num_m = re.search(r"(\d+(?:\.\d+)?)", v_text.replace(",", ""))
        if not num_m:
            continue

        val_float = float(num_m.group(1))

        # Determine unit
        clean_unit = ""
        for u in lab_entry.allowed_units:
            if re.search(rf"\b{re.escape(u)}\b", v_text, re.IGNORECASE) or u.lower() in v_text.lower():
                clean_unit = u
                break
        if not clean_unit and lab_entry.allowed_units:
            clean_unit = lab_entry.allowed_units[0]

        issues = []
        needs_review = False
        confidence = kv.confidence

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

        if clean_unit not in lab_entry.allowed_units and clean_unit.lower() not in [u.lower() for u in lab_entry.allowed_units]:
            needs_review = True
            issues.append(f"Unit '{clean_unit}' is unrecognised; expected one of {lab_entry.allowed_units}")

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
                reference_range=lab_entry.default_reference_range,
                confidence=confidence,
                needs_review=needs_review,
                issues=issues,
                fhir_preview=fhir_preview,
            )
        )

    # -------------------------------------------------------------------------
    # Tier 3: Parse Lines (Heuristic regex matching)
    # -------------------------------------------------------------------------
    line_patterns = [
        (
            "hba1c",
            re.compile(r"(?i)\b(?:hba1c|hb\s*a1c|glycated\s*hb|glycosylated\s*hb|a1c)\b\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(%?)")
        ),
        (
            "fasting_glucose",
            re.compile(r"(?i)\b(?:fasting\s+(?:blood\s+)?(?:glucose|sugar)|fbs|fpg)\b\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mg\s*/\s*d[Ll])?")
        ),
        (
            "tsh",
            re.compile(r"(?i)\b(?:tsh|thyroid\s+stimulating\s+hormone|thyrotropin)\b\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(m\[?iu\]?/[Ll]|u\[?iu\]?/m[Ll]|µiu/ml|uiu/ml|miu/l)?")
        ),
        (
            "creatinine",
            re.compile(r"(?i)\b(?:serum\s+creatinine|s\.?\s*creatinine|creatinine)\b\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mg\s*/\s*d[Ll])?")
        ),
        (
            "cholesterol",
            re.compile(r"(?i)\b(?:total\s+cholesterol|serum\s+cholesterol|cholesterol\s+total)\b\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mg\s*/\s*d[Ll])?")
        ),
    ]

    for line in doc.lines:
        t_text = line.text.strip()
        if not t_text:
            continue
        for test_key, pat in line_patterns:
            if test_key in detected_tests:
                continue
            m = pat.search(t_text)
            if not m:
                continue

            lab_entry = LAB_CATALOG[test_key]
            val_float = float(m.group(1))
            raw_unit = m.group(2).strip() if len(m.groups()) >= 2 and m.group(2) else ""

            clean_unit = ""
            for u in lab_entry.allowed_units:
                if raw_unit and (raw_unit.lower() == u.lower() or u.lower() in raw_unit.lower()):
                    clean_unit = u
                    break
            if not clean_unit and lab_entry.allowed_units:
                clean_unit = lab_entry.allowed_units[0]

            issues = []
            needs_review = False
            confidence = line.confidence

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

            detected_tests.add(test_key)

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
                    reference_range=lab_entry.default_reference_range,
                    confidence=confidence,
                    needs_review=needs_review,
                    issues=issues,
                    fhir_preview=fhir_preview,
                )
            )

    # Merge any medications extracted directly by Gemini provider
    for m in doc.medications:
        if not any(m.name.lower() in existing.name.lower() or existing.name.lower() in m.name.lower() for existing in medications):
            medications.append(m)

    return ScanDraft(
        provider=doc.provider_name,
        report_date=report_date,
        report_date_confidence=report_date_conf,
        items=items,
        medications=medications,
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


def build_fhir_medication_request(
    abha_id: str,
    name: str,
    dosage: str = "",
    frequency: str = "",
    duration: str = "",
    authored_on: str | None = None,
) -> dict[str, Any]:
    """Deterministically reconstruct FHIR R4 MedicationRequest resource."""
    eff_date = authored_on or date.today().isoformat()
    if len(eff_date) == 10:
        eff_date = f"{eff_date}T10:00:00+05:30"

    token_str = f"{abha_id}|{name}|{eff_date}"
    med_id = f"medreq-scan-{hashlib.sha256(token_str.encode('utf-8')).hexdigest()[:16]}"
    dose_text = " - ".join(p for p in [dosage, frequency, duration] if p).strip() or "As directed by physician"

    return {
        "resourceType": "MedicationRequest",
        "id": med_id,
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {
            "text": name,
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "display": name,
                }
            ],
        },
        "subject": {
            "reference": f"urn:uuid:patient-{abha_id}",
            "display": "Patient",
        },
        "authoredOn": eff_date,
        "dosageInstruction": [
            {
                "text": dose_text,
            }
        ],
        "meta": {
            "profile": [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest"
            ],
            "tag": [
                {
                    "system": "https://phr-demo.example.org/source",
                    "code": "ocr-scan",
                }
            ],
        },
        "note": [
            {
                "text": "Extracted from patient prescription note by OCR."
            }
        ],
    }
