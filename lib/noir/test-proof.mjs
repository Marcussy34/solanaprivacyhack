/**
 * NoirJS Proof Generation Test
 * Tests proof generation time in Node.js using NoirJS and bb.js
 */

import { Noir } from '@noir-lang/noir_js';
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('=== NoirJS Proof Generation Test ===\n');

  // Load compiled circuit
  const circuitPath = join(__dirname, '../../circuits/target/shuffle_proof.json');
  console.log('Loading circuit from:', circuitPath);
  
  const circuit = JSON.parse(readFileSync(circuitPath, 'utf-8'));
  console.log('Circuit loaded successfully\n');

  // Initialize Barretenberg API first
  console.log('Initializing Barretenberg...');
  const barretenberg = await Barretenberg.new();
  console.log('Barretenberg initialized');

  // Initialize Noir and backend
  console.log('Initializing Noir and UltraHonk backend...');
  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode, barretenberg);
  console.log('Backend initialized\n');

  // Test inputs (same as Prover.toml)
  const inputs = {
    seed: '12345',
    shuffled_deck: [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7],
    deck_commitment: '0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e',
    original_deck: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  };

  // Generate witness
  console.log('Generating witness...');
  const witnessStart = performance.now();
  const { witness } = await noir.execute(inputs);
  const witnessTime = performance.now() - witnessStart;
  console.log(`Witness generated in ${(witnessTime / 1000).toFixed(3)}s\n`);

  // Generate proof
  console.log('Generating proof...');
  const proofStart = performance.now();
  const proof = await backend.generateProof(witness);
  const proofTime = performance.now() - proofStart;
  console.log(`Proof generated in ${(proofTime / 1000).toFixed(3)}s\n`);

  // Verify proof
  console.log('Verifying proof...');
  const verifyStart = performance.now();
  const isValid = await backend.verifyProof(proof);
  const verifyTime = performance.now() - verifyStart;
  console.log(`Proof verified in ${(verifyTime / 1000).toFixed(3)}s`);
  console.log(`Verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

  // Summary
  console.log('=== Summary ===');
  console.log(`Witness time:  ${(witnessTime / 1000).toFixed(3)}s`);
  console.log(`Proof time:    ${(proofTime / 1000).toFixed(3)}s`);
  console.log(`Verify time:   ${(verifyTime / 1000).toFixed(3)}s`);
  console.log(`Total time:    ${((witnessTime + proofTime + verifyTime) / 1000).toFixed(3)}s`);
  
  // Target check
  const TARGET_BROWSER = 15; // seconds
  const BLOCKER = 30; // seconds
  const totalSeconds = (proofTime / 1000);
  
  console.log('\n=== Performance Check ===');
  if (totalSeconds < TARGET_BROWSER) {
    console.log(`✅ EXCELLENT: ${totalSeconds.toFixed(2)}s < ${TARGET_BROWSER}s target`);
  } else if (totalSeconds < BLOCKER) {
    console.log(`⚠️ ACCEPTABLE: ${totalSeconds.toFixed(2)}s < ${BLOCKER}s blocker`);
  } else {
    console.log(`❌ BLOCKER: ${totalSeconds.toFixed(2)}s > ${BLOCKER}s - escalate for Day 5 pivot`);
  }

  // Cleanup
  await barretenberg.destroy();
}

main().catch(console.error);
