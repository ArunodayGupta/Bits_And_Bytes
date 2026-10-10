"""scripts/seed_rich_clinical_data.py
Inserts realistic, clinically coherent longitudinal data into Supabase
for all demo patients (vitals, conditions, consultations, prescriptions, and generic alternatives).
"""

import os
import uuid
import datetime
import httpx
from app.utils.db import SUPABASE_URL, _get_headers

headers = {**_get_headers(), "Prefer": "return=representation"}

with httpx.Client(timeout=10.0) as client:
    pats = client.get(f"{SUPABASE_URL}/rest/v1/patients?select=id,name,abha_id", headers=headers).json()
    pat_map = {p["name"]: p for p in pats}
    print(f"Found {len(pat_map)} registered patients in Supabase.")

    # High-quality clinical datasets to add
    clinical_datasets = [
        # 1. Kavita Sharma: Diabetes & Hypothyroidism care journey
        {
            "patient_name": "Kavita Sharma",
            "hospital": "Max Super Speciality Hospital, New Delhi",
            "doctor": "Dr. Sunita Sharma, MD (Diabetology)",
            "issued_on": "2024-11-15",
            "rx_id": "MAX-SS-1511-KAVI",
            "diagnosis": "Type 2 Diabetes Mellitus with Primary Hypothyroidism",
            "condition": {
                "fhir_id": "cond-kavita-hypothyroid",
                "code": "40930008",
                "display": "Primary Hypothyroidism",
                "category": "problem-list-item",
                "clinicalStatus": "active"
            },
            "observations": [
                {
                    "fhir_id": "obs-kavita-tsh-2024",
                    "code": "11580-8",
                    "display": "Thyroid Stimulating Hormone (TSH)",
                    "value": "5.4 mIU/L",
                    "date": "2024-11-14T09:30:00+05:30"
                },
                {
                    "fhir_id": "obs-kavita-hba1c-2024",
                    "code": "4548-4",
                    "display": "Hemoglobin A1c (HbA1c)",
                    "value": "7.3 %",
                    "date": "2024-11-14T09:30:00+05:30"
                }
            ],
            "medications": [
                {
                    "name": "Levothyroxine 50 mcg oral tablet",
                    "dosage": "50 mcg",
                    "frequency": "Once daily on empty stomach",
                    "duration_days": 90,
                    "instructions": "Take 30 minutes before breakfast with water"
                },
                {
                    "name": "Metformin 500 mg oral tablet",
                    "dosage": "500 mg",
                    "frequency": "Twice daily after meals",
                    "duration_days": 90,
                    "instructions": "Take after meals"
                }
            ]
        },
        # 2. Suresh Patil: Cardiology follow-up & Hypertension
        {
            "patient_name": "Suresh Patil",
            "hospital": "Ruby Hall Clinic, Pune",
            "doctor": "Dr. Anita Deshmukh, MD (Cardiology)",
            "issued_on": "2024-11-20",
            "rx_id": "RHC-AD-2011-SURE",
            "diagnosis": "Essential Hypertension & Dyslipidemia",
            "condition": {
                "fhir_id": "cond-suresh-dyslipidemia",
                "code": "13644009",
                "display": "Hypercholesterolemia (Dyslipidemia)",
                "category": "problem-list-item",
                "clinicalStatus": "active"
            },
            "observations": [
                {
                    "fhir_id": "obs-suresh-bp-nov",
                    "code": "85354-9",
                    "display": "Blood Pressure Panel",
                    "value": "132/84 mm[Hg]",
                    "date": "2024-11-20T10:15:00+05:30"
                },
                {
                    "fhir_id": "obs-suresh-ldl-nov",
                    "code": "13457-7",
                    "display": "Low Density Lipoprotein (LDL) Cholesterol",
                    "value": "138 mg/dL",
                    "date": "2024-11-19T08:45:00+05:30"
                }
            ],
            "medications": [
                {
                    "name": "Telmisartan 40 mg oral tablet",
                    "dosage": "40 mg",
                    "frequency": "Once daily in the morning",
                    "duration_days": 60,
                    "instructions": "Take after breakfast"
                },
                {
                    "name": "Atorvastatin 10 mg oral tablet",
                    "dosage": "10 mg",
                    "frequency": "Once daily at bedtime",
                    "duration_days": 60,
                    "instructions": "Take at night before sleep"
                }
            ]
        },
        # 3. Deepak Joshi: Gastrointestinal & Hypertension
        {
            "patient_name": "Deepak Joshi",
            "hospital": "Fortis Hospital, Bengaluru",
            "doctor": "Dr. Rajesh Rao, MD (Internal Medicine)",
            "issued_on": "2024-12-05",
            "rx_id": "FRT-RR-0512-DEEP",
            "diagnosis": "GERD with Mild Hypertension",
            "condition": {
                "fhir_id": "cond-deepak-gerd",
                "code": "235595009",
                "display": "Gastroesophageal Reflux Disease (GERD)",
                "category": "problem-list-item",
                "clinicalStatus": "active"
            },
            "observations": [
                {
                    "fhir_id": "obs-deepak-bp-dec",
                    "code": "85354-9",
                    "display": "Blood Pressure Panel",
                    "value": "136/86 mm[Hg]",
                    "date": "2024-12-05T11:00:00+05:30"
                }
            ],
            "medications": [
                {
                    "name": "Pantoprazole 40 mg oral tablet",
                    "dosage": "40 mg",
                    "frequency": "Once daily before breakfast",
                    "duration_days": 30,
                    "instructions": "Take 20 minutes before morning meal"
                },
                {
                    "name": "Amlodipine 5 mg oral tablet",
                    "dosage": "5 mg",
                    "frequency": "Once daily",
                    "duration_days": 30,
                    "instructions": "Take once daily"
                }
            ]
        },
        # 4. Pooja Nair: Endocrine & Metabolic health
        {
            "patient_name": "Pooja Nair",
            "hospital": "Aster Medcity, Kochi",
            "doctor": "Dr. Elizabeth Mathew, MD (Internal Medicine)",
            "issued_on": "2024-12-10",
            "rx_id": "AST-EM-1012-POOJ",
            "diagnosis": "Type 2 Diabetes Mellitus - Early Stage",
            "condition": {
                "fhir_id": "cond-pooja-t2d",
                "code": "44054006",
                "display": "Type 2 Diabetes Mellitus",
                "category": "problem-list-item",
                "clinicalStatus": "active"
            },
            "observations": [
                {
                    "fhir_id": "obs-pooja-fbs-dec",
                    "code": "1558-6",
                    "display": "Fasting Blood Glucose",
                    "value": "128 mg/dL",
                    "date": "2024-12-09T08:30:00+05:30"
                },
                {
                    "fhir_id": "obs-pooja-hba1c-dec",
                    "code": "4548-4",
                    "display": "Hemoglobin A1c (HbA1c)",
                    "value": "6.9 %",
                    "date": "2024-12-09T08:30:00+05:30"
                }
            ],
            "medications": [
                {
                    "name": "Metformin 500 mg oral tablet",
                    "dosage": "500 mg",
                    "frequency": "Once daily with dinner",
                    "duration_days": 60,
                    "instructions": "Take with evening meal"
                }
            ]
        },
        # 5. Harish Chandra: Cardiology checkup
        {
            "patient_name": "Harish Chandra",
            "hospital": "Sir Ganga Ram Hospital, New Delhi",
            "doctor": "Dr. Rajesh Rao, MD (Cardiology)",
            "issued_on": "2024-12-18",
            "rx_id": "SGR-RR-1812-HARI",
            "diagnosis": "Coronary Artery Disease & Dyslipidemia",
            "condition": {
                "fhir_id": "cond-harish-cad",
                "code": "414545008",
                "display": "Ischemic Heart Disease",
                "category": "problem-list-item",
                "clinicalStatus": "active"
            },
            "observations": [
                {
                    "fhir_id": "obs-harish-bp-dec",
                    "code": "85354-9",
                    "display": "Blood Pressure Panel",
                    "value": "126/80 mm[Hg]",
                    "date": "2024-12-18T10:00:00+05:30"
                },
                {
                    "fhir_id": "obs-harish-chol-dec",
                    "code": "2093-3",
                    "display": "Total Cholesterol",
                    "value": "195 mg/dL",
                    "date": "2024-12-17T09:00:00+05:30"
                }
            ],
            "medications": [
                {
                    "name": "Atorvastatin 10 mg oral tablet",
                    "dosage": "10 mg",
                    "frequency": "Once daily at night",
                    "duration_days": 90,
                    "instructions": "Take at night"
                },
                {
                    "name": "Telmisartan 40 mg oral tablet",
                    "dosage": "40 mg",
                    "frequency": "Once daily",
                    "duration_days": 90,
                    "instructions": "Take in morning"
                }
            ]
        }
    ]

    for item in clinical_datasets:
        pat = pat_map.get(item["patient_name"])
        if not pat:
            print(f"Skipping {item['patient_name']} (not found in DB)")
            continue

        p_id = pat["id"]
        abha = pat["abha_id"]
        rx_id = item["rx_id"]

        # 1. Insert Prescription
        rx_payload = {
            "rx_id": rx_id,
            "patient_id": p_id,
            "abha_id": abha,
            "hospital_name": item["hospital"],
            "doctor_name": item["doctor"],
            "issued_on": item["issued_on"],
        }
        rx_res = client.post(f"{SUPABASE_URL}/rest/v1/prescriptions", json=rx_payload, headers=headers)
        if rx_res.status_code in (200, 201):
            print(f"  + Added Prescription {rx_id} for {item['patient_name']}")
        else:
            print(f"  * Prescription {rx_id} status: {rx_res.status_code}")

        # 2. Insert Condition
        cond = item.get("condition")
        if cond:
            cond_payload = {
                "patient_id": p_id,
                "abha_id": abha,
                "resource_type": "Condition",
                "fhir_id": cond["fhir_id"],
                "event_date": f"{item['issued_on']}T10:00:00Z",
                "summary_title": cond["display"],
                "summary_value": cond["clinicalStatus"],
                "source": "ingested",
                "raw_json": {
                    "resourceType": "Condition",
                    "id": cond["fhir_id"],
                    "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": cond["clinicalStatus"]}]},
                    "code": {"text": cond["display"], "coding": [{"system": "http://snomed.info/sct", "code": cond["code"], "display": cond["display"]}]},
                    "subject": {"reference": f"Patient/{p_id}", "display": item["patient_name"]}
                }
            }
            client.post(f"{SUPABASE_URL}/rest/v1/fhir_resources", json=cond_payload, headers=headers)

        # 3. Insert Observations
        for obs in item.get("observations", []):
            obs_payload = {
                "patient_id": p_id,
                "abha_id": abha,
                "resource_type": "Observation",
                "fhir_id": obs["fhir_id"],
                "event_date": obs["date"],
                "summary_title": obs["display"],
                "summary_value": obs["value"],
                "source": "ingested",
                "raw_json": {
                    "resourceType": "Observation",
                    "id": obs["fhir_id"],
                    "status": "final",
                    "code": {"text": obs["display"], "coding": [{"system": "http://loinc.org", "code": obs["code"], "display": obs["display"]}]},
                    "valueString": obs["value"],
                    "effectiveDateTime": obs["date"],
                    "subject": {"reference": f"Patient/{p_id}", "display": item["patient_name"]}
                }
            }
            client.post(f"{SUPABASE_URL}/rest/v1/fhir_resources", json=obs_payload, headers=headers)

        # 4. Insert MedicationRequests
        for idx, med in enumerate(item.get("medications", [])):
            med_fid = f"medreq-{rx_id.lower()}-{idx+1}"
            med_payload = {
                "patient_id": p_id,
                "abha_id": abha,
                "resource_type": "MedicationRequest",
                "fhir_id": med_fid,
                "speakable_rx_id": rx_id,
                "event_date": f"{item['issued_on']}T10:00:00Z",
                "summary_title": med["name"],
                "summary_value": f"{med['dosage']} • {med['frequency']}",
                "source": "ingested",
                "raw_json": {
                    "resourceType": "MedicationRequest",
                    "id": med_fid,
                    "status": "active",
                    "intent": "order",
                    "medicationCodeableConcept": {"text": med["name"]},
                    "dosageInstruction": [{"text": f"{med['dosage']}, {med['frequency']}", "patientInstruction": med.get("instructions", "")}],
                    "dispenseRequest": {"expectedSupplyDuration": {"value": med.get("duration_days", 30), "unit": "days"}},
                    "subject": {"reference": f"Patient/{p_id}", "display": item["patient_name"]}
                }
            }
            client.post(f"{SUPABASE_URL}/rest/v1/fhir_resources", json=med_payload, headers=headers)

    print("Data enrichment complete.")
