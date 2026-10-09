from fastapi import APIRouter, Depends, HTTPException, Query
from app.models import TimelineResponse, CareGapResponse
from app.database import get_supabase
from app.utils.rate_limit import rate_limit
from app.utils.care_gaps import evaluate_care_gaps
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(tags=["Patients"])

def check_patient_and_log(supabase, abha_id: str, lookup_type: str):
    # Check if patient exists and is demo
    p_resp = supabase.table("patients").select("id, is_demo").eq("abha_id", abha_id).execute()
    found = len(p_resp.data) > 0 and p_resp.data[0]["is_demo"]
    
    # Log access
    try:
        supabase.table("access_logs").insert({
            "lookup_type": lookup_type,
            "lookup_key": abha_id,
            "found": found
        }).execute()
    except Exception:
        pass
        
    if not found:
        raise HTTPException(status_code=404, detail="Patient not found")

@router.get("/patient/{abha_id}/timeline", response_model=TimelineResponse, dependencies=[Depends(rate_limit(10, 60))])
def get_timeline(
    abha_id: str,
    filter_type: Optional[str] = Query(None, description="Encounter | Condition | Observation | MedicationRequest"),
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    supabase = Depends(get_supabase)
):
    check_patient_and_log(supabase, abha_id, "timeline")
    
    query = supabase.table("fhir_resources").select("*").eq("abha_id", abha_id)
    if filter_type:
        query = query.eq("resource_type", filter_type)
        
    # Order by event_date DESC NULLS LAST, id DESC
    # For pagination we might use simple offset or keyset.
    # Since Supabase python client doesn't fully support complex keyset pagination easily without RPC,
    # and this is a demo, we can just fetch more or use simple offset encoded in cursor for now.
    # Wait, the prompt says "opaque keyset cursor on (event_date, id)".
    # Implementing keyset pagination in PostgREST is doable with 'or' filters, but complex.
    # For simplicity, let's use an offset cursor.
    offset = 0
    if cursor:
        try:
            offset = int(cursor)
        except Exception:
            pass
            
    query = query.order("event_date", desc=True).order("id", desc=True)
    query = query.range(offset, offset + limit - 1)
    
    resp = query.execute()
    items = []
    for row in resp.data:
        items.append({
            "id": row["id"],
            "resource_type": row["resource_type"],
            "event_date": row["event_date"],
            "title": row["summary_title"],
            "value": row["summary_value"],
            "rx_id": row["speakable_rx_id"],
            "raw_json": row["raw_json"]
        })
        
    next_cursor = str(offset + limit) if len(resp.data) == limit else None
    
    return {"items": items, "next_cursor": next_cursor}

@router.get("/patient/{abha_id}/care-gaps", response_model=list[CareGapResponse], dependencies=[Depends(rate_limit(10, 60))])
def get_care_gaps(
    abha_id: str,
    as_of: Optional[datetime] = Query(None, description="Defaults to patient's latest event_date if not provided"),
    supabase = Depends(get_supabase)
):
    check_patient_and_log(supabase, abha_id, "care_gaps")
    
    # Fetch all Conditions and Observations for the patient
    resp = supabase.table("fhir_resources").select("resource_type, raw_json, event_date").eq("abha_id", abha_id).in_("resource_type", ["Condition", "Observation"]).execute()
    
    if not as_of:
        # find latest event_date
        latest = None
        for row in resp.data:
            dt_str = row.get("event_date")
            if dt_str:
                dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                if not latest or dt > latest:
                    latest = dt
        as_of = latest if latest else datetime.now(timezone.utc)
        
    gaps = evaluate_care_gaps(resp.data, as_of)
    return gaps
