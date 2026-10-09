"""app/routers/demo.py
Demo endpoints powering the simulated ABHA login shell.
"""


from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.utils.db import get_demo_patients

router = APIRouter(prefix="/api/demo", tags=["Demo"])


class DemoPatientItem(BaseModel):
    abha_id: str
    display_name: str


@router.get("/patients", response_model=list[DemoPatientItem])
def list_demo_patients(request: Request):
    """Retrieve list of synthetic demo patients for simulated ABHA login."""
    try:
        patients = get_demo_patients()
        return [DemoPatientItem(**p) for p in patients]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )
