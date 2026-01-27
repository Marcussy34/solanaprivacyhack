import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CIRCUITS_DIR = join(PROJECT_ROOT, 'circuits/target');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');

const ARTIFACTS = [
  'shuffle_proof.json',
  'deal_proof.json',
  'reveal_proof.json',
  'hash_14_helper.json',
  'hash_2_helper.json',
  'hash_53_helper.json'
];

console.log('🔄 Syncing ZK circuits from target to public...');

if (!existsSync(CIRCUITS_DIR)) {
  console.error(`❌ Error: Circuits target directory not found at ${CIRCUITS_DIR}`);
  console.error('   Please run circuit compilation first.');
  process.exit(1);
}

let syncedCount = 0;

ARTIFACTS.forEach(file => {
  const source = join(CIRCUITS_DIR, file);
  const dest = join(PUBLIC_DIR, file);

  if (existsSync(source)) {
    try {
      copyFileSync(source, dest);
      console.log(`✅ Synced ${file}`);
      syncedCount++;
    } catch (err) {
      console.error(`❌ Failed to copy ${file}:`, err.message);
    }
  } else {
    console.warn(`⚠️  Warning: Source file not found: ${file}`);
  }
});

if (syncedCount === ARTIFACTS.length) {
  console.log('\n✨ All circuits synced successfully!');
} else {
  console.log(`\n⚠️  Synced ${syncedCount}/${ARTIFACTS.length} circuits.`);
}
