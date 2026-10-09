from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Optional
from datetime import date, datetime

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail

class IngestResponse(BaseModel):
    abha_id: str
    patient_id: str
    rx_ids: List[str]
    counts: Dict[str, int]
    skipped: Dict[str, int]
    warnings: List[str]

class TimelineItem(BaseModel):
    id: str
    resource_type: str
    event_date: Optional[datetime]
    title: str
    value: Optional[str]
    rx_id: Optional[str]
    raw_json: dict

    model_config = ConfigDict(from_attributes=True)

class TimelineResponse(BaseModel):
    items: List[TimelineItem]
    next_cursor: Optional[str]

class PatientMinimal(BaseModel):
    name: str
    gender: Optional[str]
    dob: Optional[date]
    abha_id: str

class PrescriptionResponse(BaseModel):
    rx_id: str
    issued_on: Optional[date]
    hospital: Optional[str]
    doctor: Optional[str]
    medications: List[dict]
    encounter: Optional[dict]
    patient: PatientMinimal

class CareGapResponse(BaseModel):
    code: str
    severity: str
    days_since: Optional[int]
    last_value: Optional[str]
    last_date: Optional[str]
    message: str

class HealthResponse(BaseModel):
    status: str
    db: str
    version: str
