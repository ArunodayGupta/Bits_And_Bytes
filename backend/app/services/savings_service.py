"""app/services/savings_service.py
Jan Aushadhi Generic Savings Engine.

Maps prescribed medications from FHIR MedicationRequest to cheaper Jan Aushadhi
(PMBJP - Pradhan Mantri Bhartiya Janaushadhi Pariyojana) generic equivalents.
Computes monthly savings using exact Decimal arithmetic.
"""

from __future__ import annotations

import json
import math
import re
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "medicine_catalog.json"


class CatalogEntry(BaseModel):
    id: str
    ingredients: list[str]
    strength_value: Decimal
    strength_unit: str
    form: str
    release: Literal["IR", "SR", "ER"]
    brand_name: str
    brand_aliases: list[str]
    brand_price_per_strip: Decimal
    brand_units_per_strip: int
    generic_name: str
    generic_price_per_strip: Decimal
    generic_units_per_strip: int
    price_as_of: str
    source_note: str
    illustrative: bool = True
    caution: str | None = None


class MatchedMedicationSavings(BaseModel):
    prescribed_drug: str
    salt: str
    generic_alternative: str
    monthly_savings_rupees: Decimal
    savings_percentage: Decimal
    monthly_cost_brand: Decimal
    monthly_cost_generic: Decimal
    doses_per_day: int
    assumed_frequency: bool
    caution: str | None = None
    price_as_of: str
    illustrative: bool = True


class UnmatchedMedication(BaseModel):
    prescribed_drug: str
    reason: str


class PrescriptionSavingsResponse(BaseModel):
    rx_id: str
    medications: list[MatchedMedicationSavings]
    unmatched: list[UnmatchedMedication]
    total_monthly_savings: Decimal
    disclaimer: str = (
        "Illustrative prices. Do not change medicines without asking your doctor or pharmacist."
    )


# In-memory validated catalog loaded at startup
CATALOG: list[CatalogEntry] = []


def load_and_validate_catalog() -> list[CatalogEntry]:
    global CATALOG
    if not CATALOG_PATH.exists():
        raise FileNotFoundError(f"Medicine catalog not found at {CATALOG_PATH}")
    raw_data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    CATALOG = [CatalogEntry(**entry) for entry in raw_data]
    return CATALOG


# Validate catalog at module load
load_and_validate_catalog()


def normalize_drug_text(text: str) -> str:
    """Normalize drug text for deterministic conservative matching."""
    s = text.lower().strip()
    # Replace punctuation except decimal points in numbers
    s = re.sub(r"[,;:\(\)\[\]]", " ", s)
    # Normalize dosage forms
    s = re.sub(r"\b(tablets?|tabs?|capsules?|caps?|oral)\b", "", s)
    # Normalize spacing around units
    s = re.sub(r"(\d+)\s*(mg|mcg|g)\b", r"\1 \2", s)
    # Collapse multiple spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_frequency(dosage_instruction: dict[str, Any] | None) -> tuple[int, bool]:
    """Extract doses per day from dosageInstruction.

    Returns (doses_per_day, assumed_frequency).
    """
    if not dosage_instruction:
        return 1, True

    # 1. Structured timing repeat
    timing = dosage_instruction.get("timing", {})
    repeat = timing.get("repeat", {})
    frequency = repeat.get("frequency")
    period = repeat.get("period")
    period_unit = str(repeat.get("periodUnit", "")).lower()

    if frequency and period:
        try:
            freq_int = int(frequency)
            period_float = float(period)
            if period_unit in ("d", "day", "days"):
                doses = int(math.ceil(freq_int / period_float))
                return max(1, doses), False
            elif period_unit in ("wk", "week", "weeks"):
                doses = int(math.ceil(freq_int / (period_float * 7)))
                return max(1, doses), False
        except Exception:
            pass

    # 2. Textual dosage instruction parsing
    text = str(dosage_instruction.get("text", "")).lower()
    if not text:
        return 1, True

    # Look for common Indian prescription patterns
    # "1-0-1" -> 2, "1-1-1" -> 3, "1-0-0" -> 1
    pattern_match = re.search(r"\b([0-2])\s*[-–/]\s*([0-2])\s*[-–/]\s*([0-2])(?:\s*[-–/]\s*([0-2]))?\b", text)
    if pattern_match:
        parts = [int(p) for p in pattern_match.groups() if p is not None]
        return max(1, sum(parts)), False

    # Standard Latin / Clinical abbreviations
    if re.search(r"\b(qid|four times daily|4 times daily)\b", text):
        return 4, False
    if re.search(r"\b(tds|tid|thrice daily|three times daily|3 times daily)\b", text):
        return 3, False
    if re.search(r"\b(bd|bid|twice daily|two times daily|2 times daily)\b", text):
        return 2, False
    if re.search(r"\b(od|qd|once daily|one time daily|1 time daily|every morning|in the morning|at bedtime|at night)\b", text):
        return 1, False

    # Default assumed
    return 1, True


def match_medication(
    drug_text: str, catalog: list[CatalogEntry]
) -> tuple[CatalogEntry | None, str | None]:
    """Conservative matcher for prescribed drug against Jan Aushadhi catalog.

    No fuzzy edit-distance. Returns (CatalogEntry, None) or (None, reason).
    """
    clean_text = normalize_drug_text(drug_text)

    # Check for combination products (+, /, and with second ingredient)
    if any(sep in clean_text for sep in ["+", "/", " and ", " with "]):
        return None, "Combination product not supported in single-salt Jan Aushadhi catalog"

    # Check direct brand alias match first
    for entry in catalog:
        for alias in entry.brand_aliases:
            if normalize_drug_text(alias) == clean_text:
                return entry, None

    # Detect release form: SR/ER/XR vs IR (default)
    release = "IR"
    if re.search(r"\b(sr|sustained release)\b", clean_text):
        release = "SR"
    elif re.search(r"\b(er|xr|extended release)\b", clean_text):
        release = "ER"

    # Extract strength: e.g. 40 mg, 500 mg, 50 mcg
    strength_match = re.search(r"(\d+(?:\.\d+)?)\s*(mg|mcg|g)\b", clean_text)
    prescribed_strength_val: Decimal | None = None
    prescribed_strength_unit: str | None = None
    if strength_match:
        prescribed_strength_val = Decimal(strength_match.group(1))
        prescribed_strength_unit = strength_match.group(2)

    # Check known salt ingredients in catalog
    matched_salt_entries = []
    for entry in catalog:
        for ing in entry.ingredients:
            if ing in clean_text:
                matched_salt_entries.append(entry)
                break

    if not matched_salt_entries:
        return None, "Unknown drug not found in Jan Aushadhi catalog"

    # Check exact match on ingredient, strength, and release
    for entry in matched_salt_entries:
        strength_matches = (
            prescribed_strength_val == entry.strength_value
            and prescribed_strength_unit == entry.strength_unit
        )
        release_matches = (release == entry.release)

        if strength_matches and release_matches:
            return entry, None

    # If we had entries matching salt but not specs, explain specifically
    first_candidate = matched_salt_entries[0]
    if prescribed_strength_val and prescribed_strength_val != first_candidate.strength_value:
        return (
            None,
            f"Strength mismatch (prescribed {prescribed_strength_val} {prescribed_strength_unit} "
            f"vs catalog {first_candidate.strength_value} {first_candidate.strength_unit})",
        )
    if release != first_candidate.release:
        return (
            None,
            f"Release formulation mismatch (prescribed {release} vs catalog {first_candidate.release})",
        )

    return None, "Prescription details did not match Jan Aushadhi catalog specifications"


def compute_savings_for_prescription(
    rx_id: str,
    medication_requests: list[dict[str, Any]],
    catalog: list[CatalogEntry] | None = None,
) -> PrescriptionSavingsResponse:
    """Calculate potential generic savings for a prescription using Decimal math.

    Formula:
    total_units = doses_per_day * units_per_dose * 30
    strips_brand = ceil(total_units / brand_units_per_strip)
    monthly_cost_brand = strips_brand * brand_price_per_strip
    strips_generic = ceil(total_units / generic_units_per_strip)
    monthly_cost_generic = strips_generic * generic_price_per_strip
    monthly_savings = max(0, monthly_cost_brand - monthly_cost_generic)
    savings_percentage = round((monthly_savings / monthly_cost_brand * 100), 1)
    """
    active_catalog = catalog or CATALOG
    matched_results: list[MatchedMedicationSavings] = []
    unmatched_results: list[UnmatchedMedication] = []
    total_monthly_savings = Decimal("0.00")

    for med in medication_requests:
        raw = med.get("raw_json") or med
        # Extract drug name
        codeable = raw.get("medicationCodeableConcept") or {}
        drug_name = codeable.get("text")
        if not drug_name:
            codings = codeable.get("coding") or []
            if codings:
                drug_name = codings[0].get("display") or codings[0].get("text")
        if not drug_name:
            drug_name = med.get("summary_title") or "Unknown Medication"

        dosage_list = raw.get("dosageInstruction") or []
        first_dosage = dosage_list[0] if dosage_list else None
        doses_per_day, assumed_freq = parse_frequency(first_dosage)

        # units_per_dose = 1 unless doseQuantity specifies otherwise
        units_per_dose = 1
        if first_dosage and "doseQuantity" in first_dosage:
            dq_val = first_dosage["doseQuantity"].get("value")
            if dq_val is not None:
                try:
                    units_per_dose = int(round(float(dq_val)))
                except Exception:
                    units_per_dose = 1

        entry, reason = match_medication(drug_name, active_catalog)
        if entry is None:
            unmatched_results.append(
                UnmatchedMedication(prescribed_drug=drug_name, reason=reason or "Unmatched")
            )
            continue

        # Exact math with Decimal
        total_units_monthly = Decimal(doses_per_day * units_per_dose * 30)

        brand_strips = Decimal(math.ceil(total_units_monthly / Decimal(entry.brand_units_per_strip)))
        monthly_cost_brand = (brand_strips * entry.brand_price_per_strip).quantize(Decimal("0.01"))

        generic_strips = Decimal(math.ceil(total_units_monthly / Decimal(entry.generic_units_per_strip)))
        monthly_cost_generic = (generic_strips * entry.generic_price_per_strip).quantize(Decimal("0.01"))

        savings = max(Decimal("0.00"), monthly_cost_brand - monthly_cost_generic)
        if monthly_cost_brand > Decimal("0.00"):
            pct = ((savings / monthly_cost_brand) * Decimal(100)).quantize(
                Decimal("0.1"), rounding=ROUND_HALF_UP
            )
        else:
            pct = Decimal("0.0")

        total_monthly_savings += savings

        matched_results.append(
            MatchedMedicationSavings(
                prescribed_drug=drug_name,
                salt=entry.ingredients[0].capitalize(),
                generic_alternative=entry.generic_name,
                monthly_savings_rupees=savings,
                savings_percentage=pct,
                monthly_cost_brand=monthly_cost_brand,
                monthly_cost_generic=monthly_cost_generic,
                doses_per_day=doses_per_day,
                assumed_frequency=assumed_freq,
                caution=entry.caution,
                price_as_of=entry.price_as_of,
                illustrative=entry.illustrative,
            )
        )

    return PrescriptionSavingsResponse(
        rx_id=rx_id,
        medications=matched_results,
        unmatched=unmatched_results,
        total_monthly_savings=total_monthly_savings.quantize(Decimal("0.01")),
    )
