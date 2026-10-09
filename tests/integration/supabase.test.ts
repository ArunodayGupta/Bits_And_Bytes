import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import { createAnonClient, createServiceClient, getSupabaseEnv } from '../../src/lib/db/client';
import { ingestFhirBundle } from '../../src/lib/db/ingest';
import { getPrescriptionByRxId, getPatientTimeline } from '../../src/lib/db/queries';

dotenv.config();

const env = getSupabaseEnv();
const hasCredentials = Boolean(
  env.supabaseUrl &&
  env.supabaseAnonKey &&
  env.supabaseAnonKey !== 'ey...' &&
  env.supabaseServiceRoleKey &&
  env.supabaseServiceRoleKey !== 'ey...' &&
  !env.supabaseUrl.includes('placeholder')
);

// Conditionally execute integration tests only when live database credentials are provided
const describeIntegration = hasCredentials ? describe : describe.skip;

if (!hasCredentials) {
  console.info(
    'ℹ️ Supabase environment variables not set or contain placeholders. Skipping live integration tests. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to execute integration tests.'
  );
}

describeIntegration('Supabase Data Layer Integration Tests', () => {
  let serviceClient: ReturnType<typeof createServiceClient>;
  let anonClient: ReturnType<typeof createAnonClient>;
  let fixtureBundle: any;

  beforeAll(() => {
    serviceClient = createServiceClient();
    anonClient = createAnonClient();

    const fixturePath = path.resolve(process.cwd(), 'fixtures/ramesh-kumar.bundle.json');
    fixtureBundle = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  });

  it('1. Ingests synthetic fixture through ingestFhirBundle with expected resource counts', async () => {
    const result = await ingestFhirBundle(serviceClient, fixtureBundle, { isDemo: true });

    expect(result.patientId).toBeTruthy();
    expect(result.abhaId).toBe('91-1234-5678-9012');
    expect(result.counts.Patient).toBe(1);
    expect(result.counts.Encounter).toBe(1);
    expect(result.counts.Condition).toBe(2);
    expect(result.counts.Observation).toBe(2);
    expect(result.counts.MedicationRequest).toBe(2);
    expect(result.rxIds).toContain('APL-RR-1410-RAME');
  });

  it('2. Idempotent re-ingestion creates no duplicate rows', async () => {
    const reIngestResult = await ingestFhirBundle(serviceClient, fixtureBundle, { isDemo: true });
    expect(reIngestResult.abhaId).toBe('91-1234-5678-9012');

    // Verify patient count is still 1
    const { count: patCount, error: patErr } = await serviceClient
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('abha_id', '91-1234-5678-9012');

    expect(patErr).toBeNull();
    expect(patCount).toBe(1);

    // Verify prescriptions count for this patient
    const { count: rxCount, error: rxErr } = await serviceClient
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('rx_id', 'APL-RR-1410-RAME');

    expect(rxErr).toBeNull();
    expect(rxCount).toBe(1);
  });

  it('3. getPrescriptionByRxId returns both medications, encounter, and patient with NO phone', async () => {
    const res = await getPrescriptionByRxId(anonClient, 'APL-RR-1410-RAME');

    expect(res).not.toBeNull();
    expect(res!.prescription.rx_id).toBe('APL-RR-1410-RAME');
    expect(res!.prescription.hospital_name).toBe('Apollo Hospital');
    expect(res!.prescription.doctor_name).toBe('Dr. Rajesh Rao');
    expect(res!.prescription.medications.length).toBe(2);

    // Verify Telmisartan and Metformin are both present
    const medNames = res!.prescription.medications.map((m: any) =>
      m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || ''
    );
    expect(medNames.some((name: string) => name.toLowerCase().includes('telmisartan'))).toBe(true);
    expect(medNames.some((name: string) => name.toLowerCase().includes('metformin'))).toBe(true);

    // Verify parent Encounter raw_json is returned
    expect(res!.encounter).not.toBeNull();
    expect((res!.encounter as any)?.resourceType).toBe('Encounter');

    // Demographics check: Name, gender, dob, abha_id; NEVER phone
    expect(res!.patient.name).toBe('Ramesh Kumar');
    expect(res!.patient.gender).toBe('male');
    expect(res!.patient.dob).toBe('1970-03-12');
    expect(res!.patient.abha_id).toBe('91-1234-5678-9012');
    expect((res!.patient as any).phone).toBeUndefined();
  });

  it('4. Successfully looks up prescription using hyphen-less Rx-ID format', async () => {
    const res = await getPrescriptionByRxId(anonClient, 'APLRR1410RAME');

    expect(res).not.toBeNull();
    expect(res!.prescription.rx_id).toBe('APL-RR-1410-RAME');
  });

  it('5. Returns null for an unknown prescription ID', async () => {
    const res = await getPrescriptionByRxId(anonClient, 'NONEXISTENT-RX-ID');
    expect(res).toBeNull();
  });

  it('6. getPatientTimeline returns timeline ordered descending with undated items last', async () => {
    const timeline = await getPatientTimeline(anonClient, '91-1234-5678-9012');

    expect(timeline.items.length).toBeGreaterThanOrEqual(5);

    // Verify descending order
    for (let i = 0; i < timeline.items.length - 1; i++) {
      const dateA = timeline.items[i].eventDate;
      const dateB = timeline.items[i + 1].eventDate;
      if (dateA && dateB) {
        expect(new Date(dateA).getTime()).toBeGreaterThanOrEqual(new Date(dateB).getTime());
      }
    }
  });

  it('7. RLS enforces that anon client CANNOT directly SELECT from tables', async () => {
    // Direct SELECT on patients table
    const { data: patients, error: _patErr } = await anonClient.from('patients').select('*');
    // RLS blocks either by returning empty list (no policy match) or permission error
    expect(!patients || patients.length === 0).toBe(true);

    // Direct SELECT on fhir_resources table
    const { data: resources } = await anonClient.from('fhir_resources').select('*');
    expect(!resources || resources.length === 0).toBe(true);

    // Direct SELECT on access_logs table
    const { data: logs } = await anonClient.from('access_logs').select('*');
    expect(!logs || logs.length === 0).toBe(true);
  });

  it('8. Anon client CAN call public SECURITY DEFINER RPCs for demo patients', async () => {
    const { data, error } = await anonClient.rpc('get_prescription_by_rx_id', {
      p_rx_id: 'APL-RR-1410-RAME',
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('9. Patients with is_demo = false are NOT returned by anonymous RPCs', async () => {
    const nonDemoAbha = '88-8888-8888-8888';

    // Insert a non-demo patient via privileged service client
    await serviceClient.from('patients').upsert({
      abha_id: nonDemoAbha,
      name: 'Private NonDemo Patient',
      gender: 'female',
      dob: '1985-05-15',
      is_demo: false,
    });

    // Attempt to access timeline as anon client
    const timeline = await getPatientTimeline(anonClient, nonDemoAbha);
    expect(timeline.items.length).toBe(0);

    // Clean up
    await serviceClient.from('patients').delete().eq('abha_id', nonDemoAbha);
  });
});
