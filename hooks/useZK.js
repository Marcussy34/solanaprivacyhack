import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useZK - Core ZK infrastructure hook for Noir proof generation.
 * 
 * Provides:
 * - Circuit loading and WASM initialization
 * - Witness generation (for commitment computation)
 * - Proof generation for shuffle/deal/reveal circuits
 * - Self-verification of generated proofs
 * 
 * @author Marcus (ZK Engineer)
 * @updated Jan 23, 2026 - Added executeWitness for commitment computation
 */
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
    hash53: null,  // Hash helper for deck commitment (52 cards + seed)
    hash2: null,   // Hash helper for card commitment
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

        // 1.5. Initialize ACVM and ABI WASM modules (required for noir.execute())
        log('Initializing WASM modules...');
        const initACVM = (await import('@noir-lang/acvm_js')).default;
        const initABI = (await import('@noir-lang/noirc_abi')).default;
        await Promise.all([
          initACVM(new URL('/acvm_js_bg.wasm', window.location.origin)),
          initABI(new URL('/noirc_abi_wasm_bg.wasm', window.location.origin)),
        ]);
        log('WASM modules initialized');

        // 2. Initialize Barretenberg
        const bb = await Barretenberg.new();
        barretenbergRef.current = bb;
        log('Barretenberg initialized');

        // 3. Load Circuits (main proofs + hash helpers)
        const [shuffle, deal, reveal, hash53, hash2] = await Promise.all([
          fetch('/shuffle_proof.json').then(r => r.json()),
          fetch('/deal_proof.json').then(r => r.json()),
          fetch('/reveal_proof.json').then(r => r.json()),
          fetch('/hash_53_helper.json').then(r => r.json()),
          fetch('/hash_2_helper.json').then(r => r.json()),
        ]);

        circuitsRef.current = { shuffle, deal, reveal, hash53, hash2 };
        log('Circuits loaded (including hash helpers)');

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

  // =========================================================================
  // WITNESS EXECUTION (for commitment computation without proof)
  // =========================================================================
  
  /**
   * Execute circuit witness generation WITHOUT generating a proof.
   * This is used to compute Poseidon hashes (commitments) by running the circuit.
   * 
   * The circuit's return value appears in returnValue of the execution result.
   * 
   * @param {string} circuitName - 'shuffle', 'deal', or 'reveal'
   * @param {object} inputs - Circuit inputs (private and public)
   * @returns {{ returnValue, witness }} - Return value is the commitment
   */
  const executeWitness = useCallback(async (circuitName, inputs) => {
    if (isInitializing) throw new Error('ZK not initialized');
    if (!circuitsRef.current[circuitName]) throw new Error(`Circuit ${circuitName} not found`);

    try {
      log(`Executing ${circuitName} witness...`);
      
      const circuit = circuitsRef.current[circuitName];
      const Noir = noirRef.current;

      // Create Noir instance
      const noir = new Noir(circuit);

      // Execute to get witness and return value
      const result = await noir.execute(inputs);
      
      log(`Witness executed for ${circuitName}`);
      
      // The return value is the computed commitment
      // It appears in result.returnValue as a hex string
      return {
        witness: result.witness,
        returnValue: result.returnValue,
      };

    } catch (err) {
      console.error(`Witness Error (${circuitName}):`, err);
      setError(err.message);
      throw err;
    }
  }, [isInitializing, log]);

  // =========================================================================
  // PROOF GENERATION
  // =========================================================================

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
      const { witness, returnValue } = await noir.execute(inputs);
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
        publicInputs: proofData.publicInputs,
        returnValue: returnValue, // Also include return value for convenience
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

  // =========================================================================
  // COMMITMENT COMPUTATION HELPERS
  // Using hash helper circuits to compute Poseidon hashes
  // =========================================================================

  /**
   * Compute deck commitment: Poseidon(seed, deck[0], ..., deck[51])
   * 
   * Uses the hash_53_helper circuit to compute the hash.
   * The circuit takes 53 private inputs and returns the hash as public output.
   * 
   * @param {string} seed - Random seed (field element as string)
   * @param {number[]} shuffledDeck - Shuffled deck array [0-51] (52 elements)
   * @returns {string} Deck commitment (hex string)
   */
  const computeDeckCommitment = useCallback(async (seed, shuffledDeck) => {
    if (isInitializing) throw new Error('ZK not initialized');
    if (!circuitsRef.current.hash53) throw new Error('Hash helper circuit not loaded');
    if (shuffledDeck.length !== 52) throw new Error('Deck must have exactly 52 cards');

    log('Computing deck commitment via hash_53_helper circuit...');

    const Noir = noirRef.current;
    const circuit = circuitsRef.current.hash53;
    const noir = new Noir(circuit);

    // Build inputs for hash_53_helper
    // Circuit signature: main(seed, deck: [Field; 52]) -> pub Field
    // Note: NoirJS requires array inputs to be passed as arrays, not individual fields if defined as array in circuit
    const inputs = {
      seed: String(seed),
      deck: shuffledDeck.map(String),
    };

    try {
      // Execute circuit to get the return value (the commitment)
      log('Executing hash_14_helper circuit...');
      console.log('[ZK] Circuit inputs:', { seed: inputs.seed, deck: shuffledDeck });

      const result = await noir.execute(inputs);

      log('Circuit execution complete');
      console.log('[ZK] Circuit result:', result);

      // returnValue is the Poseidon hash - handle type safely
      const commitment = typeof result.returnValue === 'string'
        ? result.returnValue
        : String(result.returnValue);

      log(`Deck commitment computed: ${commitment.slice(0, 20)}...`);

      return commitment;
    } catch (err) {
      console.error('[ZK] computeDeckCommitment failed:', err);
      throw new Error(`Deck commitment computation failed: ${err.message}`);
    }
  }, [isInitializing, log]);

  /**
   * Compute card commitment: Poseidon(card_value, blinding_factor)
   * 
   * Uses the hash_2_helper circuit to compute the hash.
   * 
   * @param {number|string} cardValue - Card value (0-12)
   * @param {string} blindingFactor - Random blinding factor
   * @returns {string} Card commitment (hex string)
   */
  const computeCardCommitment = useCallback(async (cardValue, blindingFactor) => {
    if (isInitializing) throw new Error('ZK not initialized');
    if (!circuitsRef.current.hash2) throw new Error('Hash helper circuit not loaded');
    
    log('Computing card commitment via hash_2_helper circuit...');
    
    const Noir = noirRef.current;
    const circuit = circuitsRef.current.hash2;
    const noir = new Noir(circuit);
    
    // Build inputs for hash_2_helper
    // Circuit signature: main(element_0, element_1) -> pub Field
    const inputs = {
      element_0: String(cardValue),
      element_1: String(blindingFactor),
    };
    
    // Execute circuit to get the return value (the commitment)
    const result = await noir.execute(inputs);
    
    // returnValue is the Poseidon hash
    const commitment = result.returnValue;
    log(`Card commitment computed: ${commitment.slice(0, 20)}...`);
    
    return commitment;
  }, [isInitializing, log]);

  return {
    // State
    isInitializing,
    isProving,
    error,
    logs,
    
    // Core functions
    executeWitness,
    generateProof,
    
    // Proof generation (high-level API)
    generateShuffleProof,
    generateDealProof,
    generateRevealProof,
    
    // Commitment computation (using hash helper circuits)
    computeDeckCommitment,
    computeCardCommitment,
  };
}
