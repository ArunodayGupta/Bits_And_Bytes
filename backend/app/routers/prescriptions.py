"""app/routers/prescriptions.py
Prescription endpoints: Generic Savings Engine with Jan Aushadhi (PMBJP) and Doctor Prescribing.
"""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.savings_service import (
    PrescriptionSavingsResponse,
    compute_savings_for_prescription,
)
from app.utils.db import (
    create_prescription_in_db,
    get_prescription_medications,
    is_demo_patient,
    is_prescription_dispensed,
    mark_prescription_dispensed,
)

router = APIRouter(prefix="/api/prescription", tags=["Prescriptions"])


class MedicationInput(BaseModel):
    name: str = Field(..., description="Medicine or molecule name")
    dosage: str = Field("500 mg", description="Strength or dosage")
    frequency: str = Field("Once daily", description="Dosage frequency")
    duration_days: int = Field(30, description="Duration in days")
    instructions: str = Field("", description="Usage instructions")


class CreatePrescriptionPayload(BaseModel):
    abha_id: str = Field(..., description="Patient ABHA ID (e.g. 91-1234-5678-9012)")
    doctor_name: str = Field("Dr. Rajesh Rao, MD", description="Prescribing Doctor")
    hospital_name: str = Field("Apollo Hospitals, New Delhi", description="Hospital or Clinic")
    diagnosis: str | None = Field(None, description="Clinical diagnosis")
    medications: list[MedicationInput] = Field(..., min_length=1, description="List of prescribed medicines")


@router.post("", status_code=201)
def create_prescription(payload: CreatePrescriptionPayload):
    """Doctor endpoint: Add electronic prescription for a patient in the database.
    Generates speakable Rx-ID and persists MedicationRequests in Supabase.
    """
    if not is_demo_patient(payload.abha_id):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient not found or not a demo record"}},
        )

    med_dicts = [m.model_dump() for m in payload.medications]
    result = create_prescription_in_db(
        abha_id=payload.abha_id,
        doctor_name=payload.doctor_name,
        hospital_name=payload.hospital_name,
        diagnosis=payload.diagnosis,
        medications=med_dicts,
    )
    if not result:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "CREATION_FAILED", "message": "Failed to create prescription in database"}},
        )
    return result


@router.get("/{rx_id}")
def get_prescription_details(rx_id: str):
    """Physician/Doctor endpoint: Lookup prescription details and medicines by speakable Rx-ID."""
    rx, medications = get_prescription_medications(rx_id)
    if not rx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PRESCRIPTION_NOT_FOUND", "message": "Prescription not found or not a demo record"}},
        )

    # Clean medication list for frontend display
    med_list = []
    for m in medications:
        raw = m.get("raw_json", {})
        title = m.get("summary_title") or raw.get("medicationCodeableConcept", {}).get("text", "Prescribed Drug")
        instr = raw.get("dosageInstruction", [{}])[0].get("text", "As directed")
        med_list.append({
            "id": m.get("fhir_id") or raw.get("id"),
            "name": title,
            "instructions": instr,
            "raw": raw,
        })

    is_disp, disp_at = is_prescription_dispensed(rx_id)

    return {
        "rx_id": rx.get("rx_id"),
        "hospital_name": rx.get("hospital_name", "Medical Centre"),
        "doctor_name": rx.get("doctor_name", "Treating Physician"),
        "issued_on": rx.get("issued_on"),
        "patient": rx.get("patients"),
        "medications": med_list,
        "dispensed": is_disp,
        "dispensed_at": disp_at,
    }


@router.get("/{rx_id}/savings", response_model=PrescriptionSavingsResponse)
def get_prescription_savings(rx_id: str):
    """Physician endpoint: Map prescribed medicines to Jan Aushadhi generic alternatives and estimate monthly savings."""
    rx, medications = get_prescription_medications(rx_id)
    if not rx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PRESCRIPTION_NOT_FOUND", "message": "Prescription not found or not a demo record"}},
        )

    is_disp, disp_at = is_prescription_dispensed(rx_id)
    savings_response = compute_savings_for_prescription(
        rx_id=rx["rx_id"],
        medication_requests=medications,
        dispensed=is_disp,
        dispensed_at=disp_at,
    )
    return savings_response


class DispensePayload(BaseModel):
    dispensed: bool = True
    pharmacist_name: str | None = "Apollo Jan Aushadhi Pharmacy"
    notes: str | None = None


@router.post("/{rx_id}/dispense")
def dispense_prescription(rx_id: str, payload: DispensePayload | None = None):
    """Physician/Pharmacist endpoint: Mark a prescription as dispensed in the database (persisting to Supabase & disk)."""
    rx, _ = get_prescription_medications(rx_id)
    if not rx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PRESCRIPTION_NOT_FOUND", "message": "Prescription not found or not a demo record"}},
        )

    dispensed_state = payload.dispensed if payload else True
    pharmacist = payload.pharmacist_name if (payload and payload.pharmacist_name) else "Apollo Jan Aushadhi Pharmacy"
    notes = payload.notes if payload else None

    result = mark_prescription_dispensed(
        rx_id=rx["rx_id"],
        dispensed=dispensed_state,
        pharmacist_name=pharmacist,
        notes=notes,
    )
    return result


@router.get("/{rx_id}/dispense")
def get_dispense_status(rx_id: str):
    """Physician/Pharmacist endpoint: Retrieve prescription dispensing status."""
    rx, _ = get_prescription_medications(rx_id)
    if not rx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "PRESCRIPTION_NOT_FOUND", "message": "Prescription not found or not a demo record"}},
        )

    is_disp, disp_at = is_prescription_dispensed(rx_id)
    return {
        "rx_id": rx["rx_id"],
        "dispensed": is_disp,
        "dispensed_at": disp_at,
    }


