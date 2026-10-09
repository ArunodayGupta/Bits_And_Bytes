from app.utils.fhir_parse import parse_fhir_bundle
from app.utils.rx_id import generate_speakable_rx_id, allocate_rx_id
from app.config import settings

def process_and_ingest_bundle(bundle: dict, is_demo: bool, supabase_client) -> dict:
    patient_data, parsed_resources, warnings, skipped_counts = parse_fhir_bundle(bundle)
    patient_data["is_demo"] = is_demo
    
    # Group MedicationRequests by encounter_ref to allocate Rx-IDs
    med_requests = [r for r in parsed_resources if r["resource_type"] == "MedicationRequest"]
    
    # We will simulate the registry by fetching existing from DB?
    # The prompt says: "Provide allocate_rx_id(candidate, registry)". 
    # But wait, doing a DB fetch per allocation might be slow, or we can just fetch all rx_ids for this patient.
    # Actually, the simplest way is to fetch all existing prescriptions for this patient to build the registry.
    patient_abha = patient_data["abha_id"]
    try:
        resp = supabase_client.table("prescriptions").select("rx_id, encounter_resource_id").eq("abha_id", patient_abha).execute()
        existing_rxs = {row["rx_id"]: str(row["encounter_resource_id"]) for row in resp.data}
    except Exception as e:
        existing_rxs = {}
        warnings.append(f"Could not fetch existing prescriptions for registry: {e}")

    registry = existing_rxs.copy()
    
    enc_groups = {} # encounter_ref -> list of med_req
    for mr in med_requests:
        enc_ref = mr.get("encounter_ref") or "no_encounter"
        if enc_ref not in enc_groups:
            enc_groups[enc_ref] = []
        enc_groups[enc_ref].append(mr)
        
    prescriptions_to_insert = []
    generated_rx_ids = []
    
    for enc_ref, mrs in enc_groups.items():
        # Use first MR for info
        mr0 = mrs[0]
        hospital = mr0.get("hospital_name", "Unknown")
        doctor = mr0.get("doctor_name", "Unknown")
        date_str = mr0.get("event_date", "2000-01-01")
        
        candidate = generate_speakable_rx_id(hospital, doctor, date_str, patient_data["name"])
        enc_id_for_registry = mr0.get("encounter_id") or enc_ref
        
        final_rx_id = allocate_rx_id(candidate, enc_id_for_registry, registry)
        generated_rx_ids.append(final_rx_id)
        
        prescriptions_to_insert.append({
            "rx_id": final_rx_id,
            "encounter_resource_id": mr0.get("encounter_id"),
            "hospital_name": hospital,
            "doctor_name": doctor,
            "issued_on": date_str[:10] if date_str else None
        })
        
        # Inject identifier into raw_json and set speakable_rx_id
        for mr in mrs:
            mr["speakable_rx_id"] = final_rx_id
            
            raw = mr["raw_json"]
            if "identifier" not in raw:
                raw["identifier"] = []
            
            # Remove existing token if present to avoid duplication on re-ingest
            raw["identifier"] = [i for i in raw["identifier"] if i.get("system") != settings.rx_token_system]
            raw["identifier"].append({
                "system": settings.rx_token_system,
                "value": final_rx_id
            })
            
            # groupIdentifier
            raw["groupIdentifier"] = {
                "system": settings.rx_token_system,
                "value": final_rx_id
            }

    # Clean up internal fields before DB insertion
    db_resources = []
    resource_counts = {}
    for r in parsed_resources:
        db_res = {
            "resource_type": r["resource_type"],
            "fhir_id": r["fhir_id"],
            "event_date": r["event_date"],
            "encounter_id": r["encounter_id"],
            "speakable_rx_id": r.get("speakable_rx_id"),
            "summary_title": r["summary_title"],
            "summary_value": r["summary_value"],
            "raw_json": r["raw_json"]
        }
        db_resources.append(db_res)
        resource_counts[r["resource_type"]] = resource_counts.get(r["resource_type"], 0) + 1

    # Call Supabase RPC
    try:
        rpc_result = supabase_client.rpc(
            "ingest_patient_bundle",
            {
                "p_patient": patient_data,
                "p_resources": db_resources,
                "p_prescriptions": prescriptions_to_insert
            }
        ).execute()
        
        # rpc_result.data should be the returned JSON object
        data = rpc_result.data
        if not data:
            raise Exception("No data returned from ingest_patient_bundle RPC")
            
        return {
            "abha_id": patient_data["abha_id"],
            "patient_id": data.get("patient_id"),
            "rx_ids": list(set(generated_rx_ids)),
            "counts": resource_counts,
            "skipped": skipped_counts,
            "warnings": warnings
        }
    except Exception as e:
        raise Exception(f"Database ingest failed: {e}")
