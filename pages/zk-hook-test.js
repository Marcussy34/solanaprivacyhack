import { useState } from 'react';
import { useZK } from '../hooks/useZK';

export default function ZKHookTest() {
  const { 
    isInitializing, 
    isProving, 
    error, 
    logs, 
    generateShuffleProof, 
    generateDealProof, 
    generateRevealProof 
  } = useZK();

  const [result, setResult] = useState(null);

  const testShuffle = async () => {
    try {
      const inputs = {
        seed: '12345',
        shuffled_deck: [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7],
        deck_commitment: '0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e',
        original_deck: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };
      const res = await generateShuffleProof(
        inputs.seed, 
        inputs.shuffled_deck, 
        inputs.deck_commitment, 
        inputs.original_deck
      );
      setResult({ type: 'Shuffle', ...res });
    } catch (e) {
      console.error(e);
    }
  };

  const testDeal = async () => {
    try {
      const inputs = {
        seed: '12345',
        shuffled_deck: [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7],
        blinding_factor: '99999',
        deck_commitment: '0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e',
        card_commitment: '0x09855b336da066bd39ba5aa3478eb124515980d53118c0adcc232704bfad552b',
        card_position: '0'
      };
      const res = await generateDealProof(
        inputs.seed,
        inputs.shuffled_deck,
        inputs.blinding_factor,
        inputs.deck_commitment,
        inputs.card_commitment,
        inputs.card_position
      );
      setResult({ type: 'Deal', ...res });
    } catch (e) {
      console.error(e);
    }
  };

  const testReveal = async () => {
    try {
      const inputs = {
        blinding_factor: '99999',
        card_value: '5',
        card_commitment: '0x09855b336da066bd39ba5aa3478eb124515980d53118c0adcc232704bfad552b'
      };
      const res = await generateRevealProof(
        inputs.blinding_factor,
        inputs.card_value,
        inputs.card_commitment
      );
      setResult({ type: 'Reveal', ...res });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🪝 useZK Hook Test</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded">
        <div className="mb-2">Status: 
          {isInitializing ? <span className="text-yellow-400"> Initializing...</span> : <span className="text-green-400"> Ready</span>}
        </div>
        <div className="mb-2">Proving: 
          {isProving ? <span className="text-blue-400"> Working...</span> : <span className="text-gray-400"> Idle</span>}
        </div>
        {error && <div className="text-red-400">Error: {error}</div>}
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={testShuffle} 
          disabled={isInitializing || isProving}
          className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-500 disabled:opacity-50"
        >
          Test Shuffle
        </button>
        <button 
          onClick={testDeal} 
          disabled={isInitializing || isProving}
          className="bg-purple-600 px-6 py-3 rounded hover:bg-purple-500 disabled:opacity-50"
        >
          Test Deal
        </button>
        <button 
          onClick={testReveal} 
          disabled={isInitializing || isProving}
          className="bg-pink-600 px-6 py-3 rounded hover:bg-pink-500 disabled:opacity-50"
        >
          Test Reveal
        </button>
      </div>

      {result && (
        <div className="mb-8 p-4 bg-gray-800 rounded border border-green-500">
          <h2 className="text-xl font-bold mb-2">✅ Last Result: {result.type}</h2>
          <div className="font-mono text-sm break-all text-gray-400">
            Proof size: {result.proof.length} bytes
          </div>
        </div>
      )}

      <div className="bg-black p-4 rounded h-64 overflow-y-auto font-mono text-sm">
        {logs.map((l, i) => <div key={i} className="text-green-400">{l}</div>)}
      </div>
    </div>
  );
}
