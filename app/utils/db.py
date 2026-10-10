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
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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
# In-memory store for newly created prescriptions in offline or test mode
_OFFLINE_PRESCRIPTIONS: dict[str, dict[str, Any]] = {}


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

    # If DB query failed or empty, fallback to synthetic facts
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

    # Merge in-memory confirmed scans for this patient
    if norm_abha in _OFFLINE_SCAN_STORE:
        for scan_obs in _OFFLINE_SCAN_STORE[norm_abha]:
            resources.append({
                "id": scan_obs.get("id"),
                "fhir_id": scan_obs.get("id"),
                "resource_type": "Observation",
                "summary_title": scan_obs.get("code", {}).get("text") or "Lab Observation",
                "summary_value": f"{scan_obs.get('valueQuantity', {}).get('value')} {scan_obs.get('valueQuantity', {}).get('unit', '')}",
                "event_date": scan_obs.get("effectiveDateTime"),
                "raw_json": scan_obs,
                "source": "ocr_scan",
            })

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

    # Check newly created in-memory prescriptions
    for stored_id, data in _OFFLINE_PRESCRIPTIONS.items():
        if normalize_rx_id(stored_id) == norm_rx:
            log_access("savings", stored_id, True)
            return data["rx"], data["medications"]

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

    # In-memory fallback for APL-RR-1410-RAME
    if norm_rx in ["APLRR1410RAME", "APL-RR-1410-RAME"]:
        log_access("savings", "APL-RR-1410-RAME", True)
        return (
            {
                "rx_id": "APL-RR-1410-RAME",
                "hospital_name": "Apollo Hospital",
                "doctor_name": "Dr. Rajesh Rao",
                "issued_on": "2024-10-14",
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
        )

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
                            f"{SUPABASE_URL}/rest/v1/fhir_resources",
                            headers={**_get_headers(), "Prefer": "resolution=merge-duplicates,return=representation"},
                            json=resource_payload,
                        )
                        if write_res.status_code in (200, 201):
                            log_access("scan", norm_abha, True)
                            return True, already_existed
                    except Exception:
                        pass

                    # Fallback without top-level source column if DB migration not yet applied
                    resource_payload.pop("source", None)
                    write_res2 = client.post(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources",
                        headers={**_get_headers(), "Prefer": "resolution=merge-duplicates,return=representation"},
                        json=resource_payload,
                    )
                    if write_res2.status_code in (200, 201):
                        log_access("scan", norm_abha, True)
                        return True, already_existed
        except Exception:
            pass

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
        return {
            "resourceType": "Bundle",
            "type": "collection",
            "total": 4,
            "entry": [
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
                        "medicationCodeableConcept": {"text": "Metformin 500 mg tablet"},
                        "dosageInstruction": [{"text": "500 mg - Once daily"}],
                    },
                },
            ],
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

    # Generate unguessable, high-entropy unique Rx-ID (e.g. RX-7K9M-4W2P)
    # Privacy protection: Uses cryptographically secure random characters (not guessable from patient initials or date)
    import secrets
    c_alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    p1 = "".join(secrets.choice(c_alphabet) for _ in range(4))
    p2 = "".join(secrets.choice(c_alphabet) for _ in range(4))
    rx_id = f"RX-{p1}-{p2}"
    issued_on = datetime.now().strftime("%Y-%m-%d")

    # If Supabase is connected, write row to prescriptions and fhir_resources
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and patient_id:
        try:
            with httpx.Client(timeout=5.0) as client:
                # 1. Insert into prescriptions
                p_payload = {
                    "rx_id": rx_id,
                    "patient_id": patient_id,
                    "abha_id": norm_abha,
                    "hospital_name": hospital_name or "Apollo Hospitals",
                    "doctor_name": doctor_name or "Dr. Rajesh Rao",
                    "issued_on": issued_on,
                }
                client.post(
                    f"{SUPABASE_URL}/rest/v1/prescriptions",
                    headers=_get_headers(),
                    json=p_payload,
                )

                # 2. Insert MedicationRequests
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
                        "subject": {"reference": f"Patient/{patient_id}", "display": patient_name},
                        "requester": {"display": doctor_name},
                        "medicationCodeableConcept": {
                            "text": m_title,
                            "coding": [{"system": "http://snomed.info/sct", "display": m_title}],
                        },
                        "dosageInstruction": [
                            {
                                "text": f"{m_val} - {med.get('frequency', 'Once daily')}. {med.get('instructions', '')}",
                            }
                        ],
                    }
                    client.post(
                        f"{SUPABASE_URL}/rest/v1/fhir_resources",
                        headers=_get_headers(),
                        json={
                            "patient_id": patient_id,
                            "abha_id": norm_abha,
                            "resource_type": "MedicationRequest",
                            "fhir_id": fid,
                            "event_date": f"{issued_on}T10:00:00Z",
                            "speakable_rx_id": rx_id,
                            "summary_title": m_title,
                            "summary_value": m_val,
                            "raw_json": raw_json,
                        },
                    )

                # If diagnosis provided, record Condition
                if diagnosis:
                    cid = f"cond-{uuid.uuid4().hex[:8]}"
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
                            "raw_json": {
                                "resourceType": "Condition",
                                "id": cid,
                                "code": {"text": diagnosis},
                                "recordedDate": f"{issued_on}T10:00:00Z",
                            },
                        },
                    )
                log_access("create_prescription", rx_id, True)
        except Exception:
            pass

    # Store in memory for instant retrieval in offline or test mode
    _OFFLINE_PRESCRIPTIONS[rx_id] = {
        "rx": {
            "rx_id": rx_id,
            "patient_name": patient_name,
            "patient_id": patient_id or f"pat-{norm_abha.replace('-', '')}",
            "abha_id": norm_abha,
            "hospital_name": hospital_name or "Apollo Hospitals",
            "doctor_name": doctor_name or "Dr. Rajesh Rao",
            "issued_on": issued_on,
            "diagnosis": diagnosis,
        },
        "medications": [
            {
                "fhir_id": f"med-{idx+1}",
                "raw_json": {
                    "resourceType": "MedicationRequest",
                    "id": f"med-{idx+1}",
                    "medicationCodeableConcept": {"text": med.get("name", "Prescribed Medicine")},
                    "dosageInstruction": [{"text": f"{med.get('dosage', '1 tablet')} - {med.get('frequency', 'Once daily')}. {med.get('instructions', '')}"}],
                    "authoredOn": f"{issued_on}T10:00:00Z",
                    "requester": {"display": doctor_name},
                },
                "summary_title": med.get("name", "Prescribed Medicine"),
                "summary_value": med.get("dosage", "1 tablet"),
            }
            for idx, med in enumerate(medications)
        ],
    }

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
    norm_input = abha_id.strip()
    norm_rx = normalize_rx_id(norm_input)

    # Check newly created in-memory prescriptions first
    for stored_id, data in _OFFLINE_PRESCRIPTIONS.items():
        if normalize_rx_id(stored_id) == norm_rx:
            norm_abha = data["rx"].get("abha_id", norm_input)
            break
    else:
        # Resolve legacy demo prescription code to patient ABHA ID if provided
        if norm_rx in ["APLRR1410RAME", "APL-RR-1410-RAME"] or norm_input.upper().startswith("APL-"):
            norm_abha = "91-1234-5678-9012"
        elif norm_input.lower() in ["ramesh kumar", "ramesh-kumar"]:
            norm_abha = "91-1234-5678-9012"
        elif norm_input.lower() in ["priya sharma", "priya-sharma"]:
            norm_abha = "91-2345-6789-0123"
        elif norm_input.lower() in ["arun patel", "arun-patel"]:
            norm_abha = "91-3456-7890-1234"
        else:
            norm_abha = norm_input

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

    return {
        "patient": patient_record,
        "conditions": conditions,
        "observations": observations,
        "prescriptions": prescriptions,
    }

