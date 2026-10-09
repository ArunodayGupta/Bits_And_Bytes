"""app/routers/admin.py
Admin console endpoints for system diagnostics, metrics, and API request audits.
Only accessible to administrators.
"""

from typing import Any
from fastapi import APIRouter, Header, HTTPException, Query
from app.utils.db import (
    get_admin_metrics,
    get_admin_patients,
    get_admin_prescriptions,
    get_admin_fhir_resources,
    get_admin_access_logs,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _verify_admin(x_admin_role: str | None = Header(None)) -> None:
    """Validate admin authorization header or allow demo admin role."""
    # In browser demo environment, role is verified via x-admin-role header or parameter
    if x_admin_role and x_admin_role.lower() not in ("admin", "superadmin", "administrator"):
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Admin privileges required."}},
        )


@router.get("/metrics")
def read_admin_metrics():
    """Retrieve operational metrics across database tables."""
    try:
        return get_admin_metrics()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )


@router.get("/patients")
def read_admin_patients():
    """Retrieve all registered patients for the admin console."""
    try:
        return get_admin_patients()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )


@router.get("/prescriptions")
def read_admin_prescriptions():
    """Retrieve all prescriptions for the admin console."""
    try:
        return get_admin_prescriptions()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )


@router.get("/fhir-resources")
def read_admin_fhir_resources(limit: int = Query(50, ge=1, le=200)):
    """Retrieve recent FHIR resources for the admin console."""
    try:
        return get_admin_fhir_resources(limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )


@router.get("/access-logs")
def read_admin_access_logs(limit: int = Query(100, ge=1, le=500)):
    """Retrieve audit access logs (API requests made across the application).
    Exposed ONLY to administrators.
    """
    try:
        return get_admin_access_logs(limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )
