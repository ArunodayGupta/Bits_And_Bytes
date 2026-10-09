import type { FhirBundle } from './types';
import offlineBundleData from '@/data/op-consultation.json';

export interface PatientDataResult {
  bundle: FhirBundle;
  source: 'live' | 'offline';
  isFallback: boolean;
  resourceCount: number;
}

// Global listeners for fallback event if needed across components
export const FALLBACK_EVENT_NAME = 'healthsafe:live-fallback';

/**
 * Fetch patient data from either offline synthetic bundle or live HAPI FHIR server.
 * - "offline": Immediately resolves with the static NRCeS bundle. Zero network calls.
 * - "live": Queries HAPI FHIR with an 8-second AbortController timeout.
 *   On any failure, timeout, or empty result, seamlessly falls back to the offline bundle
 *   and emits a non-blocking notification.
 */
export async function fetchPatientData(
  source: 'live' | 'offline' = 'offline',
  onFallback?: () => void
): Promise<FhirBundle> {
  if (source === 'offline') {
    // Immediately resolve without any network request
    const bundle = JSON.parse(JSON.stringify(offlineBundleData)) as FhirBundle;
    return bundle;
  }

  // Live source requested
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // Query HAPI FHIR public test server for patient records with clinical revincludes
    const queryUrl = 'https://hapi.fhir.org/baseR4/Patient?_count=1&_revinclude=Encounter:patient&_revinclude=Condition:patient&_revinclude=Observation:patient&_revinclude=MedicationRequest:patient&_sort=-_lastUpdated';

    const response = await fetch(queryUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/fhir+json, application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Live FHIR responded with status: ${response.status}`);
    }

    const data = (await response.json()) as FhirBundle;

    // Check if result has actual entries
    if (!data.entry || data.entry.length === 0) {
      throw new Error('Live FHIR returned 0 records');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Live FHIR fetch failed, switching safely to offline bundle:', error);

    if (onFallback) {
      onFallback();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(FALLBACK_EVENT_NAME, {
          detail: { message: 'Live server unavailable, showing offline bundle.' },
        })
      );
    }

    // Safely return offline bundle
    const fallbackBundle = JSON.parse(JSON.stringify(offlineBundleData)) as FhirBundle;
    return fallbackBundle;
  }
}
