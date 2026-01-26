import { useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, ComputeBudgetProgram, Connection } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// Dedicated DEVNET connection for game programs
// (Mainnet connection from WalletProvider is used for ShadowWire payments)
const DEVNET_RPC = process.env.NEXT_PUBLIC_DEVNET_RPC_ENDPOINT || "https://api.devnet.solana.com";
const devnetConnection = new Connection(DEVNET_RPC, "confirmed");

// Program ID from deployed contract (deployed by FBbtn... wallet on Jan 25)
const PROGRAM_ID = new PublicKey("8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx");

// Sunspot Groth16 verifier program IDs (deployed Jan 23 2026, match solana-verifiers/target/*.pk keys)
const SHUFFLE_VERIFIER_PROGRAM_ID = new PublicKey("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");
const DEAL_VERIFIER_PROGRAM_ID = new PublicKey("Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC");
const REVEAL_VERIFIER_PROGRAM_ID = new PublicKey("HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9");

// IDL imported directly (smaller than full IDL, just what we need)
const IDL = {
  version: "0.1.0",
  name: "zk_card_arena",
  instructions: [
    {
      name: "createGame",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "dealer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "gameId", type: "u64" },
        { name: "deckCommitment", type: { array: ["u8", 32] } },
      ],
    },
    {
      name: "verifyShuffle",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "dealer", isMut: false, isSigner: true },
        { name: "shuffleVerifierProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "proof", type: "bytes" },
        { name: "publicInputs", type: "bytes" },
      ],
    },
    {
      name: "joinGame",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "player", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "playerAction",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "player", isMut: false, isSigner: true },
      ],
      args: [
        // SECURITY FIX: Removed cardValue parameter - cards are dealt as commitments only
        // Dealer must call reveal_card with ZK proof to reveal actual card values
        { name: "action", type: { defined: "PlayerActionType" } },
      ],
    },
    {
      name: "dealInitialHand",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "dealer", isMut: false, isSigner: true },
        // SECURITY FIX: Added deal verifier for ZK proof verification
        { name: "dealVerifierProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "cardCommitments", type: { vec: { array: ["u8", 32] } } },
        { name: "initialCardValues", type: { vec: "u8" } },
        // SECURITY FIX: Added proof parameters for deal verification
        { name: "proof", type: "bytes" },
        { name: "publicInputs", type: "bytes" },
      ],
    },
    {
      name: "dealCard",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "dealer", isMut: false, isSigner: true },
      ],
      args: [
        { name: "cardCommitment", type: { array: ["u8", 32] } },
        { name: "toPlayer", type: "bool" },
      ],
    },
    {
      name: "revealCard",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "dealer", isMut: false, isSigner: true },
        { name: "revealVerifierProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "cardIndex", type: "u8" },
        { name: "cardValue", type: "u8" },
        { name: "isPlayerCard", type: "bool" },
        { name: "proof", type: "bytes" },
        { name: "publicInputs", type: "bytes" },
      ],
    },
    {
      name: "dealerPlayTurn",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "dealer", isMut: false, isSigner: true },
        // SECURITY FIX: Added reveal verifier for ZK proof verification
        { name: "revealVerifierProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "dealerCardValues", type: { vec: "u8" } },
        // SECURITY FIX: Added proof parameters for each card reveal
        { name: "proofs", type: { vec: "bytes" } },
        { name: "publicInputsList", type: { vec: "bytes" } },
      ],
    },
  ],
  accounts: [
    {
      name: "Game",
      type: {
        kind: "struct",
        fields: [
          { name: "dealer", type: "publicKey" },
          { name: "player", type: { option: "publicKey" } },
          { name: "deckCommitment", type: { array: ["u8", 32] } },
          { name: "shuffleVerified", type: "bool" },
          { name: "state", type: { defined: "GameState" } },
          { name: "playerCards", type: { vec: { array: ["u8", 32] } } },
          { name: "dealerCards", type: { vec: { array: ["u8", 32] } } },
          { name: "playerRevealed", type: { vec: "u8" } },
          { name: "dealerRevealed", type: { vec: "u8" } },
          { name: "deckPosition", type: "u8" },
          { name: "gameId", type: "u64" },
          { name: "createdAt", type: "i64" },
          { name: "bump", type: "u8" },
          { name: "pendingHit", type: "bool" },
          { name: "committedCards", type: { vec: { array: ["u8", 32] } } },
        ],
      },
    },
  ],
  types: [
    {
      name: "GameState",
      type: {
        kind: "enum",
        variants: [
          { name: "Created" },
          { name: "AwaitingPlayer" },
          { name: "Playing" },
          { name: "DealerTurn" },
          { name: "Revealing" },
          { name: "PlayerWon" },
          { name: "DealerWon" },
          { name: "Push" },
          { name: "Abandoned" },
        ],
      },
    },
    {
      name: "PlayerActionType",
      type: {
        kind: "enum",
        variants: [{ name: "Hit" }, { name: "Stand" }, { name: "Double" }],
      },
    },
  ],
  errors: [
    { code: 6000, name: "InvalidState", msg: "Invalid game state for this action" },
    { code: 6001, name: "GameFull", msg: "Game is already full" },
    { code: 6002, name: "InvalidProof", msg: "Invalid proof" },
    { code: 6003, name: "InvalidVerifier", msg: "Invalid verifier program ID" },
    { code: 6004, name: "Unauthorized", msg: "Not authorized for this action" },
    { code: 6005, name: "AlreadyRevealed", msg: "Card already revealed" },
    { code: 6006, name: "InvalidCard", msg: "Invalid card value" },
    { code: 6007, name: "Timeout", msg: "Game has timed out" },
    { code: 6008, name: "NoMoreCards", msg: "No more cards available in committed deck" },
  ],
};

// Helper: Convert game state enum to string
function parseGameState(state) {
  if (state.created) return "created";
  if (state.awaitingPlayer) return "awaitingPlayer";
  if (state.playing) return "playing";
  if (state.dealerTurn) return "dealerTurn";
  if (state.revealing) return "revealing";
  if (state.playerWon) return "playerWon";
  if (state.dealerWon) return "dealerWon";
  if (state.push) return "push";
  if (state.abandoned) return "abandoned";
  return "unknown";
}

export function useGameProgram() {
  // Use dedicated devnet connection for game programs
  // (WalletProvider connection is mainnet for ShadowWire)
  const connection = devnetConnection;
  const wallet = useWallet();

  // Create Anchor provider and program using devnet connection
  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
  }, [wallet]); // Note: connection is now a module-level constant

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL, PROGRAM_ID, provider);
  }, [provider]);

  // Derive game PDA from dealer pubkey and game ID
  // Seeds: ["game", dealer_pubkey, game_id_le_bytes]
  const getGamePda = useCallback((gameId, dealerPubkey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        dealerPubkey.toBuffer(),
        new BN(gameId).toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // Create a new game (dealer action)
  // deckCommitment: [u8; 32] array from ZK proof generation (required)
  const createGame = useCallback(
    async (gameId, deckCommitment) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const gamePda = getGamePda(gameId, wallet.publicKey);
      if (!deckCommitment) {
        throw new Error("Deck commitment required - ZK proof generation must complete first");
      }
      const commitment = deckCommitment;

      const tx = await program.methods
        .createGame(new BN(gameId), commitment)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { tx, gamePda, gameId, dealer: wallet.publicKey.toBase58() };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Verify shuffle proof via CPI to deployed Sunspot verifier (dealer action)
  const verifyShuffle = useCallback(
    async (gameId, proof, publicInputs, dealerPubkey = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      // proof and publicInputs should be arrays of numbers or Uint8Array
      console.log("[Game] Preparing verifyShuffle args...");

      const proofBytes = proof instanceof Uint8Array ? proof : new Uint8Array(proof);
      const proofBuffer = Buffer.from(proofBytes);

      const publicInputsBytes = publicInputs instanceof Uint8Array ? publicInputs : new Uint8Array(publicInputs);
      const publicInputsBuffer = Buffer.from(publicInputsBytes);

      console.log("[Game] Proof buffer length:", proofBuffer.length);
      console.log("[Game] Public inputs buffer length:", publicInputsBuffer.length);

      const tx = await program.methods
        .verifyShuffle(proofBuffer, publicInputsBuffer)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
          shuffleVerifierProgram: SHUFFLE_VERIFIER_PROGRAM_ID,
        })
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        ])
        .rpc();

      return { tx };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Join an existing game (player action)
  // Requires dealer's pubkey to derive PDA
  const joinGame = useCallback(
    async (gameId, dealerPubkey) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      if (!dealerPubkey) {
        throw new Error("Dealer public key required to join game");
      }

      const dealer = new PublicKey(dealerPubkey);
      const gamePda = getGamePda(gameId, dealer);

      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePda,
          player: wallet.publicKey,
        })
        .rpc();

      return { tx, gamePda };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Deal initial hand + commit cards for future hits (dealer action)
  // Commits 10 cards, deals first 4 (2 player, 2 dealer)
  // Auto-reveals player's 2 cards + dealer's upcard for standard Blackjack UX
  // SECURITY FIX: Now requires ZK deal proof to verify cards come from committed deck
  // cardCommitments, initialCardValues, proof, and publicInputs are required
  const dealInitialHand = useCallback(
    async (gameId, dealerPubkey = null, cardCommitments = null, initialCardValues = null, proof = null, publicInputs = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      if (!cardCommitments) {
        throw new Error("Card commitments required - ZK initialization failed");
      }
      if (!initialCardValues) {
        throw new Error("Card values required - shuffled deck not available");
      }
      if (!proof || !publicInputs) {
        throw new Error("Deal proof required - ZK deal proof generation must complete first");
      }

      const commitments = cardCommitments;
      const cardValues = initialCardValues;

      // Convert proof data to buffers for Anchor serialization
      const proofBuffer = Buffer.from(proof instanceof Uint8Array ? proof : new Uint8Array(proof));
      const publicInputsBuffer = Buffer.from(publicInputs instanceof Uint8Array ? publicInputs : new Uint8Array(publicInputs));

      const tx = await program.methods
        .dealInitialHand(commitments, cardValues, proofBuffer, publicInputsBuffer)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
          dealVerifierProgram: DEAL_VERIFIER_PROGRAM_ID,
        })
        .preInstructions([
          // Deal proof verification requires ~500k CU (similar to reveal)
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        ])
        .rpc();

      return { tx, initialCardValues: cardValues };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Player action (hit, stand, double)
  // Requires dealer's pubkey to derive PDA
  // SECURITY FIX: Removed card value parameter - cards are dealt as commitments only
  // Dealer must call reveal_card with ZK proof to reveal actual values
  const playerAction = useCallback(
    async (gameId, action, dealerPubkey) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      if (!dealerPubkey) {
        throw new Error("Dealer public key required");
      }

      const dealer = new PublicKey(dealerPubkey);
      const gamePda = getGamePda(gameId, dealer);

      // Convert action string to enum
      let actionEnum;

      switch (action.toLowerCase()) {
        case "hit":
          actionEnum = { hit: {} };
          break;
        case "stand":
          actionEnum = { stand: {} };
          break;
        case "double":
          actionEnum = { double: {} };
          break;
        default:
          throw new Error("Invalid action");
      }

      const tx = await program.methods
        .playerAction(actionEnum)
        .accounts({
          game: gamePda,
          player: wallet.publicKey,
        })
        .rpc();

      return { tx };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Reveal a card with ZK proof verification (dealer action)
  // proof and publicInputs are Uint8Array or array of bytes from Groth16 prover
  const revealCard = useCallback(
    async (gameId, cardIndex, cardValue, isPlayerCard, proof, publicInputs, dealerPubkey = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      // Convert proof data to buffers for Anchor serialization
      const proofBuffer = Buffer.from(proof instanceof Uint8Array ? proof : new Uint8Array(proof));
      const publicInputsBuffer = Buffer.from(publicInputs instanceof Uint8Array ? publicInputs : new Uint8Array(publicInputs));

      const tx = await program.methods
        .revealCard(cardIndex, cardValue, isPlayerCard, proofBuffer, publicInputsBuffer)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
          revealVerifierProgram: REVEAL_VERIFIER_PROGRAM_ID,
        })
        .preInstructions([
          // Reveal proof verification requires ~500k CU
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        ])
        .rpc();

      return { tx };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Reveal all unrevealed cards in one batched transaction (dealer action)
  // Each card reveal requires a ZK proof - proofs must match card values in order
  // playerStartIndex/dealerStartIndex: start revealing from these indices
  // playerProofs/dealerProofs: arrays of { proof, publicInputs } for each card
  const revealAllCards = useCallback(
    async (gameId, playerCardValues, dealerCardValues, playerProofs, dealerProofs, dealerPubkey = null, playerStartIndex = 0, dealerStartIndex = 0) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      // Build all reveal instructions
      const instructions = [];

      // Add compute budget for multiple reveals (600k CU per reveal)
      const totalReveals = playerCardValues.length + dealerCardValues.length;
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: Math.min(totalReveals * 600_000, 1_400_000) })
      );

      // Reveal player cards starting from playerStartIndex
      for (let i = 0; i < playerCardValues.length; i++) {
        const cardIndex = playerStartIndex + i;
        const proofData = playerProofs[i];
        const proofBuffer = Buffer.from(proofData.proof instanceof Uint8Array ? proofData.proof : new Uint8Array(proofData.proof));
        const publicInputsBuffer = Buffer.from(proofData.publicInputs instanceof Uint8Array ? proofData.publicInputs : new Uint8Array(proofData.publicInputs));

        const ix = await program.methods
          .revealCard(cardIndex, playerCardValues[i], true, proofBuffer, publicInputsBuffer)
          .accounts({
            game: gamePda,
            dealer: wallet.publicKey,
            revealVerifierProgram: REVEAL_VERIFIER_PROGRAM_ID,
          })
          .instruction();
        instructions.push(ix);
      }

      // Reveal dealer cards starting from dealerStartIndex
      for (let i = 0; i < dealerCardValues.length; i++) {
        const cardIndex = dealerStartIndex + i;
        const proofData = dealerProofs[i];
        const proofBuffer = Buffer.from(proofData.proof instanceof Uint8Array ? proofData.proof : new Uint8Array(proofData.proof));
        const publicInputsBuffer = Buffer.from(proofData.publicInputs instanceof Uint8Array ? proofData.publicInputs : new Uint8Array(proofData.publicInputs));

        const ix = await program.methods
          .revealCard(cardIndex, dealerCardValues[i], false, proofBuffer, publicInputsBuffer)
          .accounts({
            game: gamePda,
            dealer: wallet.publicKey,
            revealVerifierProgram: REVEAL_VERIFIER_PROGRAM_ID,
          })
          .instruction();
        instructions.push(ix);
      }

      // Send all in one transaction
      const { Transaction } = await import("@solana/web3.js");
      const transaction = new Transaction().add(...instructions);
      const tx = await provider.sendAndConfirm(transaction);

      return { tx };
    },
    [program, wallet.publicKey, getGamePda, provider]
  );

  // Dealer plays their turn: reveals hole card, auto-hits until 17+, determines winner
  // SECURITY FIX: Now requires ZK reveal proofs for each card value
  //
  // Parameters:
  // - explicitCardValues: Array of card values [hole_card, hit1, hit2, ...]
  // - proofs: Array of Groth16 proof byte arrays, one per card value
  // - publicInputsList: Array of public input byte arrays, one per card value
  const dealerPlayTurn = useCallback(
    async (gameId, dealerPubkey = null, explicitCardValues = null, proofs = null, publicInputsList = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      if (!explicitCardValues) {
        throw new Error("Card values required for dealer turn - shuffled deck not available");
      }
      // SECURITY FIX: Require ZK proofs for each card
      if (!proofs || !publicInputsList) {
        throw new Error("ZK proofs required for dealer turn - cannot reveal cards without proof");
      }
      if (proofs.length !== explicitCardValues.length || publicInputsList.length !== explicitCardValues.length) {
        throw new Error("Proof count must match card count - need one proof per card");
      }

      const dealerCardValues = explicitCardValues;

      // Convert proofs to Buffer format for Anchor serialization
      const proofsBuffers = proofs.map(p =>
        Buffer.from(p instanceof Uint8Array ? p : new Uint8Array(p))
      );
      const publicInputsBuffers = publicInputsList.map(pi =>
        Buffer.from(pi instanceof Uint8Array ? pi : new Uint8Array(pi))
      );

      const tx = await program.methods
        .dealerPlayTurn(dealerCardValues, proofsBuffers, publicInputsBuffers)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
          revealVerifierProgram: REVEAL_VERIFIER_PROGRAM_ID,
        })
        .preInstructions([
          // SECURITY FIX: Multiple CPI calls require higher compute budget
          // Each reveal verification ~500k CU, up to 5 cards possible
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ])
        .rpc();

      return { tx };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Fetch game account data
  // Requires dealer's pubkey to derive PDA
  const fetchGame = useCallback(
    async (gameId, dealerPubkey) => {
      if (!program) {
        throw new Error("Program not initialized");
      }

      if (!dealerPubkey) {
        throw new Error("Dealer public key required to fetch game");
      }

      const dealer = new PublicKey(dealerPubkey);
      const gamePda = getGamePda(gameId, dealer);

      try {
        const gameAccount = await program.account.game.fetch(gamePda);

        return {
          dealer: gameAccount.dealer.toBase58(),
          player: gameAccount.player?.toBase58() || null,
          deckCommitment: Array.from(gameAccount.deckCommitment),
          shuffleVerified: gameAccount.shuffleVerified,
          state: parseGameState(gameAccount.state),
          playerCards: gameAccount.playerCards.map((c) => Array.from(c)),
          dealerCards: gameAccount.dealerCards.map((c) => Array.from(c)),
          playerRevealed: Array.from(gameAccount.playerRevealed),
          dealerRevealed: Array.from(gameAccount.dealerRevealed),
          deckPosition: gameAccount.deckPosition,
          gameId: gameAccount.gameId.toString(),
          createdAt: gameAccount.createdAt.toNumber(),
          bump: gameAccount.bump,
          pendingHit: gameAccount.pendingHit,
          committedCards: gameAccount.committedCards?.map((c) => Array.from(c)) || [],
          pda: gamePda.toBase58(),
        };
      } catch (err) {
        if (err.message.includes("Account does not exist")) {
          return null;
        }
        throw err;
      }
    },
    [program, getGamePda]
  );

  // Subscribe to game account changes
  // Requires dealer's pubkey to derive PDA
  const subscribeToGame = useCallback(
    (gameId, dealerPubkey, callback) => {
      if (!program || !dealerPubkey) return () => {};

      const dealer = new PublicKey(dealerPubkey);
      const gamePda = getGamePda(gameId, dealer);

      const subscriptionId = connection.onAccountChange(
        gamePda,
        async (accountInfo) => {
          try {
            const decoded = program.coder.accounts.decode(
              "Game",
              accountInfo.data
            );
            callback({
              dealer: decoded.dealer.toBase58(),
              player: decoded.player?.toBase58() || null,
              deckCommitment: Array.from(decoded.deckCommitment),
              shuffleVerified: decoded.shuffleVerified,
              state: parseGameState(decoded.state),
              playerCards: decoded.playerCards.map((c) => Array.from(c)),
              dealerCards: decoded.dealerCards.map((c) => Array.from(c)),
              playerRevealed: Array.from(decoded.playerRevealed),
              dealerRevealed: Array.from(decoded.dealerRevealed),
              deckPosition: decoded.deckPosition,
              gameId: decoded.gameId.toString(),
              createdAt: decoded.createdAt.toNumber(),
              bump: decoded.bump,
              pendingHit: decoded.pendingHit,
              committedCards: decoded.committedCards?.map((c) => Array.from(c)) || [],
              pda: gamePda.toBase58(),
            });
          } catch (err) {
            console.error("Error decoding game account:", err);
          }
        },
        "confirmed"
      );

      // Return unsubscribe function
      return () => {
        connection.removeAccountChangeListener(subscriptionId);
      };
    },
    [program, getGamePda] // connection is now module-level devnetConnection
  );

  return {
    program,
    programId: PROGRAM_ID,
    connected: !!program,

    // Actions
    createGame,
    verifyShuffle,
    joinGame,
    dealInitialHand,
    playerAction,
    revealCard,
    revealAllCards,
    dealerPlayTurn,

    // Queries
    fetchGame,
    subscribeToGame,
    getGamePda,
  };
}
