# ZK Card Arena - Glossary

## Cryptography & ZK Terms

### Zero-Knowledge Proof (ZKP)
A cryptographic protocol that allows a prover to convince a verifier that a statement is true without revealing any information beyond the validity of the statement itself.

**Example:** Prove you know a secret number without revealing what that number is.

---

### Noir
A domain-specific language (DSL) for writing zero-knowledge circuits. Developed by Aztec, it compiles to intermediate representations that can be used with various proving systems.

**Usage in Project:** Writing shuffle, deal, and reveal proof circuits.

---

### Circuit
A representation of a computation as a series of arithmetic constraints. In ZK systems, proofs are generated for circuits that verify specific properties.

**Example:** A shuffle circuit verifies that an array is a valid permutation of another array.

---

### Groth16
A zero-knowledge proof system (SNARK) known for very small proof sizes (~256 bytes) and fast verification times. Requires a trusted setup ceremony.

**Usage in Project:** On-chain verification of ZK proofs via Light Protocol.

---

### Constraint
A single arithmetic equation that must be satisfied for a proof to be valid. Circuit complexity is often measured in constraint count.

**Target:** < 50,000 constraints for shuffle proof.

---

### Commitment
A cryptographic scheme that allows you to commit to a value while keeping it hidden, with the ability to reveal it later. Similar to putting a value in a sealed envelope.

**Formula:** `commitment = hash(value, blinding_factor)`

---

### Blinding Factor
Random data added to a commitment to prevent brute-force guessing of the committed value.

---

### Poseidon Hash
A ZK-friendly hash function optimized for use inside circuits. Much more efficient than SHA-256 or Keccak inside ZK proofs.

**Why:** ~5,000 constraints vs. ~30,000+ for SHA-256.

---

### Permutation
A reordering of elements. In our context, a shuffled deck is a permutation of the original deck.

**Proof Goal:** Show shuffled_deck is permutation of [0,1,2,...,12] without revealing the order.

---

### Trusted Setup
A one-time ceremony required by some ZK systems (including Groth16) to generate proving and verification keys. The setup parameters ("toxic waste") must be destroyed afterward.

---

### Public Inputs
Values that are visible to everyone (prover and verifier) in a ZK proof. Used to connect the proof to specific public data.

**Example:** The deck commitment is a public input.

---

### Private Inputs (Witness)
Values known only to the prover. These are the "secrets" that remain hidden.

**Example:** The actual shuffled deck order.

---

## Blockchain Terms

### Solana
A high-performance blockchain with sub-second finality and low transaction costs. Target platform for ZK Card Arena.

---

### Anchor
A framework for building Solana programs (smart contracts) in Rust. Provides macros and tools for account validation, serialization, and testing.

---

### Program
Solana's term for a smart contract. Programs are stateless; state is stored in accounts.

---

### Account
Storage unit on Solana. Contains data and is owned by a program. Game state is stored in accounts.

---

### PDA (Program Derived Address)
An address that is algorithmically derived from seeds and a program ID. Used for deterministic account addresses without a private key.

**Example:** `["game", dealer_pubkey, game_id]` → Game account address.

---

### CU (Compute Units)
Solana's measure of computational work. Each instruction has a cost in CUs, and transactions have a limit (400,000 CU per transaction).

---

### Light Protocol
A Solana protocol providing optimized ZK verification. Includes Groth16 verifier that fits within Solana's compute limits.

---

### RPC (Remote Procedure Call)
API for interacting with blockchain nodes. Used to submit transactions and read state.

---

### Devnet
Solana's test network with free tokens for development. Production-like environment without real value.

---

## Game Terms

### Blackjack
A card game where the goal is to get a hand value as close to 21 as possible without going over. Player competes against a dealer.

---

### Hand
The cards held by a player or dealer.

---

### Hit
Take another card.

---

### Stand
Stop taking cards and end your turn.

---

### Double (Down)
Double your bet, receive exactly one more card, then stand.

---

### Bust
Hand value exceeds 21. Automatic loss.

---

### Push
Tie between player and dealer. Bet is returned.

---

### Hole Card
A face-down card. In Blackjack, the dealer typically has one hole card.

---

## Project-Specific Terms

### Shuffle Proof
ZK proof that the deck is a valid permutation of the original cards without revealing the shuffle order.

---

### Deal Proof
ZK proof that a dealt card comes from the committed deck at a specific position.

---

### Reveal Proof
ZK proof that a revealed card value matches its previous commitment.

---

### Deck Commitment
Hash of the shuffled deck. Published before game starts. Locks in the shuffle order.

---

### Card Commitment
Hash of an individual card value plus blinding factor. Hides the card until reveal.

---

### Mental Poker
A cryptographic protocol for playing card games over the internet without a trusted third party. Ensures no player knows another's cards and the deck is fairly shuffled.

---

### Creator/Dealer
The player who creates a game, generates the shuffle, and acts as the house in Blackjack.

---

### Commit-Reveal Fallback
A simpler scheme (no ZK) where cards are committed with hashes and revealed at the end. Provably fair but not zero-knowledge (deck order revealed at game end).
