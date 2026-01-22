const anchor = require("@coral-xyz/anchor");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Use anchor's bundled web3.js to avoid version conflicts
const { PublicKey, SystemProgram, Keypair, Connection } = anchor.web3;

describe("ZK Card Arena", () => {
  // Configure the client to use devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet from default location
  const walletPath = require("os").homedir() + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load the IDL
  const idlPath = path.join(__dirname, "../target/idl/zk_card_arena.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  // Anchor SDK 0.28.0 Program constructor: (idl, programId, provider)
  const programId = new PublicKey("22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4");
  const program = new anchor.Program(idl, programId, provider);

  // Test data
  const dealer = provider.wallet;
  const player = Keypair.generate();
  let gameId: any;
  let gamePda: any;
  let gameBump: number;

  // Mock deck commitment (in real usage, this would be a Poseidon hash)
  const deckCommitment = new Uint8Array(32).fill(1); // Dummy commitment

  before(async () => {
    // Generate a unique game ID
    gameId = new anchor.BN(Date.now());

    // Derive the game PDA
    [gamePda, gameBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        dealer.publicKey.toBuffer(),
        gameId.toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    console.log("=== Test Setup ===");
    console.log("Program ID:", programId.toBase58());
    console.log("Dealer:", dealer.publicKey.toBase58());
    console.log("Player:", player.publicKey.toBase58());
    console.log("Game PDA:", gamePda.toBase58());
    console.log("Game ID:", gameId.toString());
    console.log("");
  });

  describe("Game Creation", () => {
    it("Creates a new game with deck commitment", async () => {
      console.log("Creating game...");

      const tx = await program.methods
        .createGame(gameId, Array.from(deckCommitment))
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Transaction signature:", tx);

      // Fetch the game account
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("Game created successfully!");
      console.log("  State:", Object.keys(gameAccount.state)[0]);
      console.log("  Dealer:", gameAccount.dealer.toBase58());
      console.log("  Deck Position:", gameAccount.deckPosition);

      // Assertions
      expect(gameAccount.dealer.toBase58()).to.equal(dealer.publicKey.toBase58());
      expect(gameAccount.player).to.be.null;
      expect(Object.keys(gameAccount.state)[0]).to.equal("created");
      expect(gameAccount.shuffleVerified).to.be.false;
      expect(gameAccount.deckPosition).to.equal(0);
      expect(gameAccount.gameId.toString()).to.equal(gameId.toString());
    });
  });

  describe("Shuffle Verification", () => {
    it("Verifies shuffle proof (stub)", async () => {
      console.log("\nVerifying shuffle...");

      // Mock proof and public inputs
      const proof = Buffer.from([1, 2, 3, 4]);
      const publicInputs: number[][] = [];

      const tx = await program.methods
        .verifyShuffle(proof, publicInputs)
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();

      console.log("Transaction signature:", tx);

      // Fetch updated game account
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("Shuffle verified!");
      console.log("  State:", Object.keys(gameAccount.state)[0]);
      console.log("  Shuffle Verified:", gameAccount.shuffleVerified);

      // Assertions
      expect(gameAccount.shuffleVerified).to.be.true;
      expect(Object.keys(gameAccount.state)[0]).to.equal("awaitingPlayer");
    });
  });

  describe("Player Joins Game", () => {
    it("Allows a player to join", async () => {
      console.log("\nPlayer joining game...");

      // Transfer SOL to player for transaction fees (more reliable than airdrop)
      const transferTx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: dealer.publicKey,
          toPubkey: player.publicKey,
          lamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL,
        })
      );
      await provider.sendAndConfirm(transferTx);
      console.log("  Transferred 0.05 SOL to player");

      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePda,
          player: player.publicKey,
        })
        .signers([player])
        .rpc();

      console.log("Transaction signature:", tx);

      // Fetch updated game account
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("Player joined!");
      console.log("  State:", Object.keys(gameAccount.state)[0]);
      console.log("  Player:", gameAccount.player?.toBase58());

      // Assertions
      expect(gameAccount.player?.toBase58()).to.equal(player.publicKey.toBase58());
      expect(Object.keys(gameAccount.state)[0]).to.equal("playing");
    });
  });

  describe("Card Dealing", () => {
    it("Dealer deals cards to player and self", async () => {
      console.log("\nDealing cards...");

      // Deal 2 cards to player
      const playerCard1 = new Uint8Array(32).fill(10); // Dummy commitment
      const playerCard2 = new Uint8Array(32).fill(11);

      // Deal 2 cards to dealer
      const dealerCard1 = new Uint8Array(32).fill(20);
      const dealerCard2 = new Uint8Array(32).fill(21);

      // Deal to player
      await program.methods
        .dealCard(Array.from(playerCard1), true)
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Dealt card 1 to player");

      await program.methods
        .dealCard(Array.from(playerCard2), true)
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Dealt card 2 to player");

      // Deal to dealer
      await program.methods
        .dealCard(Array.from(dealerCard1), false)
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Dealt card 1 to dealer");

      await program.methods
        .dealCard(Array.from(dealerCard2), false)
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Dealt card 2 to dealer");

      // Fetch updated game account
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("Cards dealt!");
      console.log("  Player cards:", gameAccount.playerCards.length);
      console.log("  Dealer cards:", gameAccount.dealerCards.length);
      console.log("  Deck position:", gameAccount.deckPosition);

      // Assertions
      expect(gameAccount.playerCards.length).to.equal(2);
      expect(gameAccount.dealerCards.length).to.equal(2);
      expect(gameAccount.deckPosition).to.equal(4);
    });
  });

  describe("Player Actions", () => {
    it("Player stands", async () => {
      console.log("\nPlayer standing...");

      const tx = await program.methods
        .playerAction({ stand: {} })
        .accounts({
          game: gamePda,
          player: player.publicKey,
        })
        .signers([player])
        .rpc();

      console.log("Transaction signature:", tx);

      // Fetch updated game account
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("Player stood!");
      console.log("  State:", Object.keys(gameAccount.state)[0]);

      // Assertions
      expect(Object.keys(gameAccount.state)[0]).to.equal("dealerTurn");
    });
  });

  describe("Card Reveal & Winner Determination", () => {
    it("Reveals all cards and determines winner", async () => {
      console.log("\nRevealing cards...");

      // Reveal player cards (let's say: Ace + King = 21 Blackjack!)
      await program.methods
        .revealCard(0, 0, true) // Card index 0, value 0 (Ace), is player card
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Revealed player card 1: Ace (0)");

      await program.methods
        .revealCard(1, 12, true) // Card index 1, value 12 (King), is player card
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Revealed player card 2: King (12)");

      // Reveal dealer cards (let's say: 10 + 7 = 17)
      await program.methods
        .revealCard(0, 9, false) // Card index 0, value 9 (10), is dealer card
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Revealed dealer card 1: Ten (9)");

      await program.methods
        .revealCard(1, 6, false) // Card index 1, value 6 (7), is dealer card
        .accounts({
          game: gamePda,
          dealer: dealer.publicKey,
        })
        .rpc();
      console.log("  Revealed dealer card 2: Seven (6)");

      // Fetch final game state
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("\n=== GAME RESULT ===");
      console.log("  Final State:", Object.keys(gameAccount.state)[0]);
      console.log("  Player cards revealed:", gameAccount.playerRevealed);
      console.log("  Dealer cards revealed:", gameAccount.dealerRevealed);

      // Player has Ace (11) + King (10) = 21
      // Dealer has 10 + 7 = 17
      // Player wins!
      expect(Object.keys(gameAccount.state)[0]).to.equal("playerWon");
      console.log("\n  PLAYER WINS WITH BLACKJACK!");
    });
  });

  describe("Final Game State", () => {
    it("Shows complete game summary", async () => {
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log("\n========================================");
      console.log("         FINAL GAME SUMMARY            ");
      console.log("========================================");
      console.log("Game ID:", gameAccount.gameId.toString());
      console.log("Dealer:", gameAccount.dealer.toBase58());
      console.log("Player:", gameAccount.player?.toBase58());
      console.log("State:", Object.keys(gameAccount.state)[0]);
      console.log("Shuffle Verified:", gameAccount.shuffleVerified);
      console.log("Player Cards (revealed):", gameAccount.playerRevealed);
      console.log("Dealer Cards (revealed):", gameAccount.dealerRevealed);
      console.log("Total Cards Dealt:", gameAccount.deckPosition);
      console.log("========================================");
    });
  });
});
