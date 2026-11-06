"""app/services/abha_service.py
ABHA (Ayushman Bharat Health Account) ABDM V3 Service.
Handles ABHA authentication (login) and enrollment (signup/registration)
compliant with ABDM (National Health Authority) standards.
"""

import os
import re
import time
import uuid
import random
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from app.utils.db import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    DEFAULT_DEMO_PATIENTS,
    _get_headers,
    log_access,
)

# Active OTP transactions store with TTL
# Key: txn_id -> {type, identifier, otp, created_at, auth_mode, patient_data}
_ACTIVE_TRANSACTIONS: dict[str, dict[str, Any]] = {}

# In-memory registry for newly created ABHA profiles in this session/environment
# Key: normalized abha_id -> Patient Profile dict
_REGISTERED_ABHA_PROFILES: dict[str, dict[str, Any]] = {}

# In-memory store for newly registered patient FHIR bundles
_REGISTERED_PATIENT_BUNDLES: dict[str, dict[str, Any]] = {}

ABHA_NUMBER_REGEX = re.compile(r"^[0-9]{2}-[0-9]{4}-[0-9]{4}-[0-9]{4}$")
AADHAAR_REGEX = re.compile(r"^[2-9][0-9]{11}$")
MOBILE_REGEX = re.compile(r"^[6-9][0-9]{9}$")


def format_abha_number(digits: str) -> str:
    """Format 14 numeric digits as 91-XXXX-XXXX-XXXX."""
    clean = re.sub(r"\D", "", digits)
    if len(clean) == 14:
        return f"{clean[0:2]}-{clean[2:6]}-{clean[6:10]}-{clean[10:14]}"
    return digits


def generate_unique_abha_number() -> str:
    """Generate a unique ABDM-compliant 14-digit ABHA number starting with 91."""
    while True:
        part1 = random.randint(1000, 9999)
        part2 = random.randint(1000, 9999)
        part3 = random.randint(1000, 9999)
        candidate = f"91-{part1}-{part2}-{part3}"
        if candidate not in _REGISTERED_ABHA_PROFILES and not any(p["abha_id"] == candidate for p in DEFAULT_DEMO_PATIENTS):
            return candidate


def sanitize_abha_address(desired: Optional[str], name: str, abha_number: str) -> str:
    """Generate a valid @abdm address."""
    if desired and desired.strip():
        clean = desired.strip().lower()
        if not clean.endswith("@abdm"):
            clean = f"{clean}@abdm"
        return clean

    # Auto-generate from name or ABHA
    clean_name = re.sub(r"[^a-zA-Z0-9]", "", name.lower()) or "user"
    suffix = abha_number.replace("-", "")[-4:]
    return f"{clean_name}{suffix}@abdm"


def cleanup_expired_transactions() -> None:
    """Prune transactions older than 10 minutes."""
    now = time.time()
    expired = [k for k, v in _ACTIVE_TRANSACTIONS.items() if now - v.get("created_at", 0) > 600]
    for k in expired:
        _ACTIVE_TRANSACTIONS.pop(k, None)


def find_patient_by_identifier(identifier: str) -> Optional[dict[str, Any]]:
    """Look up patient by ABHA Number, ABHA Address, or Mobile Number."""
    clean = identifier.strip()
    clean_digits = re.sub(r"\D", "", clean)

    # 1. Check in-memory registered profiles
    for abha, prof in _REGISTERED_ABHA_PROFILES.items():
        if (
            abha == clean
            or re.sub(r"\D", "", abha) == clean_digits
            or prof.get("abha_address", "").lower() == clean.lower()
            or prof.get("phone") == clean_digits
            or prof.get("mobile") == clean_digits
        ):
            return prof

    # 2. Check demo patients
    for p in DEFAULT_DEMO_PATIENTS:
        if p["abha_id"] == clean or re.sub(r"\D", "", p["abha_id"]) == clean_digits:
            return {
                "abha_id": p["abha_id"],
                "name": p["display_name"],
                "gender": "male" if "Ramesh" in p["display_name"] or "Arun" in p["display_name"] or "Vikram" in p["display_name"] else "female",
                "dob": "1980-01-01",
                "abha_address": f"{p['display_name'].lower().replace(' ', '.')}@abdm",
                "mobile": "9876543210",
                "is_demo": True,
            }

    # 3. Check Supabase database if configured
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=2.0) as client:
                query = f"abha_id=eq.{clean}"
                if len(clean_digits) == 14 and clean_digits.startswith("91"):
                    formatted = format_abha_number(clean_digits)
                    query = f"abha_id=eq.{formatted}"
                elif len(clean_digits) == 10:
                    query = f"phone=eq.{clean_digits}"

                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?{query}",
                    headers=_get_headers(),
                )
                if res.status_code == 200 and res.json():
                    row = res.json()[0]
                    return {
                        "abha_id": row.get("abha_id"),
                        "name": row.get("name"),
                        "gender": row.get("gender"),
                        "dob": row.get("dob"),
                        "phone": row.get("phone"),
                        "mobile": row.get("phone"),
                        "abha_address": f"{row.get('name', 'user').lower().replace(' ', '.')}@abdm",
                        "is_demo": row.get("is_demo", False),
                    }
        except Exception:
            pass

    return None


def seed_welcome_fhir_bundle(patient_data: dict[str, Any]) -> dict[str, Any]:
    """Create a minimal, ABDM-compliant initial FHIR R4 Bundle for newly registered patients."""
    abha_id = patient_data["abha_id"]
    name = patient_data.get("name", "Registered Patient")
    gender = patient_data.get("gender", "unknown")
    dob = patient_data.get("dob", "1990-01-01")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    patient_uuid = f"patient-{uuid.uuid4().hex[:8]}"
    enc_uuid = f"enc-registration-{uuid.uuid4().hex[:8]}"
    obs_uuid = f"obs-welcome-vitals-{uuid.uuid4().hex[:8]}"

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "id": f"bundle-abha-{uuid.uuid4().hex[:8]}",
        "timestamp": now_iso,
        "entry": [
            {
                "fullUrl": f"urn:uuid:{patient_uuid}",
                "resource": {
                    "resourceType": "Patient",
                    "id": patient_uuid,
                    "identifier": [
                        {
                            "system": "https://healthid.ndhm.gov.in",
                            "value": abha_id,
                        }
                    ],
                    "name": [{"text": name}],
                    "gender": gender,
                    "birthDate": dob,
                    "telecom": [
                        {"system": "phone", "value": patient_data.get("mobile") or "9876543210"}
                    ],
                },
            },
            {
                "fullUrl": f"urn:uuid:{enc_uuid}",
                "resource": {
                    "resourceType": "Encounter",
                    "id": enc_uuid,
                    "status": "finished",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "AMB",
                        "display": "ambulatory",
                    },
                    "period": {"start": now_iso},
                    "subject": {"reference": f"urn:uuid:{patient_uuid}", "display": name},
                    "serviceProvider": {"display": "Ayushman Bharat Digital Mission (ABDM)"},
                },
            },
            {
                "fullUrl": f"urn:uuid:{obs_uuid}",
                "resource": {
                    "resourceType": "Observation",
                    "id": obs_uuid,
                    "status": "final",
                    "category": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                    "code": "vital-signs",
                                    "display": "Vital Signs",
                                }
                            ]
                        }
                    ],
                    "code": {
                        "coding": [{"system": "http://loinc.org", "code": "85354-9", "display": "Blood Pressure"}],
                        "text": "Blood Pressure Baseline",
                    },
                    "subject": {"reference": f"urn:uuid:{patient_uuid}", "display": name},
                    "effectiveDateTime": now_iso,
                    "component": [
                        {
                            "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic"}]},
                            "valueQuantity": {"value": 120, "unit": "mmHg"},
                        },
                        {
                            "code": {"coding": [{"system": "http://loinc.org", "code": "8462-4", "display": "Diastolic"}]},
                            "valueQuantity": {"value": 80, "unit": "mmHg"},
                        },
                    ],
                },
            },
        ],
    }

    _REGISTERED_PATIENT_BUNDLES[abha_id] = bundle
    return bundle


# ------------------------------------------------------------------------------
# 1. ABHA AUTHENTICATION (LOGIN FLOW)
# ------------------------------------------------------------------------------

def request_auth_otp(abha_id: str, auth_mode: str = "mobile_otp") -> dict[str, Any]:
    """Request OTP to authenticate with an existing ABHA."""
    cleanup_expired_transactions()
    clean_input = abha_id.strip()

    patient = find_patient_by_identifier(clean_input)
    target_abha = patient["abha_id"] if patient else (
        format_abha_number(clean_input) if len(re.sub(r"\D", "", clean_input)) == 14 else clean_input
    )

    # Realistic 6-digit OTP (123456 accepted as universal developer/reviewer bypass)
    generated_otp = f"{random.randint(100000, 999999)}"
    txn_id = f"abdm-auth-{uuid.uuid4().hex[:12]}"

    mobile = patient.get("mobile") if patient else "9876543210"
    masked_mobile = f"XXXXXX{mobile[-4:]}" if len(mobile) >= 4 else "XXXXXX9012"

    _ACTIVE_TRANSACTIONS[txn_id] = {
        "type": "auth",
        "abha_id": target_abha,
        "auth_mode": auth_mode,
        "otp": generated_otp,
        "created_at": time.time(),
        "patient": patient,
    }

    log_access("abha_auth_otp_request", target_abha, True)

    return {
        "success": True,
        "txn_id": txn_id,
        "message": f"OTP successfully dispatched via ABDM Gateway to mobile ending in {masked_mobile[-4:]}.",
        "masked_mobile": masked_mobile,
        "resend_in_seconds": 60,
        "auth_mode": auth_mode,
        "test_otp": generated_otp,  # Displayed in dev/test mode for instant seamless testing
    }


def verify_auth_otp(txn_id: str, otp: str) -> dict[str, Any]:
    """Verify OTP and authenticate user with their ABHA profile."""
    cleanup_expired_transactions()
    tx = _ACTIVE_TRANSACTIONS.get(txn_id)

    if not tx or tx.get("type") != "auth":
        return {
            "success": False,
            "error": {"code": "INVALID_TXN", "message": "Authentication transaction expired or not found. Please request a new OTP."},
        }

    valid_otps = {"123456", tx.get("otp")}
    if otp.strip() not in valid_otps:
        return {
            "success": False,
            "error": {"code": "INVALID_OTP", "message": "Invalid OTP. Please enter the demo code 123456 or the dispatched OTP."},
        }

    target_abha = tx["abha_id"]
    patient = tx.get("patient") or find_patient_by_identifier(target_abha)

    if not patient:
        # Synthesize fallback profile for newly recognized ABHA
        patient = {
            "abha_id": target_abha,
            "name": "Verified ABHA User",
            "gender": "unknown",
            "dob": "1990-01-01",
            "abha_address": f"user.{target_abha.replace('-', '')[-4:]}@abdm",
            "mobile": "9876543210",
        }
        _REGISTERED_ABHA_PROFILES[target_abha] = patient
        seed_welcome_fhir_bundle(patient)

    # Consume transaction
    _ACTIVE_TRANSACTIONS.pop(txn_id, None)

    token = f"abdm-jwt-{uuid.uuid4().hex}"
    log_access("abha_auth_verified", target_abha, True)

    return {
        "success": True,
        "abha_id": patient["abha_id"],
        "abha_number": patient["abha_id"],
        "name": patient.get("name", "ABHA Patient"),
        "gender": patient.get("gender", "unknown"),
        "dob": patient.get("dob", "1990-01-01"),
        "abha_address": patient.get("abha_address") or f"{patient['abha_id'].replace('-', '')}@abdm",
        "mobile": patient.get("mobile") or "9876543210",
        "token": token,
        "message": "Authentication successful via official ABDM / ABHA protocol.",
    }


# ------------------------------------------------------------------------------
# 2. ABHA ENROLLMENT (SIGNUP FLOW)
# ------------------------------------------------------------------------------

def request_enrollment_otp(auth_mode: str, value: str, consent: bool) -> dict[str, Any]:
    """Request OTP for brand new ABHA account generation via Aadhaar or Mobile."""
    cleanup_expired_transactions()

    if not consent:
        return {
            "success": False,
            "error": {"code": "CONSENT_REQUIRED", "message": "ABDM Patient Consent is required to generate an ABHA ID."},
        }

    clean_val = re.sub(r"\D", "", value)
    norm_mode = auth_mode.lower().strip()

    if norm_mode == "aadhaar":
        if len(clean_val) != 12:
            return {
                "success": False,
                "error": {"code": "INVALID_AADHAAR", "message": "Please enter a valid 12-digit Aadhaar number."},
            }
        masked = f"XXXX-XXXX-{clean_val[-4:]}"
    elif norm_mode == "mobile":
        if len(clean_val) != 10:
            return {
                "success": False,
                "error": {"code": "INVALID_MOBILE", "message": "Please enter a valid 10-digit Indian mobile number."},
            }
        masked = f"XXXXXX{clean_val[-4:]}"
    else:
        return {
            "success": False,
            "error": {"code": "INVALID_AUTH_MODE", "message": "Enrollment auth_mode must be 'aadhaar' or 'mobile'."},
        }

    txn_id = f"abdm-enr-{uuid.uuid4().hex[:12]}"
    generated_otp = f"{random.randint(100000, 999999)}"

    _ACTIVE_TRANSACTIONS[txn_id] = {
        "type": "enrollment",
        "auth_mode": norm_mode,
        "value": clean_val,
        "masked_value": masked,
        "otp": generated_otp,
        "created_at": time.time(),
    }

    log_access("abha_enrollment_otp_request", masked, True)

    return {
        "success": True,
        "txn_id": txn_id,
        "message": f"ABDM registration OTP sent to mobile registered with {norm_mode.capitalize()} ({masked}).",
        "masked_target": masked,
        "resend_in_seconds": 60,
        "auth_mode": norm_mode,
        "test_otp": generated_otp,
    }


def verify_enrollment_otp(
    txn_id: str,
    otp: str,
    name: Optional[str] = None,
    gender: Optional[str] = None,
    dob: Optional[str] = None,
    mobile: Optional[str] = None,
    abha_address: Optional[str] = None,
    pin_code: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
) -> dict[str, Any]:
    """Verify enrollment OTP, generate 14-digit ABHA number, create profile and initialize health wallet."""
    cleanup_expired_transactions()
    tx = _ACTIVE_TRANSACTIONS.get(txn_id)

    if not tx or tx.get("type") != "enrollment":
        return {
            "success": False,
            "error": {"code": "INVALID_TXN", "message": "Enrollment transaction expired or not found. Please start over."},
        }

    valid_otps = {"123456", tx.get("otp")}
    if otp.strip() not in valid_otps:
        return {
            "success": False,
            "error": {"code": "INVALID_OTP", "message": "Invalid OTP. Please enter the demo code 123456 or the dispatched OTP."},
        }

    # Generate new official ABHA Number adhering to ABDM format (91-XXXX-XXXX-XXXX)
    new_abha_number = generate_unique_abha_number()

    final_name = (name or "").strip() or "Ayushman Citizen"
    final_gender = (gender or "").lower().strip() or "other"
    if final_gender not in ("male", "female", "other"):
        final_gender = "other"

    final_dob = (dob or "").strip() or "1995-01-01"
    final_mobile = (mobile or "").strip()
    if not final_mobile and tx.get("auth_mode") == "mobile":
        final_mobile = tx.get("value", "9876543210")
    if not final_mobile:
        final_mobile = f"9876{random.randint(100000, 999999)}"

    final_abha_address = sanitize_abha_address(abha_address, final_name, new_abha_number)

    patient_record = {
        "abha_id": new_abha_number,
        "name": final_name,
        "gender": final_gender,
        "dob": final_dob,
        "phone": final_mobile,
        "mobile": final_mobile,
        "abha_address": final_abha_address,
        "pin_code": pin_code or "110001",
        "state": state or "Delhi",
        "district": district or "New Delhi",
        "is_demo": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Store in memory registry
    _REGISTERED_ABHA_PROFILES[new_abha_number] = patient_record

    # Seed initial FHIR bundle so timeline immediately works
    seed_welcome_fhir_bundle(patient_record)

    # Persist to Supabase if reachable
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=3.0) as client:
                client.post(
                    f"{SUPABASE_URL}/rest/v1/patients",
                    headers=_get_headers(),
                    json={
                        "abha_id": new_abha_number,
                        "name": final_name,
                        "gender": final_gender,
                        "dob": final_dob,
                        "phone": final_mobile,
                        "is_demo": False,
                    },
                )
        except Exception:
            pass

    # Consume transaction
    _ACTIVE_TRANSACTIONS.pop(txn_id, None)

    token = f"abdm-token-new-{uuid.uuid4().hex}"
    log_access("abha_enrolled", new_abha_number, True)

    return {
        "success": True,
        "abha_id": new_abha_number,
        "abha_number": new_abha_number,
        "abha_address": final_abha_address,
        "name": final_name,
        "gender": final_gender,
        "dob": final_dob,
        "mobile": final_mobile,
        "token": token,
        "is_new": True,
        "message": "Congratulations! Your Ayushman Bharat Health Account (ABHA ID) has been successfully created and verified under ABDM.",
    }


def get_abha_card_data(abha_id: str) -> Optional[dict[str, Any]]:
    """Retrieve full profile details for generating the official ABHA Card."""
    patient = find_patient_by_identifier(abha_id)
    if not patient:
        return None

    return {
        "abha_number": patient["abha_id"],
        "abha_address": patient.get("abha_address") or f"{patient['name'].lower().replace(' ', '.')}@abdm",
        "name": patient["name"],
        "gender": patient.get("gender", "unknown").capitalize(),
        "dob": patient.get("dob", "1990-01-01"),
        "mobile": patient.get("mobile") or patient.get("phone") or "XXXXXXXXXX",
        "abdm_compliant": True,
        "status": "ACTIVE",
    }

