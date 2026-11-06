"""app/routers/abha.py
ABDM ABHA Authentication and Enrollment Router.
Implements Ayushman Bharat Digital Mission (ABDM) M1 & V3 specs.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.abha_service import (
    request_auth_otp,
    verify_auth_otp,
    request_enrollment_otp,
    verify_enrollment_otp,
    get_abha_card_data,
    find_patient_by_identifier,
)

router = APIRouter(prefix="/api/abha", tags=["ABHA ABDM Gateway"])


# ------------------------------------------------------------------------------
# Request / Response Schemas
# ------------------------------------------------------------------------------

class AuthRequestOtpInput(BaseModel):
    abha_id: str = Field(..., description="14-digit ABHA ID (e.g. 91-1234-5678-9012), ABHA address, or linked mobile number")
    auth_mode: str = Field("mobile_otp", description="Authentication mode: 'mobile_otp' or 'aadhaar_otp'")


class AuthVerifyOtpInput(BaseModel):
    txn_id: str = Field(..., description="Active transaction ID returned by request-otp")
    otp: str = Field(..., description="6-digit OTP code")


class EnrollmentRequestOtpInput(BaseModel):
    auth_mode: str = Field("aadhaar", description="Enrollment mode: 'aadhaar' (12 digits) or 'mobile' (10 digits)")
    value: str = Field(..., description="12-digit Aadhaar number or 10-digit mobile number")
    consent: bool = Field(True, description="Patient consent for ABDM record creation")


class EnrollmentVerifyOtpInput(BaseModel):
    txn_id: str = Field(..., description="Active enrollment transaction ID")
    otp: str = Field(..., description="6-digit OTP code")
    name: Optional[str] = Field(None, description="Full Name of Citizen")
    gender: Optional[str] = Field(None, description="Gender: male, female, or other")
    dob: Optional[str] = Field(None, description="Date of birth in YYYY-MM-DD format")
    mobile: Optional[str] = Field(None, description="10-digit contact mobile number")
    abha_address: Optional[str] = Field(None, description="Desired ABHA Address (e.g. name@abdm)")
    pin_code: Optional[str] = Field(None, description="6-digit postal pin code")
    state: Optional[str] = Field(None, description="State of residence")
    district: Optional[str] = Field(None, description="District of residence")


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------

@router.post("/auth/request-otp", summary="Request OTP for ABHA Login")
def abha_auth_request_otp(payload: AuthRequestOtpInput):
    """Initiates authentication by sending an OTP to the mobile registered with the given ABHA."""
    clean_id = payload.abha_id.strip()
    if not clean_id:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "EMPTY_ABHA_ID", "message": "ABHA ID or Mobile Number cannot be empty."}},
        )

    res = request_auth_otp(clean_id, payload.auth_mode)
    return res


@router.post("/auth/verify-otp", summary="Verify OTP and Complete ABHA Login")
def abha_auth_verify_otp(payload: AuthVerifyOtpInput):
    """Verifies the received OTP and logs the patient into their ABDM Unified Health Wallet."""
    res = verify_auth_otp(payload.txn_id, payload.otp)
    if not res.get("success"):
        err = res.get("error", {})
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": err.get("code", "AUTH_FAILED"), "message": err.get("message", "Authentication failed.")}},
        )
    return res


@router.post("/enrollment/request-otp", summary="Request OTP for New ABHA Registration")
def abha_enrollment_request_otp(payload: EnrollmentRequestOtpInput):
    """Initiates registration for a brand new ABHA ID using Aadhaar (12 digits) or Mobile (10 digits)."""
    res = request_enrollment_otp(payload.auth_mode, payload.value, payload.consent)
    if not res.get("success"):
        err = res.get("error", {})
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": err.get("code", "ENROLLMENT_FAILED"), "message": err.get("message", "Enrollment request failed.")}},
        )
    return res


@router.post("/enrollment/verify-otp", summary="Verify Registration OTP & Issue New ABHA ID")
def abha_enrollment_verify_otp(payload: EnrollmentVerifyOtpInput):
    """Validates the registration OTP, generates a unique ABDM-compliant 14-digit ABHA ID, and seeds the health wallet."""
    res = verify_enrollment_otp(
        txn_id=payload.txn_id,
        otp=payload.otp,
        name=payload.name,
        gender=payload.gender,
        dob=payload.dob,
        mobile=payload.mobile,
        abha_address=payload.abha_address,
        pin_code=payload.pin_code,
        state=payload.state,
        district=payload.district,
    )
    if not res.get("success"):
        err = res.get("error", {})
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": err.get("code", "REGISTRATION_FAILED"), "message": err.get("message", "ABHA generation failed.")}},
        )
    return res


@router.get("/card/{abha_id}", summary="Get Official ABHA Card Details")
def get_abha_card(abha_id: str):
    """Retrieve verified card details for any existing or newly generated ABHA ID."""
    data = get_abha_card_data(abha_id.strip())
    if not data:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ABHA_NOT_FOUND", "message": f"ABHA ID {abha_id} not found in National Health Registry."}},
        )
    return data


@router.get("/search", summary="Search Citizen by ABHA ID or Mobile")
def search_abha(q: str = Query(..., description="ABHA ID, Mobile number, or ABHA address")):
    """Quick lookup to verify existence of an ABHA ID before starting login."""
    patient = find_patient_by_identifier(q.strip())
    if not patient:
        return {"found": False, "message": "No registered ABHA found with this identifier."}
    return {
        "found": True,
        "abha_id": patient["abha_id"],
        "name": patient["name"],
        "abha_address": patient.get("abha_address"),
    }

