from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase

router = APIRouter(tags=["Demo"])

@router.get("/demo/bundle")
def get_demo_bundle(supabase = Depends(get_supabase)):
    resp = supabase.table("offline_bundles").select("bundle_json").eq("id", "sample-diabetic-patient").execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Demo bundle not found")
    return resp.data[0]["bundle_json"]
