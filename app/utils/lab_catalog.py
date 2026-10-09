"""app/utils/lab_catalog.py
Clinical Laboratory Observation Catalog for Scan-to-FHIR.

Defines standardized LOINC codes, displays, allowed units, UCUM mappings,
and plausible physiological reference bounds for Indian lab tests.
Verified against loinc.org and UCUM standards.
"""

from __future__ import annotations

from pydantic import BaseModel


class LabCatalogEntry(BaseModel):
    test_key: str
    display: str
    loinc: str
    aliases: list[str]
    allowed_units: list[str]
    ucum_map: dict[str, str]
    plausible_range: tuple[float, float]
    hard_bounds: tuple[float, float]
    decimals: int
    default_reference_range: str


LAB_CATALOG: dict[str, LabCatalogEntry] = {
    "hba1c": LabCatalogEntry(
        test_key="hba1c",
        display="Hemoglobin A1c/Hemoglobin.total in Blood",
        loinc="4548-4",
        aliases=[
            "hba1c",
            "glycated hemoglobin",
            "glycosylated hemoglobin",
            "glycated hb",
            "a1c",
            "hb a1c",
        ],
        allowed_units=["%"],
        ucum_map={"%": "%"},
        plausible_range=(3.0, 20.0),
        hard_bounds=(2.0, 25.0),
        decimals=1,
        default_reference_range="< 5.7 % (Normal), 5.7 - 6.4 % (Prediabetes), >= 6.5 % (Diabetes)",
    ),
    "fasting_glucose": LabCatalogEntry(
        test_key="fasting_glucose",
        display="Fasting glucose [Mass/volume] in Blood",
        loinc="1558-6",
        aliases=[
            "fasting blood sugar",
            "fbs",
            "fasting blood glucose",
            "fasting plasma glucose",
            "fpg",
            "glucose fasting",
        ],
        allowed_units=["mg/dL", "mg/dl"],
        ucum_map={"mg/dL": "mg/dL", "mg/dl": "mg/dL"},
        plausible_range=(40.0, 600.0),
        hard_bounds=(20.0, 1000.0),
        decimals=0,
        default_reference_range="70 - 99 mg/dL",
    ),
    "tsh": LabCatalogEntry(
        test_key="tsh",
        display="Thyrotropin [Units/volume] in Serum or Plasma",
        loinc="3016-3",
        aliases=[
            "tsh",
            "thyroid stimulating hormone",
            "thyrotropin",
            "ultra tsh",
            "tsh ultrasensitive",
        ],
        allowed_units=["m[IU]/L", "u[IU]/mL", "uIU/mL", "mIU/L", "µIU/mL", "uIU/ml", "mIU/l"],
        ucum_map={
            "m[IU]/L": "m[IU]/L",
            "u[IU]/mL": "u[IU]/mL",
            "uIU/mL": "u[IU]/mL",
            "mIU/L": "m[IU]/L",
            "µIU/mL": "u[IU]/mL",
            "uIU/ml": "u[IU]/mL",
            "mIU/l": "m[IU]/L",
        },
        plausible_range=(0.01, 100.0),
        hard_bounds=(0.001, 300.0),
        decimals=2,
        default_reference_range="0.4 - 4.5 m[IU]/L",
    ),
    "creatinine": LabCatalogEntry(
        test_key="creatinine",
        display="Creatinine [Mass/volume] in Serum or Plasma",
        loinc="2160-0",
        aliases=[
            "serum creatinine",
            "creatinine",
            "s. creatinine",
            "creatinine serum",
        ],
        allowed_units=["mg/dL", "mg/dl"],
        ucum_map={"mg/dL": "mg/dL", "mg/dl": "mg/dL"},
        plausible_range=(0.1, 15.0),
        hard_bounds=(0.05, 30.0),
        decimals=2,
        default_reference_range="0.7 - 1.3 mg/dL",
    ),
    "cholesterol": LabCatalogEntry(
        test_key="cholesterol",
        display="Cholesterol [Mass/volume] in Serum or Plasma",
        loinc="2093-3",
        aliases=[
            "total cholesterol",
            "cholesterol",
            "cholesterol total",
            "serum cholesterol",
        ],
        allowed_units=["mg/dL", "mg/dl"],
        ucum_map={"mg/dL": "mg/dL", "mg/dl": "mg/dL"},
        plausible_range=(50.0, 600.0),
        hard_bounds=(20.0, 1000.0),
        decimals=0,
        default_reference_range="< 200 mg/dL",
    ),
}


def find_lab_entry_by_alias(text: str) -> LabCatalogEntry | None:
    """Match test name against aliases (case-insensitive substring/equality)."""
    norm = text.lower().strip()
    # 1. Exact match on alias
    for entry in LAB_CATALOG.values():
        for alias in entry.aliases:
            if norm == alias:
                return entry

    # 2. Substring match on alias
    for entry in LAB_CATALOG.values():
        for alias in entry.aliases:
            if alias in norm or norm in alias:
                return entry

    return None
