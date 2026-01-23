# ZK Integration Handover for CKay

**From:** Marcus (ZK Engineer)  
**Date:** Jan 23, 2026  
**Branch:** `marcus`

---

## TL;DR

All ZK circuits are done. Browser proof generation works (~0.5s per proof). I've built an integration hook (`useZKGame.js`) that handles the entire proof chain. **Your main task is wiring the on-chain verifier and connecting the game UI.**

---

## What's Complete (Marcus Side)

### ✅ All 3 ZK Circuits

| Circuit | Purpose | Constraints | Browser Time | Status |
|---------|---------|-------------|--------------|--------|
| `shuffle_proof` | Prove deck is valid permutation | 812 | 0.54s | ✅ |
| `deal_proof` | Prove card belongs to committed deck | 1,111 | 0.61s | ✅ |
| `reveal_proof` | Prove revealed value matches commitment | 333 | 0.37s | ✅ |

### ✅ Integration Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| `useZK` | Low-level proof generation | `hooks/useZK.js` |
| `useZKGame` | High-level game integration | `hooks/useZKGame.js` |

### ✅ Helper Circuits for Commitment Computation

| Circuit | Purpose | Location |
|---------|---------|----------|
| `hash_14_helper` | Compute deck commitment | `circuits/hash_14_helper/` |
| `hash_2_helper` | Compute card commitment | `circuits/hash_2_helper/` |

### ✅ Test Pages

| Page | Purpose | URL |
|------|---------|-----|
| `zk-test.js` | Test individual proof generation | `/zk-test` |
| `zk-hook-test.js` | Test useZK hook | `/zk-hook-test` |
| `zk-game-test.js` | **End-to-end proof chain test** | `/zk-game-test` |

---

## How to Use the ZK Integration

### The `useZKGame` Hook

This is the main integration point. Import and use it in your game components:

```javascript
import { useZKGame } from '../hooks/useZKGame';

function GameComponent() {
  const {
    // State
    isReady,           // true when ZK circuits loaded
    isProving,         // true during proof generation
    status,            // 'idle' | 'shuffling' | 'dealing' | 'revealing' | 'error'
    deckCommitment,    // Public commitment (send to chain)
    
    // Actions
    initializeGame,    // Creates deck, shuffle proof
    dealCardAtPosition,// Deals card, creates deal proof
    revealCard,        // Reveals card, creates reveal proof
    resetGame,         // Reset for new game
    
    // Data formatters for on-chain submission
    formatShuffleForChain,
    formatDealForChain,
    formatRevealForChain,
  } = useZKGame();
  
  // ... your game logic
}
```

### Game Flow with ZK Proofs

```javascript
// 1. SHUFFLE PHASE (when creating game)
const handleCreateGame = async () => {
  const result = await initializeGame();
  // result = {
  //   seed: "12345...",           // PRIVATE - don't send to chain
  //   shuffledDeck: [5,2,11,...], // PRIVATE - don't send to chain
  //   deckCommitment: "0x04b91d7c...",  // PUBLIC - send to chain
  //   proof: Uint8Array(16256),   // Send to chain for verification
  //   publicInputs: string[15],   // Send to chain
  // }
  
  // Call your Anchor program
  await createGame(deckCommitment);
  await verifyShuffle(result.proof, result.publicInputs);
};

// 2. DEAL PHASE (when dealing cards)
const handleDealCard = async (position) => {
  const result = await dealCardAtPosition(position);
  // result = {
  //   position: 0,
  //   cardValue: 5,                // PRIVATE until reveal
  //   cardCommitment: "0x09855b33...", // PUBLIC - send to chain
  //   proof: Uint8Array(16256),    // Send to chain
  //   publicInputs: string[4],     // Send to chain
  // }
  
  // Call your Anchor program
  await dealCard(result.cardCommitment, result.proof, result.publicInputs);
};

// 3. REVEAL PHASE (at game end)
const handleRevealCard = async (position) => {
  const result = await revealCard(position);
  // result = {
  //   cardValue: 5,                // NOW PUBLIC
  //   cardCommitment: "0x09855b33...",
  //   proof: Uint8Array(16256),
  //   publicInputs: string[3],
  // }
  
  // Call your Anchor program
  await revealCard(result.cardValue, result.proof, result.publicInputs);
};
```

### Data Format for On-Chain Submission

The hook provides formatter functions that convert proofs to the exact format your Anchor program needs:

```javascript
// Get formatted data ready for Solana
const shuffleData = formatShuffleForChain();
// {
//   proof: Uint8Array(16256),
//   deckCommitment: [u8; 32],
//   originalDeck: [[u8; 32]; 13],
// }

const dealData = formatDealForChain(position);
// {
//   proof: Uint8Array(16256),
//   deckCommitment: [u8; 32],
//   cardCommitment: [u8; 32],
//   cardPosition: [u8; 32],
// }

const revealData = formatRevealForChain(position);
// {
//   proof: Uint8Array(16256),
//   cardValue: [u8; 32],
//   cardCommitment: [u8; 32],
// }
```

---

## Proof Verification (Your Part)

### Current Status in Anchor Program

Looking at `programs/zk-card-arena/src/lib.rs`, the `verify_shuffle` instruction currently has mock verification:

```rust
// TODO: Replace with actual ZK verification
if proof.len() < 100 {
    return Err(GameError::InvalidProof.into());
}
```

### What You Need to Implement

1. **Choose verification approach:**
   - **Option A:** Use Light Protocol's Groth16 verifier (requires proof conversion)
   - **Option B:** Implement UltraHonk verifier on Solana (complex)
   - **Option C:** Off-chain verification with on-chain commitment checks (simplest)

2. **For Option A (Light Protocol):**
   - I'll need to convert UltraHonk proofs to Groth16 format
   - You integrate Light Protocol's verifier CPI

3. **For Option C (Simplest path for hackathon):**
   - Store commitments on-chain
   - Verify proofs off-chain (trusted server or client-side)
   - On-chain only checks commitment linkage

### Recommended Approach for Hackathon

Given time constraints, I recommend **Option C** for the demo:

```rust
// On-chain: Just store and link commitments
pub fn verify_shuffle(ctx: Context<VerifyShuffle>, deck_commitment: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.deck_commitment = deck_commitment;
    game.shuffle_verified = true;  // Trust client-side verification for now
    Ok(())
}

pub fn deal_card(ctx: Context<DealCard>, card_commitment: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    // Store card commitment, link to deck
    game.player_cards.push(card_commitment);
    Ok(())
}

pub fn reveal_card(ctx: Context<RevealCard>, card_value: u8, position: u8) -> Result<()> {
    let game = &mut ctx.accounts.game;
    // Verify card_value matches commitment (client proves this with ZK)
    // For demo: trust the reveal, store the value
    game.revealed_cards.push((position, card_value));
    Ok(())
}
```

The ZK proofs are still generated and verified client-side, proving fairness. The on-chain program just stores the commitments for transparency.

---

## Public Input Formats (Reference)

### Shuffle Proof - 15 Public Inputs

| Index | Field | Size |
|-------|-------|------|
| 0 | `deck_commitment` | 32 bytes |
| 1-13 | `original_deck[0..12]` | 32 bytes each |
| 14 | `deck_commitment` (return) | 32 bytes |

### Deal Proof - 4 Public Inputs

| Index | Field | Size |
|-------|-------|------|
| 0 | `deck_commitment` | 32 bytes |
| 1 | `card_commitment` | 32 bytes |
| 2 | `card_position` | 32 bytes |
| 3 | `card_commitment` (return) | 32 bytes |

### Reveal Proof - 3 Public Inputs

| Index | Field | Size |
|-------|-------|------|
| 0 | `card_value` | 32 bytes |
| 1 | `card_commitment` | 32 bytes |
| 2 | `card_commitment` (return) | 32 bytes |

All fields are 32-byte big-endian.

---

## Commitment Linkage (Critical!)

The proofs are linked by shared commitments:

```
shuffle_proof.deck_commitment == deal_proof.deck_commitment
deal_proof.card_commitment   == reveal_proof.card_commitment
```

**Your on-chain program MUST verify these links:**

```rust
// When dealing, verify deck_commitment matches the game's committed deck
require!(
    deal_proof.deck_commitment == game.deck_commitment,
    GameError::DeckCommitmentMismatch
);

// When revealing, verify card_commitment matches what was dealt
require!(
    reveal_proof.card_commitment == game.player_cards[position],
    GameError::CardCommitmentMismatch
);
```

---

## Files to Review

| File | What |
|------|------|
| `hooks/useZKGame.js` | Main integration hook - **START HERE** |
| `hooks/useZK.js` | Low-level proof generation |
| `pages/zk-game-test.js` | Working example of full proof chain |
| `marcus-docs/PROOF_FORMAT.md` | Detailed proof format spec |
| `marcus-docs/flow.md` | Visual proof flow diagrams |

---

## Testing the ZK Integration

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/zk-game-test`
3. Click "Start Full Test" - this runs shuffle → deal → reveal
4. Open browser console to see detailed logs
5. All proofs should generate and verify locally

---

## What I Still Need From You

1. **Confirmation on verification approach** - Are we doing full on-chain verification or commitment-only for the hackathon?

2. **If full verification:** Which verifier library? Light Protocol? Custom?

3. **Game UI integration point** - Where should I wire `useZKGame` into the game components? I can do this once you confirm the game flow.

---

## Questions?

Ping me on Discord. The ZK side is solid - just need to connect the dots with your Anchor program.

— Marcus

