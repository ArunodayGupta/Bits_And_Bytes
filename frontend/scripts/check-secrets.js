import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');

// The keys we want to ensure NEVER make it into the frontend bundle
const FORBIDDEN_SECRETS = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'sb_secret_',
    'SUPABASE_ACCESS_TOKEN'
];

if (!fs.existsSync(DIST_DIR)) {
    console.error(`Directory not found: ${DIST_DIR}. Please run npm run build first.`);
    process.exit(1);
}

let leaked = false;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.html') || fullPath.endsWith('.css') || fullPath.endsWith('.map'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const secret of FORBIDDEN_SECRETS) {
                if (content.includes(secret)) {
                    console.error(`🚨 LEAK DETECTED: Found forbidden string "${secret}" in file: ${fullPath}`);
                    leaked = true;
                }
            }
        }
    }
}

console.log('Scanning dist directory for leaked secrets...');
scanDirectory(DIST_DIR);

if (leaked) {
    console.error('❌ Build failed security audit. Secrets were leaked.');
    process.exit(1);
} else {
    console.log('✅ Security audit passed. No secrets found in build.');
    process.exit(0);
}
