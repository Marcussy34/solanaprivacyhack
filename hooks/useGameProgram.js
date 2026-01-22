import { useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// Program ID from deployed contract
const PROGRAM_ID = new PublicKey("22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4");

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
      ],
      args: [
        { name: "proof", type: "bytes" },
        { name: "publicInputs", type: { vec: { array: ["u8", 32] } } },
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
      args: [{ name: "action", type: { defined: "PlayerActionType" } }],
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
      ],
      args: [
        { name: "cardIndex", type: "u8" },
        { name: "cardValue", type: "u8" },
        { name: "isPlayerCard", type: "bool" },
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
    { code: 6003, name: "Unauthorized", msg: "Not authorized for this action" },
    { code: 6004, name: "AlreadyRevealed", msg: "Card already revealed" },
    { code: 6005, name: "InvalidCard", msg: "Invalid card value" },
    { code: 6006, name: "Timeout", msg: "Game has timed out" },
  ],
};

// Helper: Generate a random 32-byte commitment (for demo purposes)
// In production, this would come from the ZK circuit
function generateRandomCommitment() {
  const commitment = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(commitment);
  } else {
    for (let i = 0; i < 32; i++) {
      commitment[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(commitment);
}

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
  const { connection } = useConnection();
  const wallet = useWallet();

  // Create Anchor provider and program
  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
  }, [connection, wallet]);

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
  const createGame = useCallback(
    async (gameId) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const gamePda = getGamePda(gameId, wallet.publicKey);
      const deckCommitment = generateRandomCommitment();

      const tx = await program.methods
        .createGame(new BN(gameId), deckCommitment)
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

  // Verify shuffle proof (dealer action)
  const verifyShuffle = useCallback(
    async (gameId, dealerPubkey = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      // For demo: use empty proof (contract accepts any proof currently)
      // In production: generate real ZK proof with NoirJS
      const mockProof = Buffer.from([0]);
      const mockPublicInputs = [generateRandomCommitment()];

      const tx = await program.methods
        .verifyShuffle(mockProof, mockPublicInputs)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
        })
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

  // Deal a card (dealer action)
  const dealCard = useCallback(
    async (gameId, toPlayer, dealerPubkey = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);
      const cardCommitment = generateRandomCommitment();

      const tx = await program.methods
        .dealCard(cardCommitment, toPlayer)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
        })
        .rpc();

      return { tx };
    },
    [program, wallet.publicKey, getGamePda]
  );

  // Player action (hit, stand, double)
  // Requires dealer's pubkey to derive PDA
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

  // Reveal a card (dealer action)
  const revealCard = useCallback(
    async (gameId, cardIndex, cardValue, isPlayerCard, dealerPubkey = null) => {
      if (!program || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const dealer = dealerPubkey ? new PublicKey(dealerPubkey) : wallet.publicKey;
      const gamePda = getGamePda(gameId, dealer);

      const tx = await program.methods
        .revealCard(cardIndex, cardValue, isPlayerCard)
        .accounts({
          game: gamePda,
          dealer: wallet.publicKey,
        })
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
    [program, connection, getGamePda]
  );

  return {
    program,
    programId: PROGRAM_ID,
    connected: !!program,

    // Actions
    createGame,
    verifyShuffle,
    joinGame,
    dealCard,
    playerAction,
    revealCard,

    // Queries
    fetchGame,
    subscribeToGame,
    getGamePda,
  };
}
