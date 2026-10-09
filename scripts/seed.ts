import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/db/client';
import { ingestFhirBundle } from '../src/lib/db/ingest';

// Load environment variables from .env
dotenv.config();

async function main() {
  console.log('🌱 Starting HealthSafe database seed...');

  const fixturePath = path.resolve(process.cwd(), 'fixtures/ramesh-kumar.bundle.json');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found at: ${fixturePath}`);
  }

  const rawJson = fs.readFileSync(fixturePath, 'utf-8');
  const bundle = JSON.parse(rawJson);

  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to create service role client:', message);
    console.error('👉 Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment or .env file.');
    process.exit(1);
  }

  // 1. Ingest bundle using identical data-layer ingest function (dogfooding)
  console.log('📦 Ingesting FHIR R4 consultation bundle...');
  const ingestResult = await ingestFhirBundle(serviceClient, bundle, {
    isDemo: true,
  });

  console.log('✅ Ingestion successful:');
  console.log(`   - Patient ID: ${ingestResult.patientId}`);
  console.log(`   - ABHA ID:    ${ingestResult.abhaId}`);
  console.log(`   - Rx-IDs:     ${ingestResult.rxIds.join(', ')}`);
  console.log(`   - Resource Counts:`, ingestResult.counts);

  if (ingestResult.warnings.length > 0) {
    console.warn('⚠️ Warnings:', ingestResult.warnings);
  }

  // 2. Upsert into offline_bundles table for demo caching
  console.log('💾 Upserting demo cache into offline_bundles...');
  const { error: offlineError } = await serviceClient
    .from('offline_bundles')
    .upsert({
      id: 'sample-diabetic-patient',
      name: 'Ramesh Kumar - Type 2 Diabetes Consultation (OPConsultRecord)',
      bundle_json: bundle,
    });

  if (offlineError) {
    throw new Error(`Failed to cache offline bundle: ${offlineError.message}`);
  }

  console.log('✅ Offline bundle cached under ID: "sample-diabetic-patient"');
  console.log('🎉 Database seeding complete!');
}

main().catch((err) => {
  console.error('❌ Seed script error:', err);
  process.exit(1);
});
