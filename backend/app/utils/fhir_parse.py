import copy
from typing import Tuple, Dict, List

def parse_fhir_bundle(bundle: dict) -> Tuple[dict, List[dict], List[str], Dict[str, int]]:
    """
    Returns (patient_data, resources, warnings, skipped_counts)
    Raises ValueError on validation failure.
    """
    if bundle.get("resourceType") != "Bundle":
        raise ValueError("Payload must be a FHIR Bundle")
    
    b_type = bundle.get("type")
    if b_type not in {"collection", "document", "transaction"}:
        raise ValueError(f"Unsupported bundle type: {b_type}")

    entries = bundle.get("entry", [])
    
    # 1. Resolve references
    resource_map = {}
    for entry in entries:
        full_url = entry.get("fullUrl")
        res = entry.get("resource")
        if res:
            res_type = res.get("resourceType")
            res_id = res.get("id")
            if full_url:
                resource_map[full_url] = res
            if res_type and res_id:
                resource_map[f"{res_type}/{res_id}"] = res
                
    def resolve_ref(ref_str: str) -> dict:
        if not ref_str:
            return None
        return resource_map.get(ref_str)

    # 2. Find Patient
    patients = []
    for entry in entries:
        res = entry.get("resource", {})
        if res.get("resourceType") == "Patient":
            patients.append(res)
            
    if len(patients) != 1:
        raise ValueError(f"Bundle must contain exactly one Patient, found {len(patients)}")
        
    patient_res = patients[0]
    
    # Extract ABHA
    abha_id = None
    for ident in patient_res.get("identifier", []):
        sys = ident.get("system", "")
        typ_txt = ident.get("type", {}).get("text", "")
        if "healthid.ndhm.gov.in" in sys or typ_txt == "ABHA":
            val = ident.get("value", "")
            if val:
                abha_id = val
                break
                
    if not abha_id:
        raise ValueError("Patient must have an ABHA number")
        
    import re
    if not re.match(r'^[0-9]{2}-[0-9]{4}-[0-9]{4}-[0-9]{4}$', abha_id):
        raise ValueError("Invalid ABHA number format")
        
    # Patient Demographics
    names = patient_res.get("name", [])
    patient_name = "Unknown"
    if names:
        n = names[0]
        text = n.get("text")
        if text:
            patient_name = text
        else:
            given = " ".join(n.get("given", []))
            family = n.get("family", "")
            patient_name = f"{given} {family}".strip()
            
    patient_data = {
        "abha_id": abha_id,
        "fhir_id": patient_res.get("id"),
        "name": patient_name,
        "gender": patient_res.get("gender"),
        "dob": patient_res.get("birthDate"),
        "phone": None
    }
    for telecom in patient_res.get("telecom", []):
        if telecom.get("system") == "phone":
            patient_data["phone"] = telecom.get("value")
            break

    # 3. Process Resources
    resources = []
    warnings = []
    skipped_counts = {}
    
    supported_types = {"Patient", "Encounter", "Condition", "Observation", "MedicationRequest"}
    
    for entry in entries:
        res = entry.get("resource", {})
        res_type = res.get("resourceType")
        if not res_type:
            continue
        
        if res_type not in supported_types:
            skipped_counts[res_type] = skipped_counts.get(res_type, 0) + 1
            continue
            
        if res_type == "Patient":
            continue # already processed
            
        # Copy to avoid mutating input
        raw_json = copy.deepcopy(res)
        
        parsed = {
            "resource_type": res_type,
            "fhir_id": res.get("id", ""),
            "raw_json": raw_json,
            "event_date": None,
            "summary_title": "Unknown",
            "summary_value": None,
            "encounter_id": None,
            "encounter_ref": None, # Used temporarily for grouping
            "hospital_name": "Unknown",
            "doctor_name": "Unknown"
        }
        
        # Resolve encounter
        enc_ref = None
        if "encounter" in res:
            enc_ref = res["encounter"].get("reference")
        elif "context" in res:
            enc_ref = res["context"].get("reference")
            
        if enc_ref:
            parsed["encounter_ref"] = enc_ref
            enc_res = resolve_ref(enc_ref)
            if not enc_res:
                warnings.append(f"Unresolvable encounter reference: {enc_ref}")
            else:
                parsed["encounter_id"] = enc_res.get("id")
        
        if res_type == "Encounter":
            period = res.get("period", {})
            parsed["event_date"] = period.get("start")
            
            title = "Consultation"
            if res.get("type"):
                title = res["type"][0].get("text", title)
                if title == "Consultation" and res["type"][0].get("coding"):
                    title = res["type"][0]["coding"][0].get("display", title)
            elif res.get("class"):
                title = res["class"].get("display", title)
            parsed["summary_title"] = title
            
            sp_ref = res.get("serviceProvider", {}).get("reference")
            if sp_ref:
                sp_res = resolve_ref(sp_ref)
                if sp_res:
                    parsed["summary_value"] = sp_res.get("name", "Unknown")
            if not parsed["summary_value"] and res.get("serviceProvider", {}).get("display"):
                parsed["summary_value"] = res["serviceProvider"]["display"]
                
        elif res_type == "Condition":
            parsed["event_date"] = res.get("recordedDate") or res.get("onsetDateTime")
            
            code = res.get("code", {})
            title = code.get("text")
            if not title and code.get("coding"):
                title = code["coding"][0].get("display", "Unknown")
            parsed["summary_title"] = title or "Unknown"
            
            clin_status = res.get("clinicalStatus", {})
            if clin_status.get("coding"):
                parsed["summary_value"] = clin_status["coding"][0].get("code")
                
        elif res_type == "Observation":
            parsed["event_date"] = res.get("effectiveDateTime") or res.get("issued")
            if not parsed["event_date"] and res.get("effectivePeriod"):
                parsed["event_date"] = res["effectivePeriod"].get("start")
                
            code = res.get("code", {})
            title = code.get("text")
            if not title and code.get("coding"):
                title = code["coding"][0].get("display", "Unknown")
            parsed["summary_title"] = title or "Unknown"
            
            # Check for BP panel
            is_bp = False
            for coding in code.get("coding", []):
                if coding.get("code") == "85354-9":
                    is_bp = True
                    break
            
            if is_bp and "component" in res:
                sys = None
                dia = None
                for comp in res["component"]:
                    ccode = comp.get("code", {}).get("coding", [{}])[0].get("code")
                    val = comp.get("valueQuantity", {}).get("value")
                    unit = comp.get("valueQuantity", {}).get("unit", "mmHg")
                    if ccode == "8480-6":
                        sys = val
                    if ccode == "8462-4":
                        dia = val
                if sys is not None and dia is not None:
                    parsed["summary_value"] = f"{sys}/{dia} {unit}"
            else:
                val_q = res.get("valueQuantity")
                if val_q:
                    val = val_q.get("value")
                    unit = val_q.get("unit") or val_q.get("code")
                    if val is not None:
                        parsed["summary_value"] = f"{val} {unit}".strip()

        elif res_type == "MedicationRequest":
            parsed["event_date"] = res.get("authoredOn")
            
            med_code = res.get("medicationCodeableConcept", {})
            title = med_code.get("text")
            if not title and med_code.get("coding"):
                title = med_code["coding"][0].get("display", "Unknown")
            parsed["summary_title"] = title or "Unknown"
            
            instructions = res.get("dosageInstruction", [])
            if instructions:
                parsed["summary_value"] = instructions[0].get("text")
                
            # Extract doctor/hospital from encounter/requester for Rx-ID gen
            req_ref = res.get("requester", {}).get("reference")
            if req_ref:
                req_res = resolve_ref(req_ref)
                if req_res:
                    parsed["doctor_name"] = req_res.get("name", [{}])[0].get("text", "Unknown")
            if not parsed.get("doctor_name") or parsed["doctor_name"] == "Unknown":
                if res.get("requester", {}).get("display"):
                    parsed["doctor_name"] = res["requester"]["display"]
                    
            if parsed.get("encounter_ref"):
                enc_res = resolve_ref(parsed["encounter_ref"])
                if enc_res:
                    sp_ref = enc_res.get("serviceProvider", {}).get("reference")
                    if sp_ref:
                        sp_res = resolve_ref(sp_ref)
                        if sp_res:
                            parsed["hospital_name"] = sp_res.get("name", "Unknown")
                    if parsed["hospital_name"] == "Unknown" and enc_res.get("serviceProvider", {}).get("display"):
                        parsed["hospital_name"] = enc_res["serviceProvider"]["display"]
                        
        resources.append(parsed)
        
    return patient_data, resources, warnings, skipped_counts
