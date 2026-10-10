from fastapi import APIRouter
from app.utils.db import get_supabase
from app.models import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    db_status = "error"
    try:
        supabase = get_supabase()
        # cheap ping
        supabase.table("patients").select("id").limit(1).execute()
        db_status = "ok"
    except Exception:
        pass
        
    return {"status": "ok", "db": db_status, "version": "1.0.0"}
