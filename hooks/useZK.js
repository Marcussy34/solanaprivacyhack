import { useState, useEffect, useCallback, useRef } from 'react';

export function useZK() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProving, setIsProving] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Refs to hold the loaded modules and circuits
  const noirRef = useRef(null);
  const backendRef = useRef(null);
  const barretenbergRef = useRef(null);
  const circuitsRef = useRef({
    shuffle: null,
    deal: null,
    reveal: null,
  });

  const log = useCallback((message) => {
    console.log(`[ZK] ${message}`);
    setLogs(prev => [...prev, message]);
  }, []);

  // Initialize WASM and load circuits on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        log('Initializing ZK infrastructure...');
        
        // 1. Load Modules
        const { Noir } = await import('@noir-lang/noir_js');
        const { Barretenberg, UltraHonkBackend } = await import('@aztec/bb.js');
        
        // 2. Initialize Barretenberg
        const bb = await Barretenberg.new();
        barretenbergRef.current = bb;
        log('Barretenberg initialized');

        // 3. Load Circuits
        const [shuffle, deal, reveal] = await Promise.all([
          fetch('/shuffle_proof.json').then(r => r.json()),
          fetch('/deal_proof.json').then(r => r.json()),
          fetch('/reveal_proof.json').then(r => r.json()),
        ]);

        circuitsRef.current = { shuffle, deal, reveal };
        log('Circuits loaded');

        // 4. Store classes for later use
        noirRef.current = Noir;
        backendRef.current = UltraHonkBackend;

        if (mounted) setIsInitializing(false);
        log('ZK Ready');

      } catch (err) {
        console.error('ZK Init Error:', err);
        if (mounted) {
          setError(err.message);
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (barretenbergRef.current) {
        // cleanup if needed, though usually kept alive for app session
      }
    };
  }, [log]);

  // Helper to generate proof for a specific circuit
  const generateProof = useCallback(async (circuitName, inputs) => {
    if (isInitializing) throw new Error('ZK not initialized');
    if (!circuitsRef.current[circuitName]) throw new Error(`Circuit ${circuitName} not found`);

    setIsProving(true);
    setError(null);
    const startTime = performance.now();

    try {
      log(`Starting ${circuitName} proof...`);
      
      const circuit = circuitsRef.current[circuitName];
      const Noir = noirRef.current;
      const UltraHonkBackend = backendRef.current;
      const bb = barretenbergRef.current;

      // Setup Noir & Backend for this specific circuit
      const noir = new Noir(circuit);
      const backend = new UltraHonkBackend(circuit.bytecode, bb);

      // 1. Generate Witness
      const { witness } = await noir.execute(inputs);
      log('Witness generated');

      // 2. Generate Proof
      const proofData = await backend.generateProof(witness);
      log(`Proof generated in ${((performance.now() - startTime)/1000).toFixed(2)}s`);

      // 3. Verify (Self-check)
      const isValid = await backend.verifyProof(proofData);
      if (!isValid) throw new Error('Generated proof failed self-verification');
      log('Proof verified locally');

      return {
        proof: proofData.proof,
        publicInputs: proofData.publicInputs
      };

    } catch (err) {
      console.error(`Proof Error (${circuitName}):`, err);
      setError(err.message);
      throw err;
    } finally {
      setIsProving(false);
    }
  }, [isInitializing, log]);

  // Public API
  const generateShuffleProof = useCallback((seed, shuffledDeck, deckCommitment, originalDeck) => {
    return generateProof('shuffle', {
      seed,
      shuffled_deck: shuffledDeck,
      deck_commitment: deckCommitment,
      original_deck: originalDeck
    });
  }, [generateProof]);

  const generateDealProof = useCallback((seed, shuffledDeck, blinding, deckCommitment, cardCommitment, position) => {
    return generateProof('deal', {
      seed,
      shuffled_deck: shuffledDeck,
      blinding_factor: blinding,
      deck_commitment: deckCommitment,
      card_commitment: cardCommitment,
      card_position: position
    });
  }, [generateProof]);

  const generateRevealProof = useCallback((blinding, value, commitment) => {
    return generateProof('reveal', {
      blinding_factor: blinding,
      card_value: value,
      card_commitment: commitment
    });
  }, [generateProof]);

  return {
    isInitializing,
    isProving,
    error,
    logs,
    generateShuffleProof,
    generateDealProof,
    generateRevealProof
  };
}
