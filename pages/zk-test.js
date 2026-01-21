/**
 * ZK Proof Test Page
 * Browser-based proof generation using NoirJS and bb.js
 */

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Test inputs (same as Prover.toml)
const TEST_INPUTS = {
  seed: '12345',
  shuffled_deck: [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7],
  deck_commitment: '0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e',
  original_deck: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
};

export default function ZKProofTest() {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  // Add log entry with timestamp
  const log = useCallback((message) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${message}`]);
  }, []);

  // Run the proof generation test
  const runTest = async () => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);

    try {
      log('🚀 Starting ZK proof test...');
      
      // Dynamic imports for browser (avoids SSR issues)
      log('📦 Loading NoirJS and bb.js...');
      const { Noir } = await import('@noir-lang/noir_js');
      const { Barretenberg, UltraHonkBackend } = await import('@aztec/bb.js');
      log('✅ Modules loaded');

      // Load circuit
      log('📄 Loading circuit...');
      const circuitResponse = await fetch('/shuffle_proof.json');
      const circuit = await circuitResponse.json();
      log('✅ Circuit loaded');

      // Initialize Barretenberg
      log('⚙️ Initializing Barretenberg WASM...');
      const initStart = performance.now();
      const barretenberg = await Barretenberg.new();
      const initTime = performance.now() - initStart;
      log(`✅ Barretenberg initialized in ${(initTime / 1000).toFixed(2)}s`);

      // Initialize Noir and backend
      log('⚙️ Setting up Noir and UltraHonk backend...');
      const noir = new Noir(circuit);
      const backend = new UltraHonkBackend(circuit.bytecode, barretenberg);
      log('✅ Backend ready');

      // Generate witness
      log('🔮 Generating witness...');
      const witnessStart = performance.now();
      const { witness } = await noir.execute(TEST_INPUTS);
      const witnessTime = performance.now() - witnessStart;
      log(`✅ Witness generated in ${(witnessTime / 1000).toFixed(3)}s`);

      // Generate proof
      log('🔐 Generating proof (this may take a moment)...');
      const proofStart = performance.now();
      const proof = await backend.generateProof(witness);
      const proofTime = performance.now() - proofStart;
      log(`✅ Proof generated in ${(proofTime / 1000).toFixed(3)}s`);

      // Verify proof
      log('✔️ Verifying proof...');
      const verifyStart = performance.now();
      const isValid = await backend.verifyProof(proof);
      const verifyTime = performance.now() - verifyStart;
      log(`✅ Proof verified in ${(verifyTime / 1000).toFixed(3)}s - ${isValid ? 'VALID' : 'INVALID'}`);

      // Calculate totals
      const totalTime = witnessTime + proofTime + verifyTime;

      // Set results
      setResults({
        initTime: initTime / 1000,
        witnessTime: witnessTime / 1000,
        proofTime: proofTime / 1000,
        verifyTime: verifyTime / 1000,
        totalTime: totalTime / 1000,
        isValid,
        proofSize: proof.proof.length,
      });

      // Performance check
      const TARGET = 15;
      const BLOCKER = 30;
      if (proofTime / 1000 < TARGET) {
        log(`🎉 EXCELLENT: Proof time ${(proofTime / 1000).toFixed(2)}s < ${TARGET}s target`);
      } else if (proofTime / 1000 < BLOCKER) {
        log(`⚠️ ACCEPTABLE: Proof time ${(proofTime / 1000).toFixed(2)}s < ${BLOCKER}s blocker`);
      } else {
        log(`❌ BLOCKER: Proof time ${(proofTime / 1000).toFixed(2)}s > ${BLOCKER}s - escalate for Day 5 pivot`);
      }

      // Cleanup
      await barretenberg.destroy();
      log('🧹 Cleanup complete');

    } catch (error) {
      log(`❌ Error: ${error.message}`);
      console.error(error);
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔐 ZK Proof Browser Test</h1>
        <p className="text-gray-400 mb-8">
          Tests proof generation time in browser using NoirJS and bb.js
        </p>

        {/* Controls */}
        <div className="mb-8">
          <button
            onClick={runTest}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
              isRunning
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 cursor-pointer'
            }`}
          >
            {isRunning ? '⏳ Running...' : '▶️ Run Proof Test'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">📊 Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded p-4">
                <div className="text-gray-400 text-sm">Init Time</div>
                <div className="text-2xl font-mono">{results.initTime.toFixed(2)}s</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-gray-400 text-sm">Witness</div>
                <div className="text-2xl font-mono">{results.witnessTime.toFixed(3)}s</div>
              </div>
              <div className="bg-blue-900 rounded p-4 border-2 border-blue-500">
                <div className="text-blue-300 text-sm">Proof Time</div>
                <div className="text-2xl font-mono font-bold">{results.proofTime.toFixed(2)}s</div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <div className="text-gray-400 text-sm">Verify</div>
                <div className="text-2xl font-mono">{results.verifyTime.toFixed(3)}s</div>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="text-gray-400">
                Status: <span className={results.isValid ? 'text-green-400' : 'text-red-400'}>
                  {results.isValid ? '✅ Valid' : '❌ Invalid'}
                </span>
              </div>
              <div className="text-gray-400">
                Proof size: <span className="text-white font-mono">{results.proofSize} bytes</span>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📝 Logs</h2>
          <div className="bg-black rounded p-4 font-mono text-sm h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <span className="text-gray-500">Click "Run Proof Test" to start...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-green-400">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-gray-500 text-sm">
          <p><strong>Target:</strong> Proof time &lt; 15s</p>
          <p><strong>Blocker:</strong> Proof time &gt; 30s triggers Day 5 pivot discussion</p>
        </div>
      </div>
    </div>
  );
}
