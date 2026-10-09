import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/db/client';
import { ingestFhirBundle } from '../src/lib/db/ingest';

// Load environment variables from .env in current or parent directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const FIXTURE_METADATA: Record<string, { id: string; name: string }> = {
  'ramesh-kumar.bundle.json': {
    id: 'sample-diabetic-patient',
    name: 'Ramesh Kumar - Type 2 Diabetes & Hypertension (OPConsultRecord)',
  },
  'priya-sharma.bundle.json': {
    id: 'sample-priya-sharma',
    name: 'Priya Sharma - T2DM & Hypothyroidism (OPConsultRecord)',
  },
  'arun-patel.bundle.json': {
    id: 'sample-arun-patel',
    name: 'Arun Patel - CAD, Hypertension & Dyslipidemia (OPConsultRecord)',
  },
  'sunita-verma.bundle.json': {
    id: 'sample-sunita-verma',
    name: 'Sunita Verma - Bronchial Asthma & Allergic Rhinitis (OPConsultRecord)',
  },
  'vikram-malhotra.bundle.json': {
    id: 'sample-vikram-malhotra',
    name: 'Vikram Malhotra - T2DM, CKD Stage 2 & Diabetic Nephropathy (OPConsultRecord)',
  },
  'ananya-deshmukh.bundle.json': {
    id: 'sample-ananya-deshmukh',
    name: 'Ananya Deshmukh - T2DM, Hypertension & Knee Osteoarthritis (OPConsultRecord)',
  },
};

async function main() {
  console.log('🌱 Starting HealthSafe database multi-patient seed...');

  const fixtureDirs = [
    path.resolve(process.cwd(), 'fixtures'),
    path.resolve(process.cwd(), 'backend/fixtures'),
    path.resolve(process.cwd(), '../backend/fixtures'),
  ];

  const foundDir = fixtureDirs.find((d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.bundle.json')));
  if (!foundDir) {
    throw new Error(`Fixtures directory not found. Checked: ${fixtureDirs.join(', ')}`);
  }

  const fixtureFiles = fs
    .readdirSync(foundDir)
    .filter((file) => file.endsWith('.bundle.json'))
    .sort();

  console.log(`📁 Found ${fixtureFiles.length} fixture bundles in ${foundDir}:`);
  for (const f of fixtureFiles) {
    console.log(`   - ${f}`);
  }

  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to create service role client:', message);
    console.error('👉 Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment or .env file.');
    process.exit(1);
  }

  const results = [];

  for (const file of fixtureFiles) {
    const filePath = path.join(foundDir, file);
    console.log(`\n======================================================`);
    console.log(`📦 Ingesting fixture: ${file}`);
    console.log(`======================================================`);

    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const bundle = JSON.parse(rawJson);

    try {
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

      // Upsert into offline_bundles
      const meta = FIXTURE_METADATA[file] || {
        id: `sample-${file.replace('.bundle.json', '')}`,
        name: `Demo Patient - ${file}`,
      };

      console.log(`💾 Caching bundle into offline_bundles as "${meta.id}"...`);
      const { error: offlineError } = await serviceClient
        .from('offline_bundles')
        .upsert({
          id: meta.id,
          name: meta.name,
          bundle_json: bundle,
        });

      if (offlineError) {
        console.error(`⚠️ Failed to cache offline bundle "${meta.id}":`, offlineError.message);
      } else {
        console.log(`✅ Cached in offline_bundles ("${meta.id}")`);
      }

      results.push({
        file,
        abha: ingestResult.abhaId,
        rxIds: ingestResult.rxIds,
        counts: ingestResult.counts,
      });
    } catch (ingestErr) {
      console.error(`❌ Failed to ingest ${file}:`, ingestErr);
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 Database seeding finished! Processed ${results.length} patients.`);
  console.log('======================================================');
  for (const r of results) {
    console.log(`🧑 ABHA: ${r.abha} | Rx-IDs: ${r.rxIds.join(', ')} | Resources: ${JSON.stringify(r.counts)}`);
  }
}

main().catch((err) => {
  console.error('❌ Seed script error:', err);
  process.exit(1);
});
