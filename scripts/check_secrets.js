/**
 * scripts/check_secrets.js
 * Verification script ensuring no real credentials or secret tokens exist
 * in configuration templates or production build artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /sb_secret_[a-zA-Z0-9_\-]{20,}/,
  /eyJh[a-zA-Z0-9_\-]{30,}\.eyJh[a-zA-Z0-9_\-]{30,}/,
];

let violations = 0;

function checkFile(filePath, isBuildArtifact = false) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');

  if (isBuildArtifact) {
    if (content.includes('AKIA')) {
      console.error(`[FAIL] Possible AWS key found in built bundle: ${filePath}`);
      violations++;
    }
    if (content.includes('sb_secret_')) {
      console.error(`[FAIL] Supabase service-role secret found in built bundle: ${filePath}`);
      violations++;
    }
    return;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        console.error(`[FAIL] Secret pattern matched in ${filePath}:${i + 1}`);
        violations++;
      }
    }
  }
}

// 1. Check all example env files
const envExamples = [
  path.join(repoRoot, '.env.example'),
  path.join(repoRoot, 'backend', '.env.example'),
  path.join(repoRoot, 'frontend', '.env.example'),
];

for (const envFile of envExamples) {
  checkFile(envFile, false);
}

// 2. Check built assets in dist/
const distFolders = [
  path.join(repoRoot, 'dist', 'assets'),
  path.join(repoRoot, 'frontend', 'dist', 'assets'),
];

for (const folder of distFolders) {
  if (fs.existsSync(folder)) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
        checkFile(path.join(folder, file), true);
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n❌ Secret check failed: ${violations} violation(s) detected.`);
  process.exit(1);
} else {
  console.log('✅ Secret check passed: No credentials detected in templates or build assets.');
  process.exit(0);
}
