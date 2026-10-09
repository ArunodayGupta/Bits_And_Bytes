import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { parseFhirBundle, type IngestOptions } from '../fhir/parse';

export interface IngestResult {
  patientId: string;
  abhaId: string;
  rxIds: string[];
  counts: Record<string, number>;
  skipped: Array<{ resourceType: string; count: number }>;
  warnings: string[];
}

/**
 * Ingests a FHIR R4 Bundle into Supabase.
 * - Parses and validates with Zod in TypeScript.
 * - Dispatches payload to the atomic, idempotent RPC `ingest_patient_bundle`.
 * - Requires a service role client for database persistence.
 */
export async function ingestFhirBundle(
  client: SupabaseClient<Database>,
  bundle: unknown,
  opts: IngestOptions = {}
): Promise<IngestResult> {
  // 1. Pure TypeScript parsing, validation, and reference resolution
  const parsed = parseFhirBundle(bundle, opts);

  // 2. Atomic persistence via service-role-only RPC
  const { data, error } = await client.rpc('ingest_patient_bundle', {
    p_patient: parsed.patient as any,
    p_resources: parsed.resources as any,
    p_prescriptions: parsed.prescriptions as any,
  });

  if (error) {
    throw new Error(`Ingest failed in database transaction: ${error.message}`);
  }

  const res = data as Record<string, unknown>;
  const patientId = String(res?.patient_id || '');
  const abhaId = String(res?.abha_id || parsed.patient.abha_id);
  const rxIds = (res?.rx_ids as string[]) || parsed.rxIds;

  return {
    patientId,
    abhaId,
    rxIds,
    counts: parsed.counts,
    skipped: parsed.skipped,
    warnings: parsed.warnings,
  };
}
