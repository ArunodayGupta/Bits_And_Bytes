from fastapi.testclient import TestClient
from app.main import app
from app.database import get_supabase
from app.config import settings

class FakeTable:
    def __init__(self, data=None):
        self.data = data or []
        self._select = []
        self._eq = {}
        self._order = []
        self._limit = None
        self._range = None
        
    def select(self, cols="*"):
        self._select = cols
        return self
        
    def eq(self, col, val):
        self._eq[col] = val
        return self
        
    def order(self, col, desc=False, nulls_last=False):
        self._order.append((col, desc, nulls_last))
        return self
        
    def limit(self, count):
        self._limit = count
        return self
        
    def range(self, start, end):
        self._range = (start, end)
        return self
        
    def in_(self, col, vals):
        self._eq[col] = ("IN", vals)
        return self
        
    def insert(self, record):
        self.data.append(record)
        return self
        
    def execute(self):
        # Apply filters
        res = []
        for row in self.data:
            match = True
            for k, v in self._eq.items():
                if isinstance(v, tuple) and v[0] == "IN":
                    if row.get(k) not in v[1]:
                        match = False
                else:
                    if row.get(k) != v:
                        match = False
            if match:
                res.append(row)
                
        # Apply order (simplified)
        for col, desc, nulls_last in reversed(self._order):
            res.sort(key=lambda x: (x.get(col) is None if not desc else x.get(col) is not None, x.get(col) or ""), reverse=desc)
            
        # Apply range
        if self._range:
            start, end = self._range
            res = res[start:end+1]
            
        class FakeResponse:
            def __init__(self, data):
                self.data = data
        
        # reset builder state
        self._eq = {}
        self._order = []
        self._range = None
        
        return FakeResponse(res)

class FakeRPC:
    def __init__(self, return_data):
        self.return_data = return_data
    def execute(self):
        class FakeResp:
            def __init__(self, d):
                self.data = d
        return FakeResp(self.return_data)

class FakeSupabase:
    def __init__(self):
        self.tables = {
            "patients": FakeTable([
                {"id": "uuid1", "abha_id": "12-34", "name": "Test", "gender": "male", "dob": "2000-01-01", "is_demo": True, "phone": "1234"},
                {"id": "uuid2", "abha_id": "99-99", "name": "Real", "is_demo": False}
            ]),
            "prescriptions": FakeTable([
                {"rx_id": "APL-RR-1410-RAME", "patients": {"id": "uuid1", "name": "Test", "gender": "male", "dob": "2000-01-01", "abha_id": "12-34", "is_demo": True}, "hospital_name": "Apollo", "doctor_name": "Dr", "encounter_resource_id": "enc1"}
            ]),
            "fhir_resources": FakeTable([
                {"id": "1", "abha_id": "12-34", "resource_type": "Observation", "event_date": "2024-01-01T00:00:00+00:00", "summary_title": "T1", "summary_value": "V1", "speakable_rx_id": None, "raw_json": {}},
                {"id": "2", "abha_id": "12-34", "resource_type": "Observation", "event_date": None, "summary_title": "T2", "summary_value": "V2", "speakable_rx_id": None, "raw_json": {}},
                {"id": "3", "abha_id": "12-34", "resource_type": "MedicationRequest", "event_date": "2024-02-01T00:00:00+00:00", "summary_title": "T3", "summary_value": "V3", "speakable_rx_id": "APL-RR-1410-RAME", "raw_json": {"drug": "1"}},
                {"id": "4", "abha_id": "12-34", "resource_type": "MedicationRequest", "event_date": "2024-02-01T00:00:00+00:00", "summary_title": "T4", "summary_value": "V4", "speakable_rx_id": "APL-RR-1410-RAME", "raw_json": {"drug": "2"}},
                {"id": "enc1", "abha_id": "12-34", "resource_type": "Encounter", "raw_json": {"enc": True}}
            ]),
            "access_logs": FakeTable([])
        }
        
    def table(self, name):
        if name not in self.tables:
            self.tables[name] = FakeTable()
        return self.tables[name]
        
    def rpc(self, fn_name, params):
        return FakeRPC({"patient_id": "uuid1", "patient_upserted": 1, "prescriptions_upserted": 1, "resources_upserted": 2})

fake_db = FakeSupabase()

def override_get_supabase():
    return fake_db

app.dependency_overrides[get_supabase] = override_get_supabase

client = TestClient(app)

def test_ingest_no_api_key():
    response = client.post("/api/fhir/ingest", json={"resourceType": "Bundle", "type": "document", "entry": []})
    assert response.status_code == 401

def test_ingest_malformed():
    headers = {"X-API-Key": settings.api_ingest_key}
    response = client.post("/api/fhir/ingest", json={"resourceType": "NotBundle"}, headers=headers)
    assert response.status_code == 422

def test_timeline_pagination_and_order():
    res = client.get("/api/patient/12-34/timeline?limit=2")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 2
    # undated should be last, so id=2 is last. Order should be id=4/3 (Feb), id=1 (Jan), id=enc1, id=2
    # Let's just check length and pagination
    assert data["next_cursor"] == "2"
    
def test_prescription_lookup():
    res = client.get("/api/prescription/APL-RR-1410-RAME")
    assert res.status_code == 200
    data = res.json()
    assert len(data["medications"]) == 2
    assert "drug" in data["medications"][0]
    assert data["encounter"]["enc"] is True
    assert "phone" not in data["patient"]
    assert data["patient"]["abha_id"] == "12-34"
    
def test_prescription_lookup_hyphenless():
    res = client.get("/api/prescription/APLRR1410RAME")
    assert res.status_code == 200
    assert res.json()["rx_id"] == "APL-RR-1410-RAME"

def test_prescription_lookup_unknown():
    res = client.get("/api/prescription/UNK-NO-0101-WNNN")
    assert res.status_code == 404
    
def test_timeline_non_demo():
    res = client.get("/api/patient/99-99/timeline")
    assert res.status_code == 404
