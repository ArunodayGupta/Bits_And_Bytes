import type { FhirBundle } from './types';
import { PATIENT_PROFILES, DEFAULT_PATIENT_PROFILE } from '@/data/patients';

export interface PatientDataResult {
  bundle: FhirBundle;
  source: 'database' | 'offline';
  isFallback: boolean;
  resourceCount: number;
}

// Global listeners for fallback event if needed across components
export const FALLBACK_EVENT_NAME = 'healthsafe:live-fallback';

/**
 * Returns the matching static bundle for an ABHA ID from the loaded profiles,
 * falling back to DEFAULT_PATIENT_PROFILE.
 */
export function getLocalBundleForAbha(abhaId?: string): FhirBundle {
  if (!abhaId) return DEFAULT_PATIENT_PROFILE.bundle;
  const clean = abhaId.replace(/\D/g, '');
  const matched = PATIENT_PROFILES.find((p) => p.abha.replace(/\D/g, '') === clean);
  return (matched ? matched.bundle : DEFAULT_PATIENT_PROFILE.bundle) as FhirBundle;
}

/**
 * Fetch patient data directly from the live database (FastAPI / Supabase).
 * - "database" / "live": Queries live database endpoint for the active ABHA ID.
 *   Retrieves up-to-date conditions, observations, encounters, and prescriptions.
 * - "offline": Immediately resolves with the static synthetic NRCeS bundle. Zero network calls.
 * Zero references to HAPI FHIR.
 */
export async function fetchPatientData(
  source: 'database' | 'offline' | 'live' = 'database',
  onFallback?: () => void,
  abhaId: string = '91-1234-5678-9012'
): Promise<FhirBundle> {
  const localBundle = getLocalBundleForAbha(abhaId);

  if (source === 'offline') {
    // Immediately resolve without any network request
    return JSON.parse(JSON.stringify(localBundle)) as FhirBundle;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const cleanAbha = abhaId.trim();
    const response = await fetch(`/api/patient/${encodeURIComponent(cleanAbha)}/bundle`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, application/fhir+json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Database bundle responded with status ${response.status}`);
    }

    const data = (await response.json()) as FhirBundle;
    if (!data || !data.entry || data.entry.length === 0) {
      throw new Error('Database returned empty records for ABHA');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // AbortError means the request was intentionally cancelled (e.g. React
    // Strict Mode double-mount, component unmount, or manual reload). Do NOT
    // treat this as a database failure — simply re-throw so the caller can
    // decide what to do without triggering the fallback toast.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    console.warn('Database fetch failed, falling back to local bundle:', error);

    if (onFallback) {
      onFallback();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(FALLBACK_EVENT_NAME, {
          detail: { message: 'Database unreachable, showing offline bundle.' },
        })
      );
    }

    // Safely return offline bundle matching the requested patient
    return JSON.parse(JSON.stringify(localBundle)) as FhirBundle;
  }
}
