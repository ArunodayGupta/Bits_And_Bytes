"""app/routers/prescriptions.py
Prescription endpoints: Generic Savings Engine with Jan Aushadhi (PMBJP).
"""

from fastapi import APIRouter, HTTPException

from app.services.savings_service import (
    PrescriptionSavingsResponse,
    compute_savings_for_prescription,
)
from app.utils.db import get_prescription_medications

router = APIRouter(prefix="/api/prescription", tags=["Prescriptions"])


@router.get("/{rx_id}/savings", response_model=PrescriptionSavingsResponse)
def get_prescription_savings(rx_id: str):
    """Map prescribed medicines to Jan Aushadhi generic alternatives and estimate monthly savings.

    Reuses Phase 1 speakable Rx-ID normalization, demo-only gate, 404 behavior, and access_logs.
    """
    rx, medications = get_prescription_medications(rx_id)
    if not rx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PRESCRIPTION_NOT_FOUND", "message": "Prescription not found or not a demo record"}},
        )

    savings_response = compute_savings_for_prescription(rx_id=rx["rx_id"], medication_requests=medications)
    return savings_response
