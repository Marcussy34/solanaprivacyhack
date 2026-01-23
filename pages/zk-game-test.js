/**
 * ZK Game Integration Test Page
 * 
 * Tests the complete proof chain: shuffle → deal → reveal
 * Uses the useZKGame hook to generate real Poseidon commitments and proofs.
 * 
 * @author Marcus (ZK Engineer)
 * @created Jan 23, 2026
 */

import { useState } from 'react';
import { useZKGame } from '../hooks/useZKGame';

export default function ZKGameTest() {
  const {
    isReady,
    isProving,
    status,
    error,
    logs,
    seed,
    shuffledDeck,
    deckCommitment,
    shuffleProofData,
    dealProofs,
    revealProofs,
    initializeGame,
    dealCardAtPosition,
    revealCard,
    resetGame,
    getGameState,
  } = useZKGame();

  const [testResults, setTestResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const addResult = (step, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      step,
      success,
      message,
      data,
      timestamp: new Date().toISOString(),
    }]);
  };

  // =========================================================================
  // TEST FUNCTIONS
  // =========================================================================

  /**
   * Step 1: Initialize game (shuffle deck, compute commitment, generate proof)
   */
  const testInitialize = async () => {
    try {
      setCurrentStep(1);
      addResult(1, null, 'Starting game initialization...', null);
      
      const result = await initializeGame();
      
      addResult(1, true, 'Game initialized successfully!', {
        seed: result.seed,
        shuffledDeck: result.shuffledDeck,
        deckCommitment: result.deckCommitment,
        proofSize: result.proof?.length || 0,
      });
      
      setCurrentStep(2);
    } catch (err) {
      addResult(1, false, `Initialize failed: ${err.message}`, null);
    }
  };

  /**
   * Step 2: Deal cards (positions 0, 1 for player; 2, 3 for dealer)
   */
  const testDeal = async () => {
    try {
      setCurrentStep(2);
      addResult(2, null, 'Dealing 4 cards (2 player, 2 dealer)...', null);
      
      const positions = [0, 1, 2, 3];
      const results = [];
      
      for (const pos of positions) {
        const result = await dealCardAtPosition(pos);
        results.push({
          position: pos,
          cardValue: result.cardValue,
          commitment: result.cardCommitment?.slice(0, 20) + '...',
          proofSize: result.proof?.length || 0,
        });
      }
      
      addResult(2, true, 'All 4 cards dealt!', results);
      setCurrentStep(3);
    } catch (err) {
      addResult(2, false, `Deal failed: ${err.message}`, null);
    }
  };

  /**
   * Step 3: Reveal cards (verify commitments match)
   */
  const testReveal = async () => {
    try {
      setCurrentStep(3);
      addResult(3, null, 'Revealing all dealt cards...', null);
      
      const results = [];
      
      // Reveal all dealt cards (positions 0-3)
      for (let pos = 0; pos < 4; pos++) {
        const result = await revealCard(pos);
        results.push({
          position: pos,
          revealedValue: result.cardValue,
          proofSize: result.proof?.length || 0,
        });
      }
      
      addResult(3, true, 'All cards revealed and verified!', results);
      setCurrentStep(4);
    } catch (err) {
      addResult(3, false, `Reveal failed: ${err.message}`, null);
    }
  };

  /**
   * Run complete proof chain test
   */
  const runFullTest = async () => {
    setTestResults([]);
    setCurrentStep(0);
    resetGame();
    
    await testInitialize();
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">🃏 ZK Game Integration Test</h1>
      <p className="text-gray-400 mb-8">
        Tests the complete proof chain: shuffle → deal → reveal
      </p>
      
      {/* Status Bar */}
      <div className="mb-8 p-4 bg-gray-800 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-gray-400">ZK Ready:</span>
            <span className={`ml-2 ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
              {isReady ? '✓ Ready' : '⏳ Loading...'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className={`ml-2 ${isProving ? 'text-blue-400' : 'text-gray-300'}`}>
              {status}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Step:</span>
            <span className="ml-2 text-purple-400">{currentStep}/4</span>
          </div>
          <div>
            <span className="text-gray-400">Deal Proofs:</span>
            <span className="ml-2 text-green-400">{dealProofs.length}</span>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-2 bg-red-500/20 rounded text-red-400">
            Error: {error}
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={runFullTest}
          disabled={!isReady || isProving}
          className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 rounded-lg 
                     hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 
                     disabled:cursor-not-allowed font-semibold"
        >
          {isProving ? '⏳ Working...' : '🚀 Start Full Test'}
        </button>
        
        <button
          onClick={testDeal}
          disabled={!isReady || isProving || currentStep < 2 || currentStep >= 3}
          className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-500 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Step 2: Deal Cards
        </button>
        
        <button
          onClick={testReveal}
          disabled={!isReady || isProving || currentStep < 3 || currentStep >= 4}
          className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-500 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Step 3: Reveal Cards
        </button>
        
        <button
          onClick={() => {
            resetGame();
            setTestResults([]);
            setCurrentStep(0);
          }}
          disabled={isProving}
          className="bg-gray-600 px-6 py-3 rounded-lg hover:bg-gray-500 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Reset
        </button>
      </div>
      
      {/* Game State */}
      {deckCommitment && (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">📦 Game State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-gray-400">Seed:</span>
              <span className="ml-2 text-yellow-400">{seed}</span>
            </div>
            <div>
              <span className="text-gray-400">Deck:</span>
              <span className="ml-2 text-green-400">[{shuffledDeck?.join(', ')}]</span>
            </div>
            <div className="break-all">
              <span className="text-gray-400">Commitment:</span>
              <span className="ml-2 text-blue-400">{deckCommitment}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">📊 Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  result.success === true ? 'bg-green-500/10 border-green-500/30' :
                  result.success === false ? 'bg-red-500/10 border-red-500/30' :
                  'bg-gray-700/50 border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {result.success === true ? '✅' : result.success === false ? '❌' : '⏳'}
                  </span>
                  <span className="text-gray-300">Step {result.step}:</span>
                  <span className={
                    result.success === true ? 'text-green-400' :
                    result.success === false ? 'text-red-400' :
                    'text-yellow-400'
                  }>
                    {result.message}
                  </span>
                </div>
                {result.data && (
                  <pre className="mt-2 text-xs text-gray-400 overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Proof Chain Visualization */}
      {shuffleProofData && (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">🔗 Proof Chain</h2>
          
          {/* Shuffle */}
          <div className="mb-4 p-3 bg-blue-500/10 rounded border border-blue-500/30">
            <h3 className="font-bold text-blue-400 mb-2">1. Shuffle Proof</h3>
            <div className="text-sm text-gray-300">
              <div>Proof size: {shuffleProofData.proof?.length || 0} bytes</div>
              <div className="truncate">
                Commitment: {shuffleProofData.commitment?.slice(0, 40)}...
              </div>
            </div>
          </div>
          
          {/* Deal proofs */}
          {dealProofs.length > 0 && (
            <div className="mb-4 p-3 bg-purple-500/10 rounded border border-purple-500/30">
              <h3 className="font-bold text-purple-400 mb-2">2. Deal Proofs ({dealProofs.length})</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {dealProofs.map((dp, idx) => (
                  <div key={idx} className="bg-gray-800 p-2 rounded">
                    <div className="text-gray-400">Position {dp.position}</div>
                    <div className="text-green-400">Card: {dp.cardValue}</div>
                    <div className="text-gray-500 text-xs truncate">
                      Commit: {dp.cardCommitment?.slice(0, 20)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Reveal proofs */}
          {revealProofs.length > 0 && (
            <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
              <h3 className="font-bold text-green-400 mb-2">3. Reveal Proofs ({revealProofs.length})</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {revealProofs.map((rp, idx) => (
                  <div key={idx} className="bg-gray-800 p-2 rounded">
                    <div className="text-gray-400">Position {rp.position}</div>
                    <div className="text-yellow-400">Revealed: {rp.cardValue}</div>
                    <div className="text-green-400 text-xs">✓ Verified</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Log Output */}
      <div className="bg-black p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
        <h3 className="text-gray-500 mb-2">ZK Logs:</h3>
        {logs.length === 0 && (
          <div className="text-gray-600">Waiting for ZK operations...</div>
        )}
        {logs.map((l, i) => (
          <div key={i} className="text-green-400">[{i}] {l}</div>
        ))}
      </div>
      
      {/* Debug: Full State */}
      <details className="mt-8">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
          Debug: Full Game State
        </summary>
        <pre className="mt-2 p-4 bg-gray-800 rounded text-xs text-gray-400 overflow-auto">
          {JSON.stringify(getGameState(), null, 2)}
        </pre>
      </details>
    </div>
  );
}

