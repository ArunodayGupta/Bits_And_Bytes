from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from app.models import IngestResponse
from app.security import verify_api_key
from app.database import get_supabase
from app.services.ingest import process_and_ingest_bundle

router = APIRouter(tags=["FHIR"])

@router.post("/fhir/ingest", response_model=IngestResponse)
def ingest_bundle(
    request: Request,
    bundle: dict = Body(..., max_length=2097152), # ~2MB limit
    demo: bool = Query(False),
    api_key: str = Depends(verify_api_key),
    supabase = Depends(get_supabase)
):
    try:
        return process_and_ingest_bundle(bundle, demo, supabase)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=500, detail="Ingestion failed")
