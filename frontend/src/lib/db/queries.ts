import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type TimelineFilterType =
  | 'Encounter'
  | 'Condition'
  | 'Observation'
  | 'MedicationRequest';

export interface TimelineItem {
  id: string;
  resourceType: string;
  eventDate: string | null;
  title: string;
  value: string | null;
  rxId: string | null;
  source?: string | null;
  raw: unknown;
}

export interface GetTimelineOptions {
  filterType?: TimelineFilterType;
  limit?: number;
  before?: string | null;
}

export interface PatientMinimal {
  name: string;
  gender: string | null;
  dob: string | null;
  abha_id: string;
}

export interface PrescriptionBundle {
  rx_id: string;
  hospital_name: string | null;
  doctor_name: string | null;
  issued_on: string;
  medications: unknown[];
}

export interface PrescriptionLookupResult {
  prescription: PrescriptionBundle;
  patient: PatientMinimal;
  encounter: unknown;
}

/**
 * Retrieves the longitudinal patient timeline by ABHA identifier.
 * Keyset-paginated and filtered via RPC.
 */
export async function getPatientTimeline(
  client: SupabaseClient<Database>,
  abhaId: string,
  opts: GetTimelineOptions = {}
): Promise<{ items: TimelineItem[]; nextCursor: string | null }> {
  const { data, error } = await client.rpc('get_patient_timeline', {
    p_abha_id: abhaId,
    p_filter_type: opts.filterType ?? null,
    p_limit: opts.limit ?? 50,
    p_before: opts.before ?? null,
  });

  if (error) {
    throw new Error(`Failed to retrieve patient timeline: ${error.message}`);
  }

  const payload = data as { items?: Array<Record<string, unknown>>; next_cursor?: string | null } | null;
  const rawItems = payload?.items || [];

  const items: TimelineItem[] = rawItems.map((item) => ({
    id: String(item.id),
    resourceType: String(item.resource_type),
    eventDate: item.event_date ? String(item.event_date) : null,
    title: String(item.summary_title),
    value: item.summary_value ? String(item.summary_value) : null,
    rxId: item.speakable_rx_id ? String(item.speakable_rx_id) : null,
    source: item.source ? String(item.source) : 'ingested',
    raw: item.raw_json,
  }));

  return {
    items,
    nextCursor: payload?.next_cursor ? String(payload.next_cursor) : null,
  };
}

/**
 * Retrieves a prescription by speakable Rx-ID.
 * Normalizes input (case, spaces, hyphens) and returns prescription with all medications,
 * parent encounter, and minimal patient demographics.
 */
export async function getPrescriptionByRxId(
  client: SupabaseClient<Database>,
  rxId: string
): Promise<PrescriptionLookupResult | null> {
  const cleaned = rxId.trim();
  if (!cleaned) return null;

  const { data, error } = await client.rpc('get_prescription_by_rx_id', {
    p_rx_id: cleaned,
  });

  if (error) {
    throw new Error(`Failed to query prescription by Rx-ID: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const res = data as Record<string, unknown>;
  const rx = res.prescription as Record<string, unknown>;
  const pat = res.patient as Record<string, unknown>;

  if (!rx || !pat) return null;

  return {
    prescription: {
      rx_id: String(rx.rx_id),
      hospital_name: rx.hospital_name ? String(rx.hospital_name) : null,
      doctor_name: rx.doctor_name ? String(rx.doctor_name) : null,
      issued_on: String(rx.issued_on),
      medications: (rx.medications as unknown[]) || [],
    },
    patient: {
      name: String(pat.name),
      gender: pat.gender ? String(pat.gender) : null,
      dob: pat.dob ? String(pat.dob) : null,
      abha_id: String(pat.abha_id),
    },
    encounter: res.encounter ?? null,
  };
}
