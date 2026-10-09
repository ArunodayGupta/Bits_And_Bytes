"""app/routers/scan.py
Scan-to-FHIR Endpoints.

POST /api/fhir/scan-report:
  Processes lab report image with OCR (Mock default or AWS Textract), extracts lab results,
  and returns a ScanDraft for patient review. Does NOT write to the database.

POST /api/fhir/scan-report/confirm:
  Validates patient-confirmed parameters, reconstructs FHIR R4 Observations server-side,
  and writes them atomically with source='ocr_scan'.
"""

import io
import os
import time
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image

from app.services.ocr_service import (
    ConfirmReportInput,
    ConfirmReportResponse,
    ScanDraft,
    build_fhir_observation,
    get_ocr_provider,
    parse_ocr_document_to_draft,
)
from app.utils.db import is_demo_patient, save_confirmed_observation
from app.utils.lab_catalog import LAB_CATALOG

router = APIRouter(prefix="/api/fhir", tags=["Scan-to-FHIR"])

# Abuse protection in-memory counters
_IP_REQUEST_TIMES: dict[str, list[float]] = defaultdict(list)
_DAILY_COUNT: dict[str, int] = defaultdict(int)

JPEG_MAGIC = b"\xFF\xD8\xFF"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _check_rate_limits(client_ip: str) -> None:
    """Enforce per-IP rate limit and global daily upload caps."""
    now = time.time()
    today_str = date.today().isoformat()

    # Feature flag check
    ocr_enabled = os.getenv("OCR_ENABLED", "true").lower() in ("true", "1", "yes")
    if not ocr_enabled:
        raise HTTPException(
            status_code=503,
            detail={"error": {"code": "OCR_DISABLED", "message": "OCR feature is currently disabled."}},
        )

    # Daily cap check
    daily_limit = int(os.getenv("OCR_DAILY_LIMIT", "50"))
    if _DAILY_COUNT[today_str] >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail={"error": {"code": "DAILY_QUOTA_EXCEEDED", "message": "Global daily demo OCR limit exceeded."}},
        )

    # Per-IP rate limit: 5 requests per minute
    window_start = now - 60.0
    _IP_REQUEST_TIMES[client_ip] = [t for t in _IP_REQUEST_TIMES[client_ip] if t > window_start]
    if len(_IP_REQUEST_TIMES[client_ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail={"error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many upload attempts. Please wait 1 minute."}},
        )

    _IP_REQUEST_TIMES[client_ip].append(now)
    _DAILY_COUNT[today_str] += 1


@router.post("/scan-report", response_model=ScanDraft)
async def scan_lab_report(
    request: Request,
    file: UploadFile = File(...),
    abha_id: str = Form(...),
):
    """Analyze uploaded lab report image with OCR and extract test parameters for review.

    In-memory processing only: file is discarded after extraction.
    Does NOT persist to database.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_rate_limits(client_ip)

    # Verify demo patient
    norm_abha = abha_id.strip()
    if not is_demo_patient(norm_abha):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient not found or not a demo record"}},
        )

    # Content-type check
    allowed_types = ["image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail={"error": {"code": "UNSUPPORTED_MEDIA_TYPE", "message": "Only JPEG and PNG images are supported."}},
        )

    # Read bytes and check size cap
    max_mb = int(os.getenv("OCR_MAX_UPLOAD_MB", "5"))
    max_bytes = max_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": f"File exceeds maximum allowed size of {max_mb} MB."}},
        )

    # Magic byte validation
    is_valid_jpeg = content.startswith(JPEG_MAGIC)
    is_valid_png = content.startswith(PNG_MAGIC)
    if not (is_valid_jpeg or is_valid_png):
        raise HTTPException(
            status_code=415,
            detail={"error": {"code": "CORRUPT_OR_SPOOFED_FILE", "message": "File headers do not match allowed image formats."}},
        )

    # Pillow decode check
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=415,
            detail={"error": {"code": "IMAGE_DECODE_FAILED", "message": "Failed to decode image data."}},
        )

    # Perform OCR via provider
    provider = get_ocr_provider()
    ocr_doc = provider.analyze(content, file.content_type)

    # Parse into ScanDraft
    draft = parse_ocr_document_to_draft(ocr_doc, abha_id=norm_abha)
    return draft


@router.post("/scan-report/confirm", response_model=ConfirmReportResponse)
def confirm_scanned_report(payload: ConfirmReportInput):
    """Reconstruct FHIR R4 Observations from patient-confirmed fields and persist atomically.

    Ignores client-provided FHIR JSON. Re-validates all parameters against clinical lab catalog.
    Sets source = 'ocr_scan'.
    """
    if not payload.acknowledged:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NOT_ACKNOWLEDGED", "message": "Patient must acknowledge that values have been verified."}},
        )

    norm_abha = payload.abha_id.strip()
    if not is_demo_patient(norm_abha):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient not found or not a demo record"}},
        )

    # Non-future date check
    try:
        eff_date = date.fromisoformat(payload.effective_date[:10])
        if eff_date > date.today():
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "INVALID_DATE", "message": "Effective date cannot be in the future."}},
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_DATE", "message": "Effective date must be valid ISO date format."}},
        )

    if not payload.items:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "EMPTY_ITEMS", "message": "At least one lab test item must be confirmed."}},
        )

    created_resources = []
    created_count = 0
    already_existed_count = 0

    for item in payload.items:
        lab_entry = LAB_CATALOG.get(item.test_key)
        if not lab_entry:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "UNKNOWN_TEST", "message": f"Test '{item.test_key}' not in supported lab catalog."}},
            )

        # Validate allowed unit
        allowed_units_lower = [u.lower() for u in lab_entry.allowed_units]
        if item.unit.lower() not in allowed_units_lower:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "INVALID_UNIT", "message": f"Unit '{item.unit}' not valid for test {lab_entry.display}."}},
            )

        # Validate hard physiological bounds
        min_bound, max_bound = lab_entry.hard_bounds
        if item.value < min_bound or item.value > max_bound:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "OUT_OF_BOUNDS", "message": f"Value {item.value} exceeds clinical bounds ({min_bound} - {max_bound})."}},
            )

        # Reconstruct FHIR Observation deterministically
        obs_fhir = build_fhir_observation(
            abha_id=norm_abha,
            lab_entry=lab_entry,
            value=item.value,
            unit=item.unit,
            effective_date=payload.effective_date,
        )

        success, already_existed = save_confirmed_observation(norm_abha, obs_fhir)
        if already_existed:
            already_existed_count += 1
        else:
            created_count += 1
        created_resources.append(obs_fhir)

    return ConfirmReportResponse(
        success=True,
        created_count=created_count,
        already_existed_count=already_existed_count,
        resources=created_resources,
    )
