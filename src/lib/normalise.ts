/**
 * Search input normaliser for Clinician view.
 * Handles:
 * - Rx-ID with or without hyphens/spaces: "APL-RR-1410-RAME", "APLRR1410RAME", "apl rr 1410 rame"
 * - ABHA numbers with or without hyphens/spaces: "91-1234-5678-9012", "91123456789012"
 */

export type QueryType = 'rx-id' | 'abha' | 'unknown';

export interface NormalisedQueryResult {
  raw: string;
  cleaned: string; // Trimmed, uppercase, no spaces or hyphens
  canonical: string; // Canonical formatted string (e.g. APL-RR-1410-RAME or 91-1234-5678-9012)
  type: QueryType;
}

export function normaliseQuery(rawInput: string): NormalisedQueryResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { raw: '', cleaned: '', canonical: '', type: 'unknown' };
  }

  // Remove spaces and hyphens for comparison
  const alphanumericOnly = trimmed.toUpperCase().replace(/[\s-]+/g, '');

  // 1. Check if it's an ABHA number: 14 digits (or starting with 91)
  const isAllDigits = /^\d+$/.test(alphanumericOnly);
  if (isAllDigits && (alphanumericOnly.length === 14 || alphanumericOnly.length === 12)) {
    // Format as XX-XXXX-XXXX-XXXX if 14 digits
    let canonicalAbha = alphanumericOnly;
    if (alphanumericOnly.length === 14) {
      canonicalAbha = `${alphanumericOnly.slice(0, 2)}-${alphanumericOnly.slice(2, 6)}-${alphanumericOnly.slice(6, 10)}-${alphanumericOnly.slice(10, 14)}`;
    }
    return {
      raw: trimmed,
      cleaned: alphanumericOnly,
      canonical: canonicalAbha,
      type: 'abha',
    };
  }

  // 2. Check if it's an Rx-ID
  // Rx-ID pattern: HOS (3 chars) + DD (2-3 chars) + DDMM (4 digits) + PATI (4+ chars)
  // Total length around 13-17 chars without hyphens
  const rxRegex = /^([A-Z0-9]{3})([A-Z0-9]{2,3})(\d{4})([A-Z0-9]{4,5})$/;
  const match = alphanumericOnly.match(rxRegex);

  if (match) {
    const [, hos, dd, ddmm, pati] = match;
    const canonicalRx = `${hos}-${dd}-${ddmm}-${pati}`;
    return {
      raw: trimmed,
      cleaned: alphanumericOnly,
      canonical: canonicalRx,
      type: 'rx-id',
    };
  }

  // If already hyphenated like APL-RR-1410-RAME
  if (/^[A-Z0-9]{3}-[A-Z0-9]{2,3}-\d{4}-[A-Z0-9]{4,5}$/.test(trimmed.toUpperCase())) {
    return {
      raw: trimmed,
      cleaned: alphanumericOnly,
      canonical: trimmed.toUpperCase(),
      type: 'rx-id',
    };
  }

  // Fallback
  return {
    raw: trimmed,
    cleaned: alphanumericOnly,
    canonical: alphanumericOnly,
    type: 'unknown',
  };
}

/**
 * Checks if a candidate Rx-ID matches the search query, tolerating casing, hyphens, and spaces.
 */
export function matchesRxId(candidateRxId: string, searchInput: string): boolean {
  if (!candidateRxId || !searchInput) return false;
  const normCandidate = candidateRxId.toUpperCase().replace(/[\s-]+/g, '');
  const normSearch = searchInput.toUpperCase().replace(/[\s-]+/g, '');
  return normCandidate === normSearch;
}

/**
 * Checks if a candidate ABHA identifier matches the search query.
 */
export function matchesAbha(candidateAbha: string, searchInput: string): boolean {
  if (!candidateAbha || !searchInput) return false;
  const normCandidate = candidateAbha.replace(/[\s-]+/g, '');
  const normSearch = searchInput.replace(/[\s-]+/g, '');
  return normCandidate === normSearch;
}
