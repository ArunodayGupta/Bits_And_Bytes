from datetime import datetime, timezone

def evaluate_care_gaps(resources: list[dict], as_of: datetime = None) -> list[dict]:
    """
    Evaluates care gaps from a list of FHIR resources (as dictionaries with raw_json).
    resources: list of dictionaries representing fhir_resources rows.
    """
    gaps = []
    has_t2dm = False
    latest_hba1c = None
    latest_hba1c_date = None

    if as_of is None:
        as_of = datetime.now(timezone.utc)
    
    # 1. Check for T2DM and find latest HbA1c
    for res in resources:
        res_type = res.get('resource_type')
        raw = res.get('raw_json', {})
        
        if res_type == 'Condition':
            # Check for SNOMED 44054006
            code_obj = raw.get('code', {})
            for coding in code_obj.get('coding', []):
                if coding.get('system') == 'http://snomed.info/sct' and coding.get('code') == '44054006':
                    has_t2dm = True
                    break
        
        elif res_type == 'Observation':
            # Check for LOINC 4548-4
            code_obj = raw.get('code', {})
            is_hba1c = False
            for coding in code_obj.get('coding', []):
                if coding.get('system') == 'http://loinc.org' and coding.get('code') == '4548-4':
                    is_hba1c = True
                    break
            
            if is_hba1c:
                # Find effective date
                effective_date_str = raw.get('effectiveDateTime') or raw.get('issued')
                if not effective_date_str and 'effectivePeriod' in raw:
                    effective_date_str = raw['effectivePeriod'].get('start')
                
                if effective_date_str:
                    # Parse to datetime
                    try:
                        # Handle simple YYYY-MM-DD
                        if len(effective_date_str) == 10:
                            dt = datetime.fromisoformat(effective_date_str).replace(tzinfo=timezone.utc)
                        else:
                            dt = datetime.fromisoformat(effective_date_str.replace('Z', '+00:00'))
                        
                        if latest_hba1c_date is None or dt > latest_hba1c_date:
                            latest_hba1c_date = dt
                            
                            # Get value
                            val_qty = raw.get('valueQuantity', {})
                            val = val_qty.get('value')
                            unit = val_qty.get('unit') or val_qty.get('code')
                            if val is not None:
                                latest_hba1c = f"{val} {unit}".strip()
                            else:
                                latest_hba1c = "Unknown"
                    except ValueError:
                        pass
    
    if has_t2dm:
        if latest_hba1c_date:
            days_since = (as_of - latest_hba1c_date).days
        else:
            days_since = None
            
        if days_since is None or days_since > 180:
            gaps.append({
                "code": "HBA1C_OVERDUE",
                "severity": "high",
                "days_since": days_since,
                "last_value": latest_hba1c,
                "last_date": latest_hba1c_date.isoformat() if latest_hba1c_date else None,
                "message": f"HbA1c test is overdue (last test was {days_since} days ago)" if days_since is not None else "HbA1c test is missing"
            })
            
    return gaps
