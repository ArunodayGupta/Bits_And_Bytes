"""backend/tests/test_abha.py
Unit tests for ABDM ABHA Authentication and Enrollment APIs.
"""

from app.routers.abha import (
    abha_auth_request_otp,
    abha_auth_verify_otp,
    abha_enrollment_request_otp,
    abha_enrollment_verify_otp,
    get_abha_card,
    search_abha,
    AuthRequestOtpInput,
    AuthVerifyOtpInput,
    EnrollmentRequestOtpInput,
    EnrollmentVerifyOtpInput,
)
from app.utils.db import get_patient_bundle_from_db


def test_abha_auth_flow():
    # 1. Request OTP for demo patient Ramesh Kumar
    req = abha_auth_request_otp(AuthRequestOtpInput(abha_id="91-1234-5678-9012"))
    assert "txn_id" in req
    assert "XXXXXX" in req["masked_mobile"]

    # 2. Verify OTP with universal demo bypass 123456
    res = abha_auth_verify_otp(AuthVerifyOtpInput(txn_id=req["txn_id"], otp="123456"))
    assert res["success"] is True
    assert res["name"] == "Ramesh Kumar"
    assert res["abha_id"] == "91-1234-5678-9012"
    assert "token" in res


def test_abha_enrollment_aadhaar_flow():
    # 1. Request enrollment OTP with 12-digit Aadhaar
    req = abha_enrollment_request_otp(
        EnrollmentRequestOtpInput(auth_mode="aadhaar", value="987654321012", consent=True)
    )
    assert req["success"] is True
    assert "txn_id" in req

    # 2. Complete enrollment with citizen profile details
    res = abha_enrollment_verify_otp(
        EnrollmentVerifyOtpInput(
            txn_id=req["txn_id"],
            otp="123456",
            name="Rohit Sharma",
            gender="male",
            dob="1992-04-30",
            mobile="9876543210",
            abha_address="rohit.sharma@abdm",
        )
    )
    assert res["success"] is True
    new_abha = res["abha_number"]
    assert new_abha.startswith("91-")
    assert res["name"] == "Rohit Sharma"
    assert res["abha_address"].endswith("@abdm")

    # 3. Retrieve generated ABHA card
    card = get_abha_card(new_abha)
    assert card["name"] == "Rohit Sharma"
    assert card["abdm_compliant"] is True

    # 4. Confirm bundle is immediately initialized for newly created ABHA
    bundle = get_patient_bundle_from_db(new_abha)
    assert bundle is not None
    assert bundle["resourceType"] == "Bundle"
    assert len(bundle["entry"]) >= 1


def test_abha_search():
    # Search existing patient
    found = search_abha("91-1234-5678-9012")
    assert found["found"] is True
    assert found["name"] == "Ramesh Kumar"

    # Search nonexistent
    not_found = search_abha("99-9999-9999-9999")
    assert not_found["found"] is False

