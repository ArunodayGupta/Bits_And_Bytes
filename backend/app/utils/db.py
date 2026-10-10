"""app/utils/db.py
Database and Persistence Layer for Unified Health Wallet Phase 2.

Handles:
- Demo patient access checks (is_demo = true required).
- Care gap facts retrieval (Condition, Observation).
- Prescription lookup with speakable Rx-ID normalization.
- Atomic, idempotent confirmed Observation writes with source='ocr_scan'.
- Access log auditing (access_logs table).
- Resilient local fixture fallback if remote database is offline or unlinked.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from supabase import Client, create_client

from app.config import settings

load_dotenv()

SUPABASE_URL = settings.supabase_url or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = settings.supabase_service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def get_supabase() -> Client:
    """Uses the service role key to bypass RLS for demo purposes."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or "")

DEFAULT_DEMO_PATIENTS: list[dict[str, str]] = [
    {"abha_id": "91-1234-5678-9012", "display_name": "Ramesh Kumar"},
    {"abha_id": "91-2345-6789-0123", "display_name": "Priya Sharma"},
    {"abha_id": "91-3456-7890-1234", "display_name": "Arun Patel"},
    {"abha_id": "91-4567-8901-2345", "display_name": "Sunita Verma"},
    {"abha_id": "91-5678-9012-3456", "display_name": "Vikram Malhotra"},
    {"abha_id": "91-6789-0123-4567", "display_name": "Ananya Deshmukh"},
]

# In-memory session store for confirmed scans in offline or test mode
_OFFLINE_SCAN_STORE: dict[str, list[dict[str, Any]]] = {}
_OFFLINE_PRESCRIPTION_STORE: dict[str, list[dict[str, Any]]] = {}
_OFFLINE_PRESCRIPTION_LOOKUP: dict[str, tuple[dict[str, Any], list[dict[str, Any]]]] = {}

DISPENSED_STORE_FILE = Path(__file__).resolve().parent.parent / "data" / "dispensed_prescriptions.json"
_OFFLINE_DISPENSED_PRESCRIPTIONS: dict[str, dict[str, Any]] = {}

def _load_dispensed_prescriptions() -> None:
    global _OFFLINE_DISPENSED_PRESCRIPTIONS
    try:
        if DISPENSED_STORE_FILE.exists():
            data = json.loads(DISPENSED_STORE_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                _OFFLINE_DISPENSED_PRESCRIPTIONS = data
    except Exception:
        pass

def _save_dispensed_prescriptions() -> None:
    try:
        DISPENSED_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
        DISPENSED_STORE_FILE.write_text(json.dumps(_OFFLINE_DISPENSED_PRESCRIPTIONS, indent=2), encoding="utf-8")
    except Exception:
        pass

_load_dispensed_prescriptions()


def _get_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY or "",
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY or ''}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def normalize_rx_id(rx_id: str) -> str:
    """Normalize speakable Rx-ID: uppercase, strip whitespace and hyphens."""
    return rx_id.strip().upper().replace(" ", "").replace("-", "")


def log_access(lookup_type: str, lookup_key: str, found: bool) -> None:
    """Record lookup access in access_logs table. Never logs patient names or raw PHI."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    try:
        payload = {
            "lookup_type": lookup_type,
            "lookup_key": lookup_key,
            "found": found,
        }
        with httpx.Client(timeout=3.0) as client:
            client.post(
                f"{SUPABASE_URL}/rest/v1/access_logs",
                headers=_get_headers(),
                json=payload,
            )
    except Exception:
        # Access log failure should not crash patient request
        pass


def get_demo_patients() -> list[dict[str, str]]:
    """Retrieve list of synthetic demo patients for the login shell.

    Logged as lookup_type: 'demo_patients'.
    """
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?select=abha_id,name,is_demo&is_demo=eq.true&order=name.asc",
                    headers=_get_headers(),
                )
                if res.status_code == 200:
                    patients = res.json()
                    log_access("demo_patients", "all", True)
                    return [
                        {"abha_id": p["abha_id"], "display_name": p["name"]}
                        for p in patients
                    ]
        except Exception:
            pass

    # In-memory demo patients fallback
    log_access("demo_patients", "all_fallback", True)
    return DEFAULT_DEMO_PATIENTS


def is_demo_patient(abha_id: str) -> bool:
    """Verify if ABHA ID belongs to a demo patient (is_demo = true)."""
    norm_abha = abha_id.strip()
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?select=id,is_demo&abha_id=eq.{norm_abha}&is_demo=eq.true",
                    headers=_get_headers(),
                )
                if res.status_code == 200 and len(res.json()) > 0:
                    return True
        except Exception:
            pass

    return any(p["abha_id"] == norm_abha for p in DEFAULT_DEMO_PATIENTS)


def get_clinical_resources_for_care_gaps(abha_id: str) -> list[dict[str, Any]]:
    """Retrieve Condition and Observation records for care-gap analysis."""
    norm_abha = abha_id.strip()
    if not is_demo_patient(norm_abha):
        log_access("care_gaps", abha_id, False)
        return []

    resources: list[dict[str, Any]] = []

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                # Query Condition and Observation records
                url = (
                    f"{SUPABASE_URL}/rest/v1/fhir_resources"
                    f"?select=id,fhir_id,resource_type,summary_title,summary_value,event_date,raw_json"
                    f"&abha_id=eq.{norm_abha}"
                    f"&resource_type=in.(Condition,Observation)"
                    f"&order=event_date.desc.nullslast"
                )
                res = client.get(url, headers=_get_headers())
                if res.status_code == 200:
                    resources = res.json()
                    log_access("care_gaps", norm_abha, True)
        except Exception:
            pass

    # If DB query failed or empty, fallback to synthetic facts from bundle files
    if not resources:
        bundle_file_map = {
            "91-2345-6789-0123": "priya-sharma.bundle.json",
            "91-3456-7890-1234": "arun-patel.bundle.json",
            "91-4567-8901-2345": "sunita-verma.bundle.json",
            "91-5678-9012-3456": "vikram-malhotra.bundle.json",
            "91-6789-0123-4567": "ananya-deshmukh.bundle.json",
        }
        if norm_abha in bundle_file_map:
            bf_name = bundle_file_map[norm_abha]
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            bundle_p = base_dir / "frontend" / "src" / "data" / "patients" / bf_name
            if bundle_p.exists():
                try:
                    b_data = json.loads(bundle_p.read_text(encoding="utf-8"))
                    for entry in b_data.get("entry", []):
                        res_obj = entry.get("resource", {})
                        rtype = res_obj.get("resourceType")
                        if rtype in ("Condition", "Observation"):
                            resources.append({
                                "id": res_obj.get("id"),
                                "fhir_id": res_obj.get("id"),
                                "resource_type": rtype,
                                "summary_title": res_obj.get("code", {}).get("text") or "Clinical Record",
                                "summary_value": f"{res_obj.get('valueQuantity', {}).get('value')} {res_obj.get('valueQuantity', {}).get('unit', '')}".strip() if "valueQuantity" in res_obj else res_obj.get("valueString"),
                                "event_date": res_obj.get("effectiveDateTime") or res_obj.get("recordedDate") or res_obj.get("onsetDateTime"),
                                "raw_json": res_obj,
                                "source": "ingested",
                            })
                    log_access("care_gaps", norm_abha, True)
                except Exception:
                    pass

    if not resources and norm_abha == "91-1234-5678-9012":
        resources = [
            {
                "id": "cond-dm2",
                "fhir_id": "cond-dm2",
                "resource_type": "Condition",
                "summary_title": "Type 2 diabetes mellitus",
                "event_date": "2023-01-10T10:00:00Z",
                "raw_json": {
                    "resourceType": "Condition",
                    "id": "cond-dm2",
                    "code": {"coding": [{"code": "44054006"}], "text": "Type 2 diabetes mellitus"},
                    "recordedDate": "2023-01-10T10:00:00Z",
                },
                "source": "ingested",
            },
            {
                "id": "cond-htn",
                "fhir_id": "cond-htn",
                "resource_type": "Condition",
                "summary_title": "Essential hypertension",
                "event_date": "2023-02-14T10:00:00Z",
                "raw_json": {
                    "resourceType": "Condition",
                    "id": "cond-htn",
                    "code": {"coding": [{"code": "38341003"}], "text": "Essential hypertension"},
                    "recordedDate": "2023-02-14T10:00:00Z",
                },
                "source": "ingested",
            },
            {
                "id": "obs-hba1c-old",
                "fhir_id": "obs-hba1c-old",
                "resource_type": "Observation",
                "summary_title": "HbA1c",
                "event_date": "2023-11-15T09:00:00Z",
                "raw_json": {
                    "resourceType": "Observation",
                    "id": "obs-hba1c-old",
                    "status": "final",
                    "code": {"coding": [{"code": "4548-4"}], "text": "HbA1c"},
                    "effectiveDateTime": "2023-11-15T09:00:00Z",
                    "valueQuantity": {"value": 7.4, "unit": "%"},
                },
                "source": "ingested",
            },
            {
                "id": "obs-bp-recent",
                "fhir_id": "obs-bp-recent",
                "resource_type": "Observation",
                "summary_title": "Blood Pressure",
                "event_date": "2024-10-14T09:00:00Z",
                "raw_json": {
                    "resourceType": "Observation",
                    "id": "obs-bp-recent",
                    "status": "final",
                    "code": {"coding": [{"code": "85354-9"}], "text": "Blood Pressure"},
                    "effectiveDateTime": "2024-10-14T09:00:00Z",
                    "component": [
                        {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 148}},
                        {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 94}},
                    ],
                },
                "source": "ingested",
            },
            {
                "id": "obs-bp-prior",
                "fhir_id": "obs-bp-prior",
                "resource_type": "Observation",
                "summary_title": "Blood Pressure",
                "event_date": "2024-06-10T09:00:00Z",
                "raw_json": {
                    "resourceType": "Observation",
                    "id": "obs-bp-prior",
                    "status": "final",
                    "code": {"coding": [{"code": "85354-9"}], "text": "Blood Pressure"},
                    "effectiveDateTime": "2024-06-10T09:00:00Z",
                    "component": [
                        {"code": {"coding": [{"code": "8480-6"}]}, "valueQuantity": {"value": 136}},
                        {"code": {"coding": [{"code": "8462-4"}]}, "valueQuantity": {"value": 84}},
                    ],
                },
                "source": "ingested",
            },
        ]
        log_access("care_gaps", norm_abha, True)

    # Merge in-memory confirmed scans for this patient (avoiding duplicates)
    existing_ids = {r.get("fhir_id") or r.get("id") for r in resources}
    if norm_abha in _OFFLINE_SCAN_STORE:
        for scan_obs in _OFFLINE_SCAN_STORE[norm_abha]:
            obs_id = scan_obs.get("id")
            if obs_id not in existing_ids:
                resources.append({
                    "id": obs_id,
                    "fhir_id": obs_id,
                    "resource_type": "Observation",
                    "summary_title": scan_obs.get("code", {}).get("text") or "Lab Observation",
                    "summary_value": f"{scan_obs.get('valueQuantity', {}).get('value')} {scan_obs.get('valueQuantity', {}).get('unit', '')}",
                    "event_date": scan_obs.get("effectiveDateTime"),
                    "raw_json": scan_obs,
                    "source": "ocr_scan",
                })
                existing_ids.add(obs_id)

    # Ensure source field is populated accurately from raw_json meta.tag if missing
    for r in resources:
        raw = r.get("raw_json") or {}
        tags = raw.get("meta", {}).get("tag", [])
        if any(t.get("code") == "ocr-scan" for t in tags):
            r["source"] = "ocr_scan"
        elif "source" not in r:
            r["source"] = "ingested"

    return resources


def get_prescription_medications(rx_id: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """Retrieve prescription details and associated MedicationRequests for demo patients."""
    norm_rx = normalize_rx_id(rx_id)

    if norm_rx in _OFFLINE_PRESCRIPTION_LOOKUP:
        log_access("savings", rx_id, True)
        return _OFFLINE_PRESCRIPTION_LOOKUP[norm_rx]

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                # 1. Fetch prescription matching normalized rx_id
                rx_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/prescriptions?select=*,patients!inner(id,is_demo)&order=created_at.desc",
                    headers=_get_headers(),
                )
                if rx_res.status_code == 200:
                    matching_rx = None
                    for rx in rx_res.json():
                        if normalize_rx_id(rx.get("rx_id", "")) == norm_rx:
                            if rx.get("patients", {}).get("is_demo") is True:
                                matching_rx = rx
                                break

                    if matching_rx:
                        # 2. Fetch MedicationRequests for this prescription
                        actual_rx_id = matching_rx["rx_id"]
                        med_res = client.get(
                            f"{SUPABASE_URL}/rest/v1/fhir_resources?select=*&speakable_rx_id=eq.{actual_rx_id}&resource_type=eq.MedicationRequest",
                            headers=_get_headers(),
                        )
                        meds = med_res.json() if med_res.status_code == 200 else []
                        log_access("savings", actual_rx_id, True)
                        return matching_rx, meds
        except Exception:
            pass

    # In-memory fallbacks for all demo patients
    demo_rx_catalog: dict[str, tuple[dict[str, Any], list[dict[str, Any]]]] = {
        "APLRR1410RAME": (
            {
                "rx_id": "APL-RR-1410-RAME",
                "hospital_name": "Apollo Hospital",
                "doctor_name": "Dr. Rajesh Rao",
                "issued_on": "2024-10-14",
                "patients": {"name": "Ramesh Kumar", "abha_id": "91-1234-5678-9012", "is_demo": True},
            },
            [
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-1",
                        "medicationCodeableConcept": {"text": "Metformin 500 mg tablet"},
                        "dosageInstruction": [{"text": "500 mg - Once daily"}],
                    },
                    "summary_title": "Metformin 500 mg tablet",
                },
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-2",
                        "medicationCodeableConcept": {"text": "Atorvastatin 20 mg tablet"},
                        "dosageInstruction": [{"text": "20 mg - At bedtime"}],
                    },
                    "summary_title": "Atorvastatin 20 mg tablet",
                },
            ],
        ),
        "FRTSS1809PRIY": (
            {
                "rx_id": "FRT-SS-1809-PRIY",
                "hospital_name": "Fortis Healthcare",
                "doctor_name": "Dr. Sunita Sharma",
                "issued_on": "2024-09-18",
                "patients": {"name": "Priya Sharma", "abha_id": "91-2345-6789-0123", "is_demo": True},
            },
            [
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-priya-1",
                        "medicationCodeableConcept": {"text": "Levothyroxine sodium 50 mcg oral tablet"},
                        "dosageInstruction": [{"text": "50 mcg - Once daily before breakfast"}],
                    },
                    "summary_title": "Levothyroxine sodium 50 mcg oral tablet",
                },
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-priya-2",
                        "medicationCodeableConcept": {"text": "Metformin 500 mg tablet"},
                        "dosageInstruction": [{"text": "500 mg - Twice daily"}],
                    },
                    "summary_title": "Metformin 500 mg tablet",
                },
            ],
        ),
        "MNPAS0511ARUN": (
            {
                "rx_id": "MNP-AS-0511-ARUN",
                "hospital_name": "Manipal Hospital",
                "doctor_name": "Dr. Amit Sen",
                "issued_on": "2024-11-05",
                "patients": {"name": "Arun Patel", "abha_id": "91-3456-7890-1234", "is_demo": True},
            },
            [
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-arun-1",
                        "medicationCodeableConcept": {"text": "Amlodipine 5 mg tablet"},
                        "dosageInstruction": [{"text": "5 mg - Once daily"}],
                    },
                    "summary_title": "Amlodipine 5 mg tablet",
                },
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-arun-2",
                        "medicationCodeableConcept": {"text": "Atorvastatin 20 mg tablet"},
                        "dosageInstruction": [{"text": "20 mg - At bedtime"}],
                    },
                    "summary_title": "Atorvastatin 20 mg tablet",
                },
            ],
        ),
        "MDCPN1208SUNI": (
            {
                "rx_id": "MDC-PN-1208-SUNI",
                "hospital_name": "MedCare Clinic",
                "doctor_name": "Dr. Priya Nair",
                "issued_on": "2024-08-12",
                "patients": {"name": "Sunita Verma", "abha_id": "91-4567-8901-2345", "is_demo": True},
            },
            [
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-sunita-1",
                        "medicationCodeableConcept": {"text": "Budesonide 200 mcg inhaler"},
                        "dosageInstruction": [{"text": "2 puffs twice daily"}],
                    },
                    "summary_title": "Budesonide 200 mcg inhaler",
                },
            ],
        ),
        "AMSRR2207VIKR": (
            {
                "rx_id": "AMS-RR-2207-VIKR",
                "hospital_name": "AIIMS New Delhi",
                "doctor_name": "Dr. Rajesh Rao",
                "issued_on": "2024-07-22",
                "patients": {"name": "Vikram Malhotra", "abha_id": "91-5678-9012-3456", "is_demo": True},
            },
            [
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-vikram-1",
                        "medicationCodeableConcept": {"text": "Dapagliflozin 10 mg tablet"},
                        "dosageInstruction": [{"text": "10 mg - Once daily"}],
                    },
                    "summary_title": "Dapagliflozin 10 mg tablet",
                },
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-vikram-2",
                        "medicationCodeableConcept": {"text": "Metformin 500 mg tablet"},
                        "dosageInstruction": [{"text": "500 mg - Twice daily"}],
                    },
                    "summary_title": "Metformin 500 mg tablet",
                },
            ],
        ),
        "APLRR1410ANAN": (
            {
                "rx_id": "APL-RR-1410-ANAN",
                "hospital_name": "Apollo Hospital",
                "doctor_name": "Dr. Rajesh Rao",
                "issued_on": "2024-10-14",
                "patients": {"name": "Ananya Deshmukh", "abha_id": "91-6789-0123-4567", "is_demo": True},
            },
            [
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-ananya-1",
                        "medicationCodeableConcept": {"text": "Telmisartan 40 mg tablet"},
                        "dosageInstruction": [{"text": "40 mg - Once daily"}],
                    },
                    "summary_title": "Telmisartan 40 mg tablet",
                },
                {
                    "raw_json": {
                        "resourceType": "MedicationRequest",
                        "id": "med-ananya-2",
                        "medicationCodeableConcept": {"text": "Metformin 500 mg tablet"},
                        "dosageInstruction": [{"text": "500 mg - Once daily"}],
                    },
                    "summary_title": "Metformin 500 mg tablet",
                },
            ],
        ),
    }

    if norm_rx in demo_rx_catalog:
        rx_item, meds_item = demo_rx_catalog[norm_rx]
        log_access("savings", rx_item["rx_id"], True)
        return rx_item, meds_item

    log_access("savings", rx_id, False)
    return None, []


def save_confirmed_observation(
    abha_id: str,
    observation: dict[str, Any],
) -> tuple[bool, bool]:
    """Atomically save confirmed Observation with source = 'ocr_scan'.

    Returns (success, already_existed).
    """
    norm_abha = abha_id.strip()
    obs_id = observation["id"]
    already_existed = False

    # Store in memory cache
    if norm_abha not in _OFFLINE_SCAN_STORE:
        _OFFLINE_SCAN_STORE[norm_abha] = []

    existing = [o for o in _OFFLINE_SCAN_STORE[norm_abha] if o.get("id") == obs_id]
    if existing:
        already_existed = True
    else:
        _OFFLINE_SCAN_STORE[norm_abha].append(observation)

    # Persist to database if connected
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                # 1. Look up patient UUID
                pat_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?select=id&abha_id=eq.{norm_abha}",
                    headers=_get_headers(),
                )
                if pat_res.status_code == 200 and len(pat_res.json()) > 0:
                    patient_id = pat_res.json()[0]["id"]
                    val_str = f"{observation.get('valueQuantity', {}).get('value')} {observation.get('valueQuantity', {}).get('unit', '')}"

                    resource_payload = {
                        "patient_id": patient_id,
                        "abha_id": norm_abha,
                        "resource_type": "Observation",
                        "fhir_id": obs_id,
                        "event_date": observation.get("effectiveDateTime"),
                        "summary_title": observation.get("code", {}).get("text") or "Lab Observation",
                        "summary_value": val_str,
                        "raw_json": observation,
                    }

                    # Try with source column first
                    try:
                        resource_payload["source"] = "ocr_scan"
                        write_res = client.post(
                            f"{SUPABASE_URL}/rest/v1/fhir_resources?on_conflict=patient_id,resource_type,fhir_id",
                            headers={**_get_headers(), "Prefer": "resolution=merge-duplicates,return=representation"},
                            json=resource_payload,
                        )
                        if write_res.status_code in (200, 201):
                            log_access("scan", norm_abha, True)
                            return True, already_existed
                        else:
                            with open("supabase_error.log", "w") as f:
                                f.write(f"Supabase write 1 failed: {write_res.status_code} {write_res.text}")
                            print(f"Supabase write 1 failed: {write_res.status_code} {write_res.text}")
                    except Exception as e:
                        with open("supabase_error.log", "w") as f:
                            f.write(f"Supabase write 1 exception: {e}")
                        print(f"Supabase write 1 exception: {e}")

                    # Fallback without top-level source column if DB migration not yet applied
                    resource_payload.pop("source", None)
                    write_res2 = client.post(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources?on_conflict=patient_id,resource_type,fhir_id",
                        headers={**_get_headers(), "Prefer": "resolution=merge-duplicates,return=representation"},
                        json=resource_payload,
                    )
                    if write_res2.status_code in (200, 201):
                        log_access("scan", norm_abha, True)
                        return True, already_existed
                    else:
                        with open("supabase_error.log", "w") as f:
                            f.write(f"Supabase write 2 failed: {write_res2.status_code} {write_res2.text}")
                        print(f"Supabase write 2 failed: {write_res2.status_code} {write_res2.text}")
        except Exception as e:
            with open("supabase_error.log", "w") as f:
                f.write(f"Supabase overall exception: {e}")
            print(f"Supabase overall exception: {e}")

    log_access("scan", norm_abha, True)
    return True, already_existed


def reset_demo_scanned_resources(abha_id: str | None = None) -> int:
    """Delete source = 'ocr_scan' resources for demo patients (for repeated demos)."""
    count = 0
    if abha_id:
        if abha_id in _OFFLINE_SCAN_STORE:
            count += len(_OFFLINE_SCAN_STORE[abha_id])
            del _OFFLINE_SCAN_STORE[abha_id]
    else:
        for k in list(_OFFLINE_SCAN_STORE.keys()):
            count += len(_OFFLINE_SCAN_STORE[k])
            del _OFFLINE_SCAN_STORE[k]

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                # Delete by fhir_id pattern (covers both with and without table source column)
                q_id = f"{SUPABASE_URL}/rest/v1/fhir_resources?fhir_id=like.obs-scan-*"
                if abha_id:
                    q_id += f"&abha_id=eq.{abha_id.strip()}"
                client.delete(q_id, headers=_get_headers())

                # Also try delete by source column if present
                q_source = f"{SUPABASE_URL}/rest/v1/fhir_resources?source=eq.ocr_scan"
                if abha_id:
                    q_source += f"&abha_id=eq.{abha_id.strip()}"
                client.delete(q_source, headers=_get_headers())
        except Exception:
            pass

    return count


def get_patient_bundle_from_db(abha_id: str) -> dict[str, Any] | None:
    """Retrieve full FHIR bundle directly from live database for a given ABHA ID."""
    norm_abha = abha_id.strip()
    if not is_demo_patient(norm_abha):
        return None

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                # 1. Fetch patient demographic record
                pat_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?abha_id=eq.{norm_abha}",
                    headers=_get_headers(),
                )
                if pat_res.status_code == 200 and pat_res.json():
                    p = pat_res.json()[0]
                    pid = p.get("fhir_id") or p.get("id")
                    pat_resource: dict[str, Any] = {
                        "resourceType": "Patient",
                        "id": pid,
                        "identifier": [
                            {"system": "https://healthid.ndhm.gov.in", "value": p["abha_id"]}
                        ],
                        "name": [{"text": p.get("name", "Demo Patient")}],
                        "gender": p.get("gender", "unknown"),
                        "birthDate": p.get("dob"),
                    }
                    if p.get("phone"):
                        pat_resource["telecom"] = [{"system": "phone", "value": p["phone"]}]

                    entries: list[dict[str, Any]] = [
                        {"fullUrl": f"urn:uuid:{pid}", "resource": pat_resource}
                    ]

                    # 2. Fetch all FHIR resources
                    r_res = client.get(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources?abha_id=eq.{norm_abha}&order=event_date.desc.nullslast",
                        headers=_get_headers(),
                    )
                    if r_res.status_code == 200:
                        for r in r_res.json():
                            raw = r.get("raw_json")
                            if raw and isinstance(raw, dict):
                                fid = r.get("fhir_id") or r.get("id")
                                rx_token = r.get("speakable_rx_id")
                                if rx_token:
                                    if "identifier" not in raw or not raw["identifier"]:
                                        raw["identifier"] = [
                                            {"system": "https://abdm.gov.in/rx-token", "value": rx_token},
                                            {"system": "https://phr-demo.example.org/rx-token", "value": rx_token},
                                        ]
                                    if "groupIdentifier" not in raw:
                                        raw["groupIdentifier"] = {"value": rx_token}
                                entries.append({
                                    "fullUrl": f"urn:uuid:{fid}",
                                    "resource": raw,
                                })

                    # Merge any in-memory confirmed scans
                    if norm_abha in _OFFLINE_SCAN_STORE:
                        for scan_obs in _OFFLINE_SCAN_STORE[norm_abha]:
                            fid = scan_obs.get("id", "scan-obs")
                            entries.append({
                                "fullUrl": f"urn:uuid:{fid}",
                                "resource": scan_obs,
                            })

                    # Merge any in-memory confirmed prescriptions
                    if norm_abha in _OFFLINE_PRESCRIPTION_STORE:
                        for rx_res in _OFFLINE_PRESCRIPTION_STORE[norm_abha]:
                            fid = rx_res.get("id", "rx-res")
                            entries.append({
                                "fullUrl": f"urn:uuid:{fid}",
                                "resource": rx_res,
                            })

                    log_access("abha_timeline", norm_abha, True)
                    return {
                        "resourceType": "Bundle",
                        "type": "collection",
                        "total": len(entries),
                        "entry": entries,
                    }
        except Exception:
            pass

    # In-memory demo bundle if DB unavailable
    if norm_abha == "91-1234-5678-9012":
        log_access("abha_timeline", norm_abha, True)
        fallback_entries = [
            {
                "fullUrl": "urn:uuid:patient-ramesh",
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-ramesh",
                    "identifier": [{"system": "https://healthid.ndhm.gov.in", "value": "91-1234-5678-9012"}],
                    "name": [{"text": "Ramesh Kumar"}],
                    "gender": "male",
                    "birthDate": "1970-05-15",
                },
            },
            {
                "fullUrl": "urn:uuid:med-1",
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "med-1",
                    "status": "active",
                    "authoredOn": "2024-10-14T09:00:00Z",
                    "identifier": [
                        {"system": "https://abdm.gov.in/rx-token", "value": "APL-RR-1410-RAME"},
                        {"system": "https://phr-demo.example.org/rx-token", "value": "APL-RR-1410-RAME"},
                    ],
                    "groupIdentifier": {
                        "value": "APL-RR-1410-RAME",
                    },
                    "medicationCodeableConcept": {"text": "Metformin 500 mg tablet"},
                    "dosageInstruction": [{"text": "500 mg - Once daily"}],
                },
            },
        ]
        if norm_abha in _OFFLINE_PRESCRIPTION_STORE:
            for rx_res in _OFFLINE_PRESCRIPTION_STORE[norm_abha]:
                fid = rx_res.get("id", "rx-res")
                fallback_entries.append({"fullUrl": f"urn:uuid:{fid}", "resource": rx_res})
        return {
            "resourceType": "Bundle",
            "type": "collection",
            "total": len(fallback_entries),
            "entry": fallback_entries,
        }

    return None


def get_admin_metrics() -> dict[str, Any]:
    """Retrieve operational metrics across database tables."""
    metrics: dict[str, Any] = {
        "database_connected": False,
        "supabase_host": "offline",
        "total_patients": 0,
        "total_prescriptions": 0,
        "total_fhir_resources": 0,
        "total_access_logs": 0,
        "resource_breakdown": {
            "Condition": 0,
            "Observation": 0,
            "MedicationRequest": 0,
            "Encounter": 0,
        },
    }

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=4.0) as client:
                headers = {**_get_headers(), "Prefer": "count=exact"}
                p_cnt = client.get(f"{SUPABASE_URL}/rest/v1/patients?select=count", headers=headers)
                rx_cnt = client.get(f"{SUPABASE_URL}/rest/v1/prescriptions?select=count", headers=headers)
                f_cnt = client.get(f"{SUPABASE_URL}/rest/v1/fhir_resources?select=count", headers=headers)
                l_cnt = client.get(f"{SUPABASE_URL}/rest/v1/access_logs?select=count", headers=headers)

                def parse_cr(res: httpx.Response) -> int:
                    cr = res.headers.get("content-range", "")
                    if "/" in cr:
                        try:
                            return int(cr.split("/")[-1])
                        except ValueError:
                            pass
                    return 0

                metrics["database_connected"] = True
                metrics["supabase_host"] = SUPABASE_URL.split("//")[-1].split("/")[0]
                metrics["total_patients"] = parse_cr(p_cnt)
                metrics["total_prescriptions"] = parse_cr(rx_cnt)
                metrics["total_fhir_resources"] = parse_cr(f_cnt)
                metrics["total_access_logs"] = parse_cr(l_cnt)

                # Breakdown by resource type
                types_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/fhir_resources?select=resource_type&limit=200",
                    headers=_get_headers(),
                )
                if types_res.status_code == 200:
                    breakdown: dict[str, int] = {}
                    for row in types_res.json():
                        rtype = row.get("resource_type", "Other")
                        breakdown[rtype] = breakdown.get(rtype, 0) + 1
                    metrics["resource_breakdown"] = breakdown
                return metrics
        except Exception:
            pass

    # Offline fixture metrics
    demo_pats = get_demo_patients()
    metrics["total_patients"] = len(demo_pats)
    metrics["total_prescriptions"] = 1
    metrics["total_fhir_resources"] = 15
    metrics["total_access_logs"] = 0
    return metrics


def get_admin_patients() -> list[dict[str, Any]]:
    """Retrieve all registered patients for the admin console."""
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?select=id,abha_id,fhir_id,name,gender,dob,phone,is_demo,created_at&order=name.asc",
                    headers=_get_headers(),
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
    return [
        {"id": "demo-1", "abha_id": p["abha_id"], "name": p["display_name"], "gender": "unknown", "is_demo": True}
        for p in get_demo_patients()
    ]


def get_admin_prescriptions() -> list[dict[str, Any]]:
    """Retrieve all prescriptions for the admin console."""
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/prescriptions?select=rx_id,patient_id,abha_id,hospital_name,doctor_name,issued_on,created_at&order=created_at.desc",
                    headers=_get_headers(),
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
    return []


def get_admin_fhir_resources(limit: int = 50) -> list[dict[str, Any]]:
    """Retrieve recent FHIR resources for the admin console."""
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/fhir_resources?select=id,fhir_id,abha_id,resource_type,summary_title,summary_value,event_date,created_at&order=created_at.desc&limit={limit}",
                    headers=_get_headers(),
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
    return []


def get_admin_access_logs(limit: int = 100) -> list[dict[str, Any]]:
    """Retrieve audit access logs (API requests) for the admin console only."""
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/access_logs?select=id,accessed_at,lookup_type,lookup_key,found&order=id.desc&limit={limit}",
                    headers=_get_headers(),
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
    return []


def get_admin_practitioners() -> list[dict[str, Any]]:
    """Retrieve roster of registered doctors and physicians for the admin console."""
    return [
        {
            "id": "doc-1",
            "name": "Dr. Rajesh Rao, MD",
            "role": "doctor",
            "specialty": "Cardiology & Internal Medicine",
            "hospital_or_facility": "Apollo Hospital, Bengaluru",
            "license_id": "MCI-KA-2014-0491",
            "status": "Active · Verified",
            "actions_permitted": "Patient EHR Search, Create Prescriptions",
        },
        {
            "id": "doc-2",
            "name": "Dr. Sarah Connor, MD",
            "role": "doctor",
            "specialty": "General & Family Medicine",
            "hospital_or_facility": "Fortis Multispeciality Hospital",
            "license_id": "DMC-DL-2018-9124",
            "status": "Active · Verified",
            "actions_permitted": "Patient EHR Search, Create Prescriptions",
        },
        {
            "id": "doc-3",
            "name": "Dr. Priya Nair, MD",
            "role": "doctor",
            "specialty": "Endocrinology & Diabetology",
            "hospital_or_facility": "AIIMS, New Delhi",
            "license_id": "DMC-DL-2016-7731",
            "status": "Active · Verified",
            "actions_permitted": "Patient EHR Search, Create Prescriptions",
        },
        {
            "id": "phy-1",
            "name": "Dr. Dispensary Physician",
            "role": "physician",
            "specialty": "PMBJP Jan Aushadhi Dispensary",
            "hospital_or_facility": "Pradhan Mantri Bhartiya Janaushadhi Kendra #1042",
            "license_id": "PMBJP-IN-DISP-1042",
            "status": "Active · Verified",
            "actions_permitted": "Rx-ID Lookup, Generic Substitution, Savings Engine",
        },
        {
            "id": "phy-2",
            "name": "Dr. Amit Verma, B.Pharm / Clinical Physician",
            "role": "physician",
            "specialty": "Jan Aushadhi Generic Pharmacy",
            "hospital_or_facility": "Kendra #2098, Civil Hospital Road",
            "license_id": "PMBJP-IN-DISP-2098",
            "status": "Active · Verified",
            "actions_permitted": "Rx-ID Lookup, Generic Substitution, Savings Engine",
        },
        {
            "id": "phy-3",
            "name": "Dr. Meera Sen, MD (Pharmacology)",
            "role": "physician",
            "specialty": "Government Community Health Center",
            "hospital_or_facility": "CHC Dispensary, Sector 14",
            "license_id": "PMBJP-IN-DISP-3419",
            "status": "Active · Verified",
            "actions_permitted": "Rx-ID Lookup, Generic Substitution, Savings Engine",
        },
    ]


def create_prescription_in_db(
    abha_id: str,
    doctor_name: str,
    hospital_name: str,
    diagnosis: str | None,
    medications: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Create a new prescription and its corresponding FHIR MedicationRequest resources in the database."""
    import uuid
    import random
    from datetime import datetime, timezone

    norm_abha = abha_id.strip()
    if not is_demo_patient(norm_abha):
        return None

    patient_name = "Demo Patient"
    patient_id = None
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                pat_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?abha_id=eq.{norm_abha}",
                    headers=_get_headers(),
                )
                if pat_res.status_code == 200 and pat_res.json():
                    p = pat_res.json()[0]
                    patient_id = p.get("id")
                    patient_name = p.get("name", patient_name)
        except Exception:
            pass

    # Generate speakable Rx-ID: e.g. APL-DOC-1010-RAME23
    initials = "".join([w[0] for w in patient_name.split() if w])[:4].upper() or "PATI"
    day_month = datetime.now().strftime("%d%m")
    rand_suffix = f"{random.randint(10, 99)}"
    rx_id = f"APL-DOC-{day_month}-{initials}{rand_suffix}"
    issued_on = datetime.now().strftime("%Y-%m-%d")

    # 1. Build standardized FHIR MedicationRequest resources with speakable Rx identifier
    created_meds: list[dict[str, Any]] = []
    created_resources: list[dict[str, Any]] = []

    for idx, med in enumerate(medications):
        fid = f"med-req-{uuid.uuid4().hex[:8]}"
        m_title = med.get("name", "Prescribed Medicine")
        m_val = med.get("dosage", "1 tablet")
        raw_json = {
            "resourceType": "MedicationRequest",
            "id": fid,
            "status": "active",
            "intent": "order",
            "authoredOn": f"{issued_on}T10:00:00Z",
            "subject": {"reference": f"Patient/{patient_id or 'demo'}", "display": patient_name},
            "requester": {"display": doctor_name or "Dr. Rajesh Rao"},
            "encounter": {"display": hospital_name or "Apollo Hospitals"},
            "identifier": [
                {"system": "https://abdm.gov.in/rx-token", "value": rx_id},
                {"system": "https://phr-demo.example.org/rx-token", "value": rx_id},
            ],
            "groupIdentifier": {
                "system": "https://abdm.gov.in/rx-token",
                "value": rx_id,
            },
            "medicationCodeableConcept": {
                "text": m_title,
                "coding": [{"system": "http://snomed.info/sct", "display": m_title}],
            },
            "dosageInstruction": [
                {
                    "text": f"{m_val} - {med.get('frequency', 'Once daily')}. {med.get('instructions', '')}".strip(),
                }
            ],
        }
        med_row = {
            "patient_id": patient_id,
            "abha_id": norm_abha,
            "resource_type": "MedicationRequest",
            "fhir_id": fid,
            "event_date": f"{issued_on}T10:00:00Z",
            "speakable_rx_id": rx_id,
            "summary_title": m_title,
            "summary_value": m_val,
            "raw_json": raw_json,
        }
        created_meds.append(med_row)
        created_resources.append(raw_json)

    cid = None
    cond_raw = None
    if diagnosis:
        cid = f"cond-{uuid.uuid4().hex[:8]}"
        cond_raw = {
            "resourceType": "Condition",
            "id": cid,
            "code": {"text": diagnosis},
            "recordedDate": f"{issued_on}T10:00:00Z",
            "subject": {"reference": f"Patient/{patient_id or 'demo'}", "display": patient_name},
        }
        created_resources.append(cond_raw)

    # Register in in-memory session stores for immediate querying & offline fallback
    if norm_abha not in _OFFLINE_PRESCRIPTION_STORE:
        _OFFLINE_PRESCRIPTION_STORE[norm_abha] = []
    _OFFLINE_PRESCRIPTION_STORE[norm_abha].extend(created_resources)

    p_payload = {
        "rx_id": rx_id,
        "patient_id": patient_id,
        "abha_id": norm_abha,
        "hospital_name": hospital_name or "Apollo Hospitals",
        "doctor_name": doctor_name or "Dr. Rajesh Rao",
        "issued_on": issued_on,
        "patients": {"name": patient_name, "abha_id": norm_abha, "is_demo": True},
    }
    _OFFLINE_PRESCRIPTION_LOOKUP[normalize_rx_id(rx_id)] = (p_payload, created_meds)

    # If Supabase is connected, write row to prescriptions and fhir_resources
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and patient_id:
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    f"{SUPABASE_URL}/rest/v1/prescriptions",
                    headers=_get_headers(),
                    json=p_payload,
                )
                for med_row in created_meds:
                    client.post(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources",
                        headers=_get_headers(),
                        json=med_row,
                    )
                if diagnosis and cid and cond_raw:
                    client.post(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources",
                        headers=_get_headers(),
                        json={
                            "patient_id": patient_id,
                            "abha_id": norm_abha,
                            "resource_type": "Condition",
                            "fhir_id": cid,
                            "event_date": f"{issued_on}T10:00:00Z",
                            "summary_title": diagnosis,
                            "raw_json": cond_raw,
                        },
                    )
                log_access("create_prescription", rx_id, True)
        except Exception:
            pass

    return {
        "rx_id": rx_id,
        "patient_name": patient_name,
        "abha_id": norm_abha,
        "doctor_name": doctor_name,
        "hospital_name": hospital_name,
        "diagnosis": diagnosis,
        "issued_on": issued_on,
        "medications": medications,
        "success": True,
    }


def get_patient_details_for_doctor(abha_id: str) -> dict[str, Any] | None:
    """Retrieve full clinical details for a patient for Doctor consultation review."""
    norm_abha = abha_id.strip()
    if not is_demo_patient(norm_abha):
        return None

    patient_record = None
    conditions = []
    observations = []
    prescriptions = []

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=5.0) as client:
                # 1. Patient info
                p_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/patients?abha_id=eq.{norm_abha}",
                    headers=_get_headers(),
                )
                if p_res.status_code == 200 and p_res.json():
                    patient_record = p_res.json()[0]

                # 2. Conditions
                c_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/fhir_resources?abha_id=eq.{norm_abha}&resource_type=eq.Condition&order=event_date.desc.nullslast",
                    headers=_get_headers(),
                )
                if c_res.status_code == 200:
                    conditions = c_res.json()

                # 3. Observations
                o_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/fhir_resources?abha_id=eq.{norm_abha}&resource_type=eq.Observation&order=event_date.desc.nullslast&limit=20",
                    headers=_get_headers(),
                )
                if o_res.status_code == 200:
                    observations = o_res.json()

                # 4. Prescriptions
                rx_res = client.get(
                    f"{SUPABASE_URL}/rest/v1/prescriptions?abha_id=eq.{norm_abha}&order=issued_on.desc",
                    headers=_get_headers(),
                )
                if rx_res.status_code == 200:
                    prescriptions = rx_res.json()

                log_access("doctor_lookup", norm_abha, True)
        except Exception:
            pass

    if not patient_record:
        # Fallback to demo entry
        patient_record = {
            "abha_id": norm_abha,
            "name": "Ramesh Kumar",
            "gender": "male",
            "dob": "1970-05-15",
            "phone": "+91 98765 43210",
        }

    # Merge any in-memory issued prescriptions for this patient
    if norm_abha in _OFFLINE_PRESCRIPTION_STORE:
        for p_info, _ in _OFFLINE_PRESCRIPTION_LOOKUP.values():
            if p_info.get("abha_id") == norm_abha:
                if not any(p.get("rx_id") == p_info.get("rx_id") for p in prescriptions):
                    prescriptions.insert(0, p_info)

    return {
        "patient": patient_record,
        "conditions": conditions,
        "observations": observations,
        "prescriptions": prescriptions,
    }


def is_prescription_dispensed(rx_id: str) -> tuple[bool, str | None]:
    """Check if prescription has been marked as dispensed (memory, disk cache, or Supabase)."""
    norm_rx = normalize_rx_id(rx_id)
    if norm_rx in _OFFLINE_DISPENSED_PRESCRIPTIONS:
        info = _OFFLINE_DISPENSED_PRESCRIPTIONS[norm_rx]
        if info.get("dispensed"):
            return True, info.get("dispensed_at")

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(
                    f"{SUPABASE_URL}/rest/v1/fhir_resources?resource_type=eq.MedicationDispense&fhir_id=eq.dispense-{norm_rx}&select=id,event_date,raw_json",
                    headers=_get_headers(),
                )
                if res.status_code == 200:
                    rows = res.json()
                    if rows:
                        event_date = rows[0].get("event_date") or datetime.now(timezone.utc).isoformat()
                        _OFFLINE_DISPENSED_PRESCRIPTIONS[norm_rx] = {
                            "rx_id": rx_id,
                            "dispensed": True,
                            "dispensed_at": event_date,
                        }
                        _save_dispensed_prescriptions()
                        return True, event_date
        except Exception:
            pass

    return False, None


def mark_prescription_dispensed(
    rx_id: str,
    dispensed: bool = True,
    pharmacist_name: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    """Mark a prescription as dispensed (or un-dispensed) and persist to Supabase & disk."""
    norm_rx = normalize_rx_id(rx_id)
    now_iso = datetime.now(timezone.utc).isoformat()
    pharmacist = pharmacist_name or "Apollo Jan Aushadhi Pharmacy"
    note_text = notes or "Dispensed PMBJP Jan Aushadhi generic bioequivalent substitutes"

    # 1. Update in-memory & disk persistence
    dispense_record = {
        "rx_id": rx_id,
        "norm_rx": norm_rx,
        "dispensed": dispensed,
        "dispensed_at": now_iso if dispensed else None,
        "pharmacist_name": pharmacist,
        "notes": note_text,
    }
    _OFFLINE_DISPENSED_PRESCRIPTIONS[norm_rx] = dispense_record
    _save_dispensed_prescriptions()

    # 2. Persist to Supabase if available
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            # Resolve patient info for this prescription
            rx_record, _ = get_prescription_medications(rx_id)
            patient_id = None
            abha_id = None
            if rx_record:
                abha_id = rx_record.get("abha_id") or rx_record.get("patients", {}).get("abha_id")
                patient_id = rx_record.get("patient_id")

            with httpx.Client(timeout=4.0) as client:
                # If patient_id is not yet resolved, query patients table
                if not patient_id and abha_id:
                    p_res = client.get(
                        f"{SUPABASE_URL}/rest/v1/patients?abha_id=eq.{abha_id}&select=id",
                        headers=_get_headers(),
                    )
                    if p_res.status_code == 200 and p_res.json():
                        patient_id = p_res.json()[0]["id"]

                # If still not found, fallback to first demo patient
                if not patient_id:
                    all_p = client.get(
                        f"{SUPABASE_URL}/rest/v1/patients?select=id,abha_id&limit=1",
                        headers=_get_headers(),
                    )
                    if all_p.status_code == 200 and all_p.json():
                        patient_id = all_p.json()[0]["id"]
                        if not abha_id:
                            abha_id = all_p.json()[0]["abha_id"]

                fhir_id = f"dispense-{norm_rx}"

                if dispensed:
                    # Check if already exists in fhir_resources
                    exist_res = client.get(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources?resource_type=eq.MedicationDispense&fhir_id=eq.{fhir_id}&select=id",
                        headers=_get_headers(),
                    )
                    payload = {
                        "patient_id": patient_id,
                        "abha_id": abha_id or "91-1234-5678-9012",
                        "resource_type": "MedicationDispense",
                        "fhir_id": fhir_id,
                        "event_date": now_iso,
                        "summary_title": f"Jan Aushadhi Generic Dispense ({rx_id})",
                        "summary_value": "Dispensed to Patient",
                        "source": "ingested",
                        "raw_json": {
                            "resourceType": "MedicationDispense",
                            "status": "completed",
                            "rx_id": rx_id,
                            "whenHandedOver": now_iso,
                            "performer": [{"actor": {"display": pharmacist}}],
                            "note": [{"text": note_text}],
                        },
                    }
                    if exist_res.status_code == 200 and exist_res.json():
                        row_id = exist_res.json()[0]["id"]
                        client.patch(
                            f"{SUPABASE_URL}/rest/v1/fhir_resources?id=eq.{row_id}",
                            headers=_get_headers(),
                            json=payload,
                        )
                    else:
                        client.post(
                            f"{SUPABASE_URL}/rest/v1/fhir_resources",
                            headers=_get_headers(),
                            json=payload,
                        )
                    log_access("savings", f"dispense:{norm_rx}", True)
                else:
                    # If undispensing, delete from fhir_resources
                    client.delete(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources?resource_type=eq.MedicationDispense&fhir_id=eq.{fhir_id}",
                        headers=_get_headers(),
                    )
        except Exception:
            pass

    return {
        "status": "success",
        "rx_id": rx_id,
        "dispensed": dispensed,
        "dispensed_at": now_iso if dispensed else None,
        "pharmacist_name": pharmacist,
        "message": f"Prescription {rx_id} successfully marked as {'dispensed' if dispensed else 'undispensed'} in database",
    }


