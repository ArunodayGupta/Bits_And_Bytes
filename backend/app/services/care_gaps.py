"""app/services/care_gaps.py
Clinical Care-Gap Engine v2.

Pure table-driven clinical decision-support rule engine.
Features:
- Type 2 Diabetes overdue HbA1c monitoring rule.
- Blood pressure evaluation rules for hypertensive patients:
  - UNCONTROLLED_BP (high severity)
  - BP_ELEVATED_SINGLE_READING (medium severity)
  - BP_RISING_TREND (medium severity, demo rule)
- Pure functional rule registry: (facts, as_of) -> list[CareGap].
- Synthetic/demo decision-support language only ("discuss with your doctor").
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

# Named clinical / demo thresholds
BP_SYSTOLIC_THRESHOLD = 140
BP_DIASTOLIC_THRESHOLD = 90
BP_RISING_MIN_RISE = 10
HBA1C_OVERDUE_DAYS = 180

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


class EvidenceItem(BaseModel):
    resource_id: str
    date: str | None = None
    summary: str
    source: str | None = "ingested"


class CareGap(BaseModel):
    code: str
    severity: Literal["low", "medium", "high"]
    title: str
    message: str
    evidence: list[EvidenceItem] = Field(default_factory=list)
    rule_version: str = "2.0.0"
    # Phase 1 backwards-compatible fields
    days_since: int | None = None
    last_value: str | None = None
    last_date: str | None = None


@dataclass
class BpReading:
    resource_id: str
    event_date: datetime
    date_str: str
    systolic: int
    diastolic: int
    source: str = "ingested"

    @property
    def is_elevated(self) -> bool:
        return self.systolic >= BP_SYSTOLIC_THRESHOLD or self.diastolic >= BP_DIASTOLIC_THRESHOLD


@dataclass
class ClinicalFacts:
    has_diabetes: bool = False
    has_hypertension: bool = False
    bp_readings: list[BpReading] = field(default_factory=list)
    bp_warnings: list[str] = field(default_factory=list)
    hba1c_observations: list[dict[str, Any]] = field(default_factory=list)
    all_resources: list[dict[str, Any]] = field(default_factory=list)


def _parse_iso_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        # Normalize trailing Z
        cleaned = date_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except Exception:
        try:
            # Fallback for YYYY-MM-DD
            d = date.fromisoformat(date_str[:10])
            return datetime(d.year, d.month, d.day, tzinfo=UTC)
        except Exception:
            return None


def _format_display_date(dt: datetime) -> str:
    # Format e.g. "14 Oct 2024"
    return dt.strftime("%d %b %Y").lstrip("0")


def extract_bp_readings(
    observations: list[dict[str, Any]],
) -> tuple[list[BpReading], list[str]]:
    """Extract blood pressure readings from Observation resources.

    Reads systolic (LOINC 8480-6) and diastolic (LOINC 8462-4) from raw_json components.
    Skips readings missing either component (records a warning).
    Ignores observations with status 'entered-in-error' or 'cancelled'.
    Collapses multiple readings on the same calendar day to the latest.
    Returns list sorted descending by date.
    """
    valid_readings: list[BpReading] = []
    warnings: list[str] = []

    for obs in observations:
        raw = obs.get("raw_json") or {}
        status = str(raw.get("status", "")).lower()
        if status in ("entered-in-error", "cancelled"):
            continue

        resource_id = str(obs.get("id") or obs.get("fhir_id") or raw.get("id") or "unknown")
        source = obs.get("source") or ("ocr_scan" if any(t.get("code") == "ocr-scan" for t in raw.get("meta", {}).get("tag", [])) else "ingested")

        event_date_str = obs.get("event_date") or raw.get("effectiveDateTime") or raw.get("issued")
        parsed_dt = _parse_iso_date(event_date_str)
        if not parsed_dt:
            continue

        components = raw.get("component") or []
        systolic: int | None = None
        diastolic: int | None = None

        for comp in components:
            codings = comp.get("code", {}).get("coding", [])
            is_systolic = any(
                c.get("code") == "8480-6" or "systolic" in str(c.get("display", "")).lower()
                for c in codings
            )
            is_diastolic = any(
                c.get("code") == "8462-4" or "diastolic" in str(c.get("display", "")).lower()
                for c in codings
            )
            val = comp.get("valueQuantity", {}).get("value")
            if val is not None:
                try:
                    num_val = int(round(float(val)))
                    if is_systolic:
                        systolic = num_val
                    elif is_diastolic:
                        diastolic = num_val
                except (ValueError, TypeError):
                    pass

        # Also check if observation is direct systolic or diastolic single reading
        if systolic is None or diastolic is None:
            code_codings = raw.get("code", {}).get("coding", [])
            is_bp_panel = any(c.get("code") == "85354-9" or "blood pressure" in str(c.get("display", "")).lower() for c in code_codings)
            if is_bp_panel or components:
                warnings.append(
                    f"Observation {resource_id} skipped: missing "
                    f"{'systolic' if systolic is None else 'diastolic'} component."
                )
            continue

        valid_readings.append(
            BpReading(
                resource_id=resource_id,
                event_date=parsed_dt,
                date_str=event_date_str[:10],
                systolic=systolic,
                diastolic=diastolic,
                source=source,
            )
        )

    # Sort descending by date
    valid_readings.sort(key=lambda r: r.event_date, reverse=True)

    # Collapse multiple readings on the same calendar day to the latest
    day_seen: set[str] = set()
    collapsed: list[BpReading] = []
    for r in valid_readings:
        if r.date_str not in day_seen:
            day_seen.add(r.date_str)
            collapsed.append(r)

    return collapsed, warnings


def has_hypertension(conditions: list[dict[str, Any]]) -> bool:
    """SNOMED CT 59621000 or 38341003 present, clinicalStatus active or absent."""
    for cond in conditions:
        raw = cond.get("raw_json") or {}
        clinical_status_codings = raw.get("clinicalStatus", {}).get("coding", [])
        if clinical_status_codings:
            status_code = str(clinical_status_codings[0].get("code", "")).lower()
            if status_code not in ("active", ""):
                continue

        code_codings = raw.get("code", {}).get("coding", [])
        for c in code_codings:
            code = str(c.get("code", ""))
            system = str(c.get("system", ""))
            if code in ("59621000", "38341003"):
                return True
            if "hypertension" in str(c.get("display", "")).lower() and ("snomed" in system or not system):
                return True

        text = str(raw.get("code", {}).get("text", "")).lower()
        if "hypertension" in text:
            return True

    return False


def has_diabetes(conditions: list[dict[str, Any]]) -> bool:
    """SNOMED CT 44054006 or Type 2 diabetes mellitus present."""
    for cond in conditions:
        raw = cond.get("raw_json") or {}
        code_codings = raw.get("code", {}).get("coding", [])
        for c in code_codings:
            code = str(c.get("code", ""))
            display = str(c.get("display", "")).lower()
            if code == "44054006" or "type 2 diabetes" in display:
                return True
        text = str(raw.get("code", {}).get("text", "")).lower()
        if "diabetes" in text:
            return True
    return False


def extract_facts(resources: list[dict[str, Any]]) -> ClinicalFacts:
    """Prepare standardized facts for rule registry."""
    conditions = [r for r in resources if r.get("resource_type") == "Condition"]
    observations = [r for r in resources if r.get("resource_type") == "Observation"]

    bp_readings, bp_warnings = extract_bp_readings(observations)

    # HbA1c observations
    hba1c_list = []
    for o in observations:
        raw = o.get("raw_json") or {}
        codings = raw.get("code", {}).get("coding", [])
        title = str(o.get("summary_title", "")).lower()
        is_hba1c = (
            any(c.get("code") == "4548-4" for c in codings)
            or "hba1c" in title
            or "hemoglobin a1c" in title
        )
        if is_hba1c:
            hba1c_list.append(o)

    # Sort HbA1c descending by date
    hba1c_list.sort(
        key=lambda x: _parse_iso_date(x.get("event_date") or x.get("raw_json", {}).get("effectiveDateTime")) or datetime.min.replace(tzinfo=UTC),
        reverse=True,
    )

    return ClinicalFacts(
        has_diabetes=has_diabetes(conditions),
        has_hypertension=has_hypertension(conditions),
        bp_readings=bp_readings,
        bp_warnings=bp_warnings,
        hba1c_observations=hba1c_list,
        all_resources=resources,
    )


# ============================================================================
# RULES REGISTRY
# ============================================================================

RuleFunc = Callable[[ClinicalFacts, datetime], list[CareGap]]
RULES_REGISTRY: list[RuleFunc] = []


def register_rule(func: RuleFunc) -> RuleFunc:
    RULES_REGISTRY.append(func)
    return func


@register_rule
def rule_hba1c_overdue(facts: ClinicalFacts, as_of: datetime) -> list[CareGap]:
    """HBA1C_OVERDUE: Requires Type 2 Diabetes; fires if no HbA1c or latest is > 180 days."""
    if not facts.has_diabetes:
        return []

    if not facts.hba1c_observations:
        return [
            CareGap(
                code="HBA1C_OVERDUE",
                severity="high",
                title="Overdue HbA1c Lab Test",
                message=(
                    "Type 2 diabetes is diagnosed, but no HbA1c monitoring test is on record. "
                    "Routine glycemic testing every 3–6 months is recommended; please discuss this with your doctor."
                ),
                evidence=[],
                days_since=None,
                last_value=None,
                last_date=None,
            )
        ]

    latest = facts.hba1c_observations[0]
    raw = latest.get("raw_json") or {}
    event_date_str = latest.get("event_date") or raw.get("effectiveDateTime")
    latest_dt = _parse_iso_date(event_date_str)
    if not latest_dt:
        return []

    days_diff = (as_of.date() - latest_dt.date()).days
    days_diff = max(days_diff, 0)

    if days_diff > HBA1C_OVERDUE_DAYS:
        val_qty = raw.get("valueQuantity", {})
        val_num = val_qty.get("value")
        val_unit = val_qty.get("unit") or "%"
        last_val_str = f"{val_num} {val_unit}" if val_num is not None else latest.get("summary_value")
        last_date_formatted = _format_display_date(latest_dt)
        source = latest.get("source") or ("ocr_scan" if any(t.get("code") == "ocr-scan" for t in raw.get("meta", {}).get("tag", [])) else "ingested")

        evidence_item = EvidenceItem(
            resource_id=str(latest.get("id") or latest.get("fhir_id") or raw.get("id")),
            date=event_date_str[:10] if event_date_str else None,
            summary=f"HbA1c {last_val_str} on {last_date_formatted}",
            source=source,
        )

        return [
            CareGap(
                code="HBA1C_OVERDUE",
                severity="high",
                title="Overdue HbA1c Monitoring",
                message=(
                    f"Last recorded HbA1c was {last_val_str} on {last_date_formatted} ({days_diff} days ago). "
                    "Regular glycemic monitoring is recommended at least every 6 months; please discuss this with your doctor."
                ),
                evidence=[evidence_item],
                days_since=days_diff,
                last_value=last_val_str,
                last_date=last_date_formatted,
            )
        ]

    return []


@register_rule
def rule_uncontrolled_bp(facts: ClinicalFacts, as_of: datetime) -> list[CareGap]:
    """UNCONTROLLED_BP (high severity): requires hypertension.

    Triggers when the 2 most recent readings are BOTH above threshold (systolic >= 140 OR diastolic >= 90).
    """
    if not facts.has_hypertension or len(facts.bp_readings) < 2:
        return []

    r0 = facts.bp_readings[0]  # Most recent
    r1 = facts.bp_readings[1]  # Second most recent

    if r0.is_elevated and r1.is_elevated:
        d0_fmt = _format_display_date(r0.event_date)
        d1_fmt = _format_display_date(r1.event_date)
        message = (
            f"Your last two blood pressure readings ({r0.systolic}/{r0.diastolic} on {d0_fmt}, "
            f"{r1.systolic}/{r1.diastolic} on {d1_fmt}) were at or above 140/90 mmHg. "
            "Please discuss this with your doctor."
        )
        evidence = [
            EvidenceItem(
                resource_id=r0.resource_id,
                date=r0.date_str,
                summary=f"BP {r0.systolic}/{r0.diastolic} mmHg on {d0_fmt}",
                source=r0.source,
            ),
            EvidenceItem(
                resource_id=r1.resource_id,
                date=r1.date_str,
                summary=f"BP {r1.systolic}/{r1.diastolic} mmHg on {d1_fmt}",
                source=r1.source,
            ),
        ]
        return [
            CareGap(
                code="UNCONTROLLED_BP",
                severity="high",
                title="Uncontrolled Blood Pressure",
                message=message,
                evidence=evidence,
            )
        ]

    return []


@register_rule
def rule_bp_elevated_single_reading(facts: ClinicalFacts, as_of: datetime) -> list[CareGap]:
    """BP_ELEVATED_SINGLE_READING (medium severity): hypertension plus only one reading, above threshold."""
    if not facts.has_hypertension or len(facts.bp_readings) != 1:
        return []

    r0 = facts.bp_readings[0]
    if r0.is_elevated:
        d0_fmt = _format_display_date(r0.event_date)
        message = (
            f"Your latest blood pressure reading ({r0.systolic}/{r0.diastolic} on {d0_fmt}) was at or above 140/90 mmHg. "
            "There is not enough history to assess the trend; please discuss this with your doctor."
        )
        evidence = [
            EvidenceItem(
                resource_id=r0.resource_id,
                date=r0.date_str,
                summary=f"BP {r0.systolic}/{r0.diastolic} mmHg on {d0_fmt}",
                source=r0.source,
            )
        ]
        return [
            CareGap(
                code="BP_ELEVATED_SINGLE_READING",
                severity="medium",
                title="Elevated Blood Pressure (Single Reading)",
                message=message,
                evidence=evidence,
            )
        ]

    return []


@register_rule
def rule_bp_rising_trend(facts: ClinicalFacts, as_of: datetime) -> list[CareGap]:
    """BP_RISING_TREND (medium severity, demo rule): hypertension plus 3 or more readings.

    Triggers when systolic is strictly increasing across the latest 3 readings (in chronological order)
    and total rise is >= 10 mmHg. Can fire alongside UNCONTROLLED_BP.
    """
    if not facts.has_hypertension or len(facts.bp_readings) < 3:
        return []

    # bp_readings are sorted descending: r0 = latest, r1 = previous, r2 = oldest of the 3
    r0 = facts.bp_readings[0]
    r1 = facts.bp_readings[1]
    r2 = facts.bp_readings[2]

    # Chronological strictly increasing: r2 < r1 < r0
    is_strictly_increasing = r2.systolic < r1.systolic < r0.systolic
    total_rise = r0.systolic - r2.systolic

    if is_strictly_increasing and total_rise >= BP_RISING_MIN_RISE:
        d2_fmt = _format_display_date(r2.event_date)
        d0_fmt = _format_display_date(r0.event_date)
        message = (
            f"Demo rule: Your systolic blood pressure has risen across your last 3 readings "
            f"({r2.systolic} -> {r1.systolic} -> {r0.systolic} mmHg between {d2_fmt} and {d0_fmt}, an increase of {total_rise} mmHg). "
            "Please discuss this with your doctor."
        )
        evidence = [
            EvidenceItem(resource_id=r0.resource_id, date=r0.date_str, summary=f"Latest: {r0.systolic}/{r0.diastolic} mmHg", source=r0.source),
            EvidenceItem(resource_id=r1.resource_id, date=r1.date_str, summary=f"Prior: {r1.systolic}/{r1.diastolic} mmHg", source=r1.source),
            EvidenceItem(resource_id=r2.resource_id, date=r2.date_str, summary=f"Baseline: {r2.systolic}/{r2.diastolic} mmHg", source=r2.source),
        ]
        return [
            CareGap(
                code="BP_RISING_TREND",
                severity="medium",
                title="Rising Blood Pressure Trend (Demo Rule)",
                message=message,
                evidence=evidence,
            )
        ]

    return []


def evaluate_care_gaps(
    resources: list[dict[str, Any]],
    as_of: str | datetime | None = None,
) -> list[CareGap]:
    """Execute all registered care-gap rules on the provided clinical resources.

    Returns gaps sorted by severity (high -> medium -> low) then code.
    Defaults as_of to the latest event_date in patient data or now.
    """
    # Determine effective as_of date
    effective_as_of: datetime
    if as_of:
        if isinstance(as_of, datetime):
            effective_as_of = as_of if as_of.tzinfo else as_of.replace(tzinfo=UTC)
        else:
            effective_as_of = _parse_iso_date(str(as_of)) or datetime.now(UTC)
    else:
        latest_ts = datetime.min.replace(tzinfo=UTC)
        for r in resources:
            d_str = r.get("event_date") or (r.get("raw_json", {}) if isinstance(r.get("raw_json"), dict) else {}).get("effectiveDateTime")
            p = _parse_iso_date(d_str)
            if p and p > latest_ts:
                latest_ts = p
        effective_as_of = latest_ts if latest_ts != datetime.min.replace(tzinfo=UTC) else datetime.now(UTC)

    facts = extract_facts(resources)

    all_gaps: list[CareGap] = []
    for rule in RULES_REGISTRY:
        gaps = rule(facts, effective_as_of)
        all_gaps.extend(gaps)

    # Sort by severity then code
    all_gaps.sort(key=lambda g: (SEVERITY_ORDER.get(g.severity, 99), g.code))
    return all_gaps
