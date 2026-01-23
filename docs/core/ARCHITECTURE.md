# ZK Card Arena - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Wallet    │  │    Game     │  │   NoirJS    │  │    State    │    │
│  │  Connect    │  │     UI      │  │  Witness    │  │   Manager   │    │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────┘    │
└────────────────────────────────────────────┼───────────────────────────┘
                                             │ witness
                                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (Sunspot Prover)                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Sunspot: Noir witness → Groth16 proof generation                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────┬───────────────────────────┘
                                              │ proof + public_inputs
                                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SOLANA BLOCKCHAIN                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ZK Card Arena Program (Anchor)                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Game      │  │   CPI to    │  │   Card      │              │   │
│  │  │   State     │  │  Verifier   │  │  Reveals    │              │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘              │   │
│  └────────────────────────────┼────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────▼────────────────────────────────────┐   │
│  │       Sunspot Groth16 Verifiers (3 separate programs)           │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │   │
│  │  │ shuffle_proof │ │  deal_proof   │ │ reveal_proof  │         │   │
│  │  │   verifier    │ │   verifier    │ │   verifier    │         │   │
│  │  └───────────────┘ └───────────────┘ └───────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Frontend Layer

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **UI Framework** | Next.js + React | Game interface, state management |
| **Wallet** | @solana/wallet-adapter | Wallet connection, signing |
| **ZK Witness** | NoirJS | Browser-based witness generation |
| **ZK Prover** | Sunspot (backend API) | Groth16 proof generation |
| **RPC Client** | @solana/web3.js | Blockchain communication |
| **Styling** | TailwindCSS | UI styling |

### 2. ZK Circuit Layer (Noir)

| Circuit | Purpose | Inputs | Outputs |
|---------|---------|--------|---------|
| **shuffle_proof** | Prove shuffle is valid permutation | seed, permuted_deck, commitment | proof, public_inputs |
| **deal_proof** | Prove card comes from committed deck | deck_commitment, card_index, card_value | proof |
| **reveal_proof** | Prove revealed card matches commitment | card_commitment, revealed_value, blinding | proof |

### 3. Smart Contract Layer (Anchor)

| Account | Description | Size (bytes) |
|---------|-------------|--------------|
| **Game** | Game session state | ~500 |
| **Player** | Player state in game | ~200 |
| **DeckCommitment** | Committed shuffle hash | 64 |
| **CardReveal** | Revealed card data | 32 |

### 4. Verification Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Groth16 Verifiers** | Sunspot-generated Solana programs | On-chain proof verification (3 separate verifiers) |
| **Verification Keys** | Embedded in verifier programs | Circuit-specific verification |
| **Proving System** | Gnark (via Sunspot) | Groth16 proof generation |

---

## Data Flow

### Game Creation Flow

```
1. Creator (Dealer) - Off-chain:
   ├── Generate random seed
   ├── Create shuffled deck (permutation)
   ├── Generate shuffle proof (Noir)
   └── Compute deck commitment (hash)

2. Creator - On-chain Transaction:
   ├── Submit deck commitment
   ├── Submit shuffle proof
   └── Initialize game state

3. Solana Program:
   ├── CPI to Sunspot shuffle verifier
   ├── Store deck commitment
   └── Mark game as "accepting players"
```

### Card Deal Flow

```
1. Player requests card (on-chain)
   └── Solana Program updates game state

2. Dealer (off-chain):
   ├── Look up next card from shuffled deck
   ├── Generate deal proof
   └── Compute card commitment

3. Dealer transaction (on-chain):
   ├── Submit card commitment
   ├── Submit deal proof
   └── Verify proof links to deck commitment

4. Player sees: "Card dealt" (but value hidden)
```

### Card Reveal Flow

```
1. Game reaches reveal point (stand, bust, hand complete)

2. Dealer (off-chain):
   ├── Prepare reveal data (card value + blinding factor)
   └── Generate reveal proof

3. Dealer transaction (on-chain):
   ├── Submit card value
   ├── Submit reveal proof
   └── Verify card matches commitment

4. Player sees: Actual card value
5. UI computes: Hand total, win/lose
```

---

## State Machine

```
                    ┌──────────────┐
                    │   CREATED    │
                    └──────┬───────┘
                           │ submit_shuffle_proof()
                           ▼
                    ┌──────────────┐
                    │   VERIFIED   │
                    └──────┬───────┘
                           │ join_game()
                           ▼
                    ┌──────────────┐
                    │   PLAYING    │◄────────────────┐
                    └──────┬───────┘                 │
                           │                         │
              ┌────────────┼────────────┐           │
              ▼            ▼            ▼           │
        ┌──────────┐ ┌──────────┐ ┌──────────┐     │
        │   HIT    │ │  STAND   │ │  DOUBLE  │     │
        └────┬─────┘ └────┬─────┘ └────┬─────┘     │
              │            │            │           │
              └────────────┴────────────┘           │
                           │                         │
                           │ (more cards available)──┘
                           │
                           ▼ (hand complete)
                    ┌──────────────┐
                    │  REVEALING   │
                    └──────┬───────┘
                           │ all cards revealed
                           ▼
                    ┌──────────────┐
                    │  COMPLETED   │
                    └──────────────┘
```

---

## Account Structures (Anchor)

```rust
#[account]
pub struct Game {
    pub creator: Pubkey,           // Dealer's wallet
    pub player: Option<Pubkey>,    // Player's wallet
    pub deck_commitment: [u8; 32], // Hash of shuffled deck
    pub shuffle_proof_verified: bool,
    pub state: GameState,
    pub player_cards: Vec<u8>,     // Committed card indices
    pub dealer_cards: Vec<u8>,     // Committed card indices
    pub bet_amount: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameState {
    Created,
    ShuffleVerified,
    PlayerJoined,
    Playing,
    DealerTurn,
    Revealing,
    PlayerWon,
    DealerWon,
    Push,
    Abandoned,
}
```

---

## Security Considerations

### Trust Model

| Party | Trusts | Doesn't Trust |
|-------|--------|---------------|
| **Player** | ZK proofs, Solana consensus | Dealer's word, off-chain data |
| **Dealer** | Own randomness source | - |
| **Observer** | On-chain proofs, circuit code | Any party's claims |

### Attack Vectors & Mitigations

| Attack | Risk | Mitigation |
|--------|------|------------|
| **Dealer chooses favorable shuffle** | HIGH | VRF for seed generation OR honest marketing |
| **Front-running card reveals** | LOW | Reveals happen in single TX |
| **Proof forgery** | NONE | Soundness of Groth16 |
| **Commitment malleability** | LOW | Use Poseidon hash |

### Current Limitation

> ⚠️ **Creator-as-dealer knows the shuffle order.** Current architecture does NOT prevent a malicious dealer from choosing a favorable (but valid) permutation. This should be disclosed or fixed with VRF.

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | 14.x |
| Styling | TailwindCSS | 3.x |
| Wallet | @solana/wallet-adapter | latest |
| ZK Circuits | Noir | v1.0.0-beta.18 |
| Witness Generation | NoirJS | latest |
| Proof Generation | Sunspot (Gnark) | latest |
| Smart Contracts | Anchor | 0.29+ |
| ZK Verification | Sunspot Groth16 Verifiers | On-chain |
| Blockchain | Solana | Devnet → Mainnet |
