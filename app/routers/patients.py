"""app/routers/patients.py
Patient clinical endpoints: Care-Gap Engine v2.
"""


from fastapi import APIRouter, HTTPException, Query

from app.services.care_gaps import CareGap, evaluate_care_gaps
from app.utils.db import (
    get_clinical_resources_for_care_gaps,
    get_patient_bundle_from_db,
    is_demo_patient,
)

router = APIRouter(prefix="/api/patient", tags=["Patients"])


@router.get("/{abha_id}/bundle")
def get_patient_bundle(abha_id: str):
    """Retrieve full FHIR bundle directly from live database for a given ABHA ID.
    Always returns latest database records (conditions, observations, encounters, prescriptions).
    """
    if not is_demo_patient(abha_id):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient not found or not a demo record"}},
        )

    bundle = get_patient_bundle_from_db(abha_id)
    if not bundle:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "BUNDLE_NOT_FOUND", "message": f"Could not retrieve bundle for ABHA {abha_id}"}},
        )
    return bundle


@router.get("/{abha_id}/care-gaps", response_model=list[CareGap])
def get_care_gaps(
    abha_id: str,
    as_of: str | None = Query(None, description="Clinical evaluation effective as-of date (ISO format)"),
):
    """Run table-driven Care-Gap Engine v2 on patient records.

    Restricted to is_demo patients only.
    Returns care gaps sorted by severity (high -> medium -> low) then code.
    Returns [] when there are no gaps.
    """
    if not is_demo_patient(abha_id):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient not found or not a demo record"}},
        )

    resources = get_clinical_resources_for_care_gaps(abha_id)
    gaps = evaluate_care_gaps(resources, as_of=as_of)
    return gaps


@router.get("/{abha_id}/details")
def get_patient_details(abha_id: str):
    """Doctor endpoint: Retrieve full clinical details (demographics, conditions, vitals, prescriptions) for patient review."""
    from app.utils.db import get_patient_details_for_doctor
    details = get_patient_details_for_doctor(abha_id)
    if not details:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": f"Patient {abha_id} not found or not a demo record"}},
        )
    return details

