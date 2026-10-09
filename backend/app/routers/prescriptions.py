from fastapi import APIRouter, Depends, HTTPException
from app.models import PrescriptionResponse
from app.database import get_supabase
from app.utils.rate_limit import rate_limit
from app.utils.rx_id import normalize_rx_id

router = APIRouter(tags=["Prescriptions"])

@router.get("/prescription/{rx_id}", response_model=PrescriptionResponse, dependencies=[Depends(rate_limit(10, 60))])
def get_prescription(rx_id: str, supabase = Depends(get_supabase)):
    try:
        norm_rx_id = normalize_rx_id(rx_id)
    except HTTPException as e:
        raise e
    
    # Check prescription and patient
    rx_resp = supabase.table("prescriptions").select("*, patients!inner(id, name, gender, dob, abha_id, is_demo)").eq("rx_id", norm_rx_id).execute()
    
    found = len(rx_resp.data) > 0
    
    try:
        supabase.table("access_logs").insert({
            "lookup_type": "rx_id",
            "lookup_key": norm_rx_id,
            "found": found
        }).execute()
    except Exception:
        pass
        
    if not found:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    rx_data = rx_resp.data[0]
    patient_data = rx_data["patients"]
    
    if not patient_data["is_demo"]:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    # Fetch encounter (if we have resource id)
    encounter_json = None
    if rx_data.get("encounter_resource_id"):
        enc_resp = supabase.table("fhir_resources").select("raw_json").eq("id", rx_data["encounter_resource_id"]).execute()
        if enc_resp.data:
            encounter_json = enc_resp.data[0]["raw_json"]
            
    # Fetch medications
    meds_resp = supabase.table("fhir_resources").select("raw_json").eq("speakable_rx_id", norm_rx_id).eq("resource_type", "MedicationRequest").execute()
    meds = [m["raw_json"] for m in meds_resp.data]
    
    return {
        "rx_id": norm_rx_id,
        "issued_on": rx_data.get("issued_on"),
        "hospital": rx_data.get("hospital_name"),
        "doctor": rx_data.get("doctor_name"),
        "medications": meds,
        "encounter": encounter_json,
        "patient": {
            "name": patient_data["name"],
            "gender": patient_data["gender"],
            "dob": patient_data["dob"],
            "abha_id": patient_data["abha_id"]
        }
    }
