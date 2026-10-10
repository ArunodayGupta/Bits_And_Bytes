import type { FhirBundle } from './types';
import offlineBundleData from '@/data/op-consultation.json';

export interface PatientDataResult {
  bundle: FhirBundle;
  source: 'database' | 'offline';
  isFallback: boolean;
  resourceCount: number;
}

// Global listeners for fallback event if needed across components
export const FALLBACK_EVENT_NAME = 'healthsafe:live-fallback';

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
  if (source === 'offline') {
    // Immediately resolve without any network request
    return JSON.parse(JSON.stringify(offlineBundleData)) as FhirBundle;
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

    // Safely return offline bundle
    return JSON.parse(JSON.stringify(offlineBundleData)) as FhirBundle;
  }
}
