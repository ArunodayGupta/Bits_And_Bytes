import json
import os
import sys
from app.database import get_supabase
from app.services.ingest import process_and_ingest_bundle

def main():
    print("Seeding sample data...")
    fixture_path = os.path.join(os.path.dirname(__file__), "..", "fixtures", "ramesh-kumar.bundle.json")
    
    with open(fixture_path, "r", encoding="utf-8") as f:
        bundle = json.load(f)
        
    supabase = get_supabase()
    
    # 1. Ingest via dogfooding
    try:
        res = process_and_ingest_bundle(bundle, is_demo=True, supabase_client=supabase)
        print(f"Ingest successful! ABHA: {res['abha_id']}, Rx-IDs generated: {res['rx_ids']}")
        print(f"Counts: {res['counts']}")
    except Exception as e:
        print(f"Ingest failed: {e}")
        sys.exit(1)
        
    # 2. Upsert into offline_bundles
    try:
        supabase.table("offline_bundles").upsert({
            "id": "sample-diabetic-patient",
            "name": "Ramesh Kumar Offline Bundle",
            "bundle_json": bundle
        }).execute()
        print("Upserted demo bundle into offline_bundles")
    except Exception as e:
        print(f"Failed to upsert offline bundle: {e}")
        sys.exit(1)
        
if __name__ == "__main__":
    main()
