# ZK Integration Handover for CKay

**From:** Marcus (ZK Engineer)  
**Date:** Jan 23, 2026  
**Status:** 🎉 **VERIFIERS DEPLOYED TO DEVNET**

---

## TL;DR

All ZK circuits are done. Browser proof generation works (~0.5s per proof). I've built an integration hook (`useZKGame.js`) that handles the entire proof chain. **All 3 Sunspot verifiers are now deployed to Solana devnet!** Your main task is wiring the CPI calls to these verifiers and connecting the game UI.

---

## 🎉 DEPLOYED VERIFIERS (Solana Devnet)

**All verifiers are live on devnet!**

| Verifier | Program ID | Explorer |
|----------|------------|----------|
| **Shuffle** | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` | [View](https://explorer.solana.com/address/6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2?cluster=devnet) |
| **Deal** | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` | [View](https://explorer.solana.com/address/Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC?cluster=devnet) |
| **Reveal** | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` | [View](https://explorer.solana.com/address/HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9?cluster=devnet) |

### Add to Anchor Program

```rust
use solana_program::pubkey;

pub const SHUFFLE_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");
pub const DEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC");
pub const REVEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9");
```

**Cost:** ~4.21 SOL on devnet  
**Verification:** ~200k CU per proof

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

1. **✅ DECISION MADE:** Using Sunspot for on-chain Groth16 verification!
   - Sunspot converts Noir circuits → Groth16 proofs
   - Generates custom Solana verifier programs (one per circuit)
   - No Light Protocol needed
   - **Status:** Verifier programs ready to deploy

2. **For CKay (Anchor integration):**
   - Add CPI calls to the 3 Sunspot verifier programs
   - Verifier Program IDs will be provided by Marcus
   - Instruction data format: `proof_bytes || public_witness_bytes`

3. **For Marcus (Backend API):**
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

1. **✅ RESOLVED:** Using Sunspot for full on-chain Groth16 verification!

2. **✅ Verifier approach:** 3 custom Sunspot verifier programs (one per circuit)
   - Marcus will provide Program IDs
   - CKay adds CPI calls in Anchor program

3. **Backend API setup** - Marcus will create API endpoint for Sunspot proof generation
   - Frontend: NoirJS witness → API → Groth16 proof
   - CKay: Integrate API calls in frontend

4. **Game UI integration point** - Where should `useZKGame` be wired into the game components?

---

## Questions?

Ping me on Discord. The ZK side is solid - just need to connect the dots with your Anchor program.

— Marcus

