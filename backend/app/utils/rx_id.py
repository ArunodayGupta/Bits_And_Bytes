import re
from fastapi import HTTPException

def _get_hos_segment(hospital: str) -> str:
    stopwords = {"hospital", "hospitals", "clinic", "centre", "center", "medical", "healthcare", "diagnostics", "pvt", "ltd"}
    words = re.findall(r'[a-zA-Z]+', hospital)
    filtered = [w for w in words if w.lower() not in stopwords]
    word = filtered[0] if filtered else (words[0] if words else "HOS")
    word = word.upper()
    
    first = word[0] if len(word) > 0 else 'X'
    rest = word[1:]
    consonants = [c for c in rest if c not in 'AEIOU']
    
    segment = first
    for c in consonants:
        if len(segment) < 3:
            segment += c
    
    # if still less than 3, pad with other characters from word
    for c in rest:
        if len(segment) < 3 and c not in consonants:
            segment += c
            
    # if still less than 3, pad with X
    while len(segment) < 3:
        segment += 'X'
        
    return segment[:3]

def _get_doc_segment(doctor: str) -> str:
    stopwords = {"dr", "dr.", "prof", "mr", "ms"}
    words = re.findall(r'[a-zA-Z]+', doctor)
    filtered = [w for w in words if w.lower() not in stopwords]
    initials = "".join([w[0].upper() for w in filtered])
    return initials[:3] if initials else "DOC"

def _get_date_segment(date_str: str) -> str:
    # ISO date string e.g., 2024-10-14T... or 2024-10-14
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if match:
        year, month, day = match.groups()
        return f"{day}{month}"
    return "0101"

def _get_patient_segment(patient_name: str) -> str:
    words = re.findall(r'[a-zA-Z]+', patient_name)
    first_name = words[0].upper() if words else "PATI"
    first_name = first_name + "XXXX"
    return first_name[:4]

def generate_speakable_rx_id(hospital: str, doctor: str, date_str: str, patient_name: str) -> str:
    hos = _get_hos_segment(hospital)
    doc = _get_doc_segment(doctor)
    dt = _get_date_segment(date_str)
    pati = _get_patient_segment(patient_name)
    return f"{hos}-{doc}-{dt}-{pati}"

def allocate_rx_id(candidate: str, encounter_id: str, registry: dict) -> str:
    """
    candidate: The generated Rx-ID.
    encounter_id: The encounter this prescription belongs to.
    registry: dict of {rx_id: encounter_id} representing existing prescriptions.
    """
    if candidate not in registry:
        registry[candidate] = encounter_id
        return candidate
    
    if registry[candidate] == encounter_id:
        return candidate
    
    # Collision: used by different encounter
    parts = candidate.split('-')
    base_pati = parts[-1]
    
    for suffix in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        new_pati = (base_pati[:3] + suffix) if len(base_pati) == 4 else (base_pati + suffix)
        # Ensure it doesn't exceed length? Prompt says "append one suffix letter to the PATI segment".
        # E.g., RAME -> RAMEA.
        new_pati = base_pati + suffix
        new_candidate = f"{parts[0]}-{parts[1]}-{parts[2]}-{new_pati}"
        if new_candidate not in registry:
            registry[new_candidate] = encounter_id
            return new_candidate
        if registry[new_candidate] == encounter_id:
            return new_candidate
            
    return candidate # Should not reach here in normal circumstances

def normalize_rx_id(raw: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9]', '', raw).upper()
    # Format: HOS(3) - DOC(1-3) - DDMM(4) - PATI(4+)
    # It's tricky to parse if DOC length varies.
    # Let's match from back: PATI is 4+ (usually 4), DDMM is 4, DOC is 1-3, HOS is 3.
    # Actually, DDMM is always digits.
    match = re.match(r'^([A-Z]{3})([A-Z]{1,3})(\d{4})([A-Z]{4,})$', cleaned)
    if not match:
        raise HTTPException(status_code=422, detail="Malformed Rx-ID")
    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}-{match.group(4)}"
