# ZK Card Arena - Bug Fix Journey

**Project:** ZK Card Arena - Provably Fair Blackjack on Solana
**Hackathon:** Solana Privacy Hackathon (Feb 1, 2026)
**Date:** January 24-26, 2026

This document chronicles the debugging journey from initial "Transaction Simulation Failed" errors to a fully working ZK-verified card game.

---

## Table of Contents

1. [Overview](#overview)
2. [Issue 1: Shuffle Verifier VK/PK Mismatch](#issue-1-shuffle-verifier-vkpk-mismatch)
3. [Issue 2: Payment Before Join Bug](#issue-2-payment-before-join-bug)
4. [Issue 3: BetSelector Not Showing for Joining Players](#issue-3-betselector-not-showing-for-joining-players)
5. [Issue 4: Dealer Bet Notification (Cross-Browser)](#issue-4-dealer-bet-notification-cross-browser)
6. [Issue 5: Deal Verifier VK/PK Mismatch](#issue-5-deal-verifier-vkpk-mismatch)
7. [Issue 6: Reveal Verifier VK/PK Mismatch](#issue-6-reveal-verifier-vkpk-mismatch)
8. [Issue 7: Claim Button Showing to Wrong User](#issue-7-claim-button-showing-to-wrong-user)
9. [Issue 8: Dealer Turn Had No ZK Verification (CRITICAL)](#issue-8-dealer-turn-had-no-zk-verification-critical)
10. [Issue 9: Program ID Mismatch After Deployment](#issue-9-program-id-mismatch-after-deployment)
11. [Issue 10: Verifier IDs Pointing to Wrong Programs](#issue-10-verifier-ids-pointing-to-wrong-programs)
12. [Issue 11: Transaction Too Large - Dealer Turn with Multiple Cards](#issue-11-transaction-too-large---dealer-turn-with-multiple-cards)
13. [Summary of All Verifier Deployments](#summary-of-all-verifier-deployments)
14. [Lessons Learned](#lessons-learned)

---

## Overview

ZK Card Arena uses three Groth16 ZK circuits for provably fair gameplay:

| Circuit | Purpose | Verifier Program |
|---------|---------|------------------|
| `shuffle_proof` | Prove deck is valid permutation | Shuffle Verifier |
| `deal_proof` | Prove card comes from committed deck | Deal Verifier |
| `reveal_proof` | Prove revealed card matches commitment | Reveal Verifier |

Each circuit requires a **matching Proving Key (PK) and Verification Key (VK)**:
- **PK** - Used client-side to generate proofs
- **VK** - Embedded in on-chain verifier program

**If PK and VK don't match, proof verification fails with "invalid instruction data".**

---

## Issue 1: Shuffle Verifier VK/PK Mismatch

### Symptom
```
Error: Transaction simulation failed
Program log: Proof verification failed!
Program 6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2 failed: invalid instruction data
```

Game stuck in `Created` state after dealer creates game. Player couldn't join.

### Root Cause
The shuffle verifier was deployed with a VK that didn't match the PK being used for proof generation.

```
circuits/target/shuffle_proof.pk     → Used for proof generation
solana-verifiers/target/shuffle_proof.pk → DIFFERENT file (stale)
```

### Solution
Copy the correct PK to the solana-verifiers directory:

```bash
cp circuits/target/shuffle_proof.pk solana-verifiers/target/shuffle_proof.pk
```

### Files Changed
- `solana-verifiers/target/shuffle_proof.pk` (overwritten)

---

## Issue 2: Payment Before Join Bug

### Symptom
Player pays SOL to house wallet, then join fails → **Player loses SOL without entering game!**

### Root Cause
The original flow was:
```
1. Player clicks "Join"
2. BetSelector shows → Player pays SOL (MAINNET)
3. handleJoinGame() called (DEVNET)
4. If join fails → SOL already sent, can't recover!
```

Payment and join were NOT atomic - on different networks.

### Solution
Reverse the order: **Join first, then payment.**

```javascript
// NEW FLOW in handleStartJoinBetting():
1. Pre-validate: fetchGame() to check state === "AwaitingPlayer"
2. joinGame() on devnet - If fails, stop here (no payment)
3. Only if join succeeds → Show BetSelector for payment
```

### Files Changed
- `pages/game.js` - `handleStartJoinBetting()` function rewritten

---

## Issue 3: BetSelector Not Showing for Joining Players

### Symptom
Player successfully joins game but never sees the deposit/betting popup.

### Root Cause
Race condition between state updates:

```
1. handleStartJoinBetting() succeeds:
   - setGameState(GAME_STATES.BETTING) ← Sets to BETTING

2. useEffect([gameId, dealerPubkey]) TRIGGERS immediately after:
   - fetchGame() returns on-chain state = "playing"
   - setGameState(data.state) ← OVERWRITES to "playing"

3. Result: gameState = "playing" (not BETTING)
   - BetSelector condition fails, never renders!
```

### Solution
Add a ref to skip on-chain state sync during betting flows:

```javascript
// At component top
const skipOnchainStateSync = useRef(false);

// In handleStartJoinBetting (before setting BETTING state)
skipOnchainStateSync.current = true;

// In handleBetPlaced (after betting completes)
skipOnchainStateSync.current = false;

// In useEffect subscription
if (!skipOnchainStateSync.current) {
  setGameState(data.state);
}
```

### Files Changed
- `pages/game.js` - Added `skipOnchainStateSync` ref and guards

---

## Issue 4: Dealer Bet Notification (Cross-Browser)

### Symptom
After player deposits, dealer should see "Match Bet" popup. But dealer sees nothing.

### Root Cause
Original implementation used `localStorage` to share bet amount:

```
Player (Browser A):              Dealer (Browser B):
localStorage.setItem(...)        localStorage.getItem(...)
                                 → Returns NULL!
                                 (Different browser = different localStorage)
```

**localStorage is browser-local, not shared across devices!**

### Solution
For hackathon demo, use manual communication:

1. Player sees: "Tell the dealer: I bet 0.1 SOL"
2. Dealer sees input: "Enter player's bet amount"
3. Dealer enters amount → BetSelector shows with fixed amount

```javascript
// Dealer UI when player joins
{isDealer && gameData?.player && !playerBetAmount && (
  <div>
    <h3>Player Joined! Enter Their Bet Amount</h3>
    <input
      type="number"
      value={manualBetInput}
      onChange={(e) => setManualBetInput(e.target.value)}
    />
    <button onClick={() => setPlayerBetAmount(parseFloat(manualBetInput))}>
      Confirm
    </button>
  </div>
)}
```

### Files Changed
- `pages/game.js` - Added `manualBetInput` state and dealer UI for entering bet amount

---

## Issue 5: Deal Verifier VK/PK Mismatch

### Symptom
```
[Game] Auto-reveal error: game.js:406
SendTransactionError: Transaction simulation failed:
Error processing Instruction 1: invalid instruction data
Program Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC failed
```

Dealer clicks "Deal Cards" → Proof generation succeeds but on-chain verification fails.

### Root Cause
Same as Issue 1 - the deal verifier's VK didn't match the PK.

```
deal_proof.pk: Jan 24 14:47 (used for proof generation)
Deal Verifier deployed: Different VK on-chain
```

### Solution
Regenerate matching PK/VK and redeploy:

```bash
cd circuits

# 1. Compile circuit
~/.nargo/bin/nargo compile --package deal_proof

# 2. Generate matching PK/VK with Sunspot
~/bin/sunspot compile target/deal_proof.json
sunspot setup target/deal_proof.ccs

# 3. Deploy new verifier
solana program deploy target/deal_proof.so --url devnet \
  --program-id target/deal_proof-keypair.json
# New Program ID: 7p8MDtniW4WgE8LpT2R2t35CSG3YbkWGCjWixPuq6AbL

# 4. Copy PK for proof generation
cp circuits/target/deal_proof.pk solana-verifiers/target/deal_proof.pk

# 5. Update program IDs and redeploy Anchor program
```

### Files Changed
- `programs/zk-card-arena/src/lib.rs` line 16 - Updated `deal_verifier` ID
- `hooks/useGameProgram.js` line 17 - Updated `DEAL_VERIFIER_PROGRAM_ID`
- `solana-verifiers/target/deal_proof.pk` - Copied new PK
- Anchor program redeployed

---

## Issue 6: Reveal Verifier VK/PK Mismatch

### Symptom
```
[Game] Auto-reveal error: game.js:406
SendTransactionError: Transaction simulation failed:
Error processing Instruction 1: invalid instruction data
```

Player clicks "Hit" → Error when dealer tries to auto-reveal the new card.

### Root Cause
Same pattern - reveal verifier VK/PK mismatch.

```
reveal_proof.pk: Jan 24 14:48 (stale)
deal_proof.pk: Jan 26 00:15 (just fixed)
```

When we fixed the deal verifier, we didn't regenerate the reveal verifier.

### Solution
Same process as deal verifier:

```bash
cd circuits

# 1. Compile
~/.nargo/bin/nargo compile --package reveal_proof

# 2. Generate matching PK/VK
~/bin/sunspot compile target/reveal_proof.json
sunspot setup target/reveal_proof.ccs

# 3. Deploy
solana program deploy target/reveal_proof.so --url devnet \
  --program-id target/reveal_proof-keypair.json
# New Program ID: 7PMUYpFvo2pKjTH2r6YJ2MZC4Tb72SS9hmfu8QzW41NW

# 4. Copy PK
cp circuits/target/reveal_proof.pk solana-verifiers/target/reveal_proof.pk

# 5. Update IDs and redeploy Anchor
```

### Files Changed
- `programs/zk-card-arena/src/lib.rs` line 21 - Updated `reveal_verifier` ID
- `hooks/useGameProgram.js` line 18 - Updated `REVEAL_VERIFIER_PROGRAM_ID`
- `solana-verifiers/target/reveal_proof.pk` - Copied new PK
- Anchor program redeployed

---

## Issue 7: Claim Button Showing to Wrong User

### Symptom
When game ends, BOTH dealer and player see the "Claim" button, even if they lost.

### Root Cause
The Claim button condition didn't check the user's role:

```javascript
// OLD - Both see button on PLAYER_WON
{currentBet && !payoutProcessed &&
  (gameState === GAME_STATES.PLAYER_WON || gameState === GAME_STATES.PUSH) && (
    <button>Claim...</button>
)}
```

### Solution
Add role check - only winner sees button:

```javascript
// NEW - Only actual winner sees button
{currentBet && !payoutProcessed && (
  (!isDealer && (gameState === GAME_STATES.PLAYER_WON || gameState === GAME_STATES.PUSH)) ||
  (isDealer && (gameState === GAME_STATES.DEALER_WON || gameState === GAME_STATES.PUSH))
) && (
  <button>Claim...</button>
)}
```

### Files Changed
- `pages/game.js` lines 1824-1850 - Updated Claim button condition

---

## Issue 8: Dealer Turn Had No ZK Verification (CRITICAL)

### Symptom
Security audit revealed that the dealer could claim ANY card values during their turn without cryptographic proof - a critical vulnerability allowing dealer cheating.

### Root Cause
The `dealer_play_turn` instruction in `lib.rs` accepted `dealer_card_values` directly without ZK proof verification:

```rust
// VULNERABLE CODE - No proof required!
pub fn dealer_play_turn(
    ctx: Context<DealCard>,
    dealer_card_values: Vec<u8>,  // Dealer could claim ANY values
) -> Result<()> {
    // ... directly used dealer_card_values without verification
}
```

A malicious dealer could always claim 21, making the game unfair.

### Solution
Added ZK reveal proof verification for EVERY card the dealer reveals:

**1. New Context Struct** (`lib.rs`):
```rust
#[derive(Accounts)]
pub struct DealerPlayTurnSecure<'info> {
    #[account(mut, constraint = game.dealer == dealer.key())]
    pub game: Account<'info, Game>,
    pub dealer: Signer<'info>,
    /// CHECK: Sunspot reveal verifier for ZK proof verification
    pub reveal_verifier_program: AccountInfo<'info>,
}
```

**2. Updated Instruction** (`lib.rs`):
```rust
pub fn dealer_play_turn(
    ctx: Context<DealerPlayTurnSecure>,
    dealer_card_values: Vec<u8>,
    proofs: Vec<Vec<u8>>,           // One proof per card
    public_inputs_list: Vec<Vec<u8>>, // One public input set per card
) -> Result<()> {
    // Verify each card with CPI to reveal verifier
    for each card {
        invoke(verify_ix, &[reveal_verifier_program])?;
    }
}
```

**3. Frontend Proof Generation** (`game.js`):
```javascript
const handleDealerPlayTurn = async () => {
  // Generate reveal proof for hole card
  const holeCardProof = await generateRevealProof(3);

  // Simulate dealer logic to determine hit cards
  while (dealerTotal < 17) {
    const hitProof = await generateRevealProof(hitPosition);
    proofs.push(hitProof);
  }

  // Submit with all proofs
  await dealerPlayTurn(gameId, dealerPubkey, cardValues, proofs, publicInputsList);
};
```

### Files Changed
- `programs/zk-card-arena/src/lib.rs` - Added `DealerPlayTurnSecure` context, modified `dealer_play_turn` to verify proofs via CPI
- `hooks/useGameProgram.js` - Updated IDL and `dealerPlayTurn` function to accept proof arrays
- `pages/game.js` - `handleDealerPlayTurn` now generates ZK proofs for each card

### Security Impact
| Before | After |
|--------|-------|
| Dealer could claim any cards | Each card cryptographically verified |
| No proof required | CPI to reveal verifier for every card |
| ❌ VULNERABLE | ✅ SECURE |

---

## Issue 9: Program ID Mismatch After Deployment

### Symptom
```
AnchorError: Error Code: DeclaredProgramIdMismatch. Error Number: 4100.
Error Message: The declared program id does not match the actual program id.
```

Game creation failed immediately after deploying updated program.

### Root Cause
The `declare_id!` macro embeds the program ID into the compiled binary. We deployed the program **before** updating the source code's `declare_id!`, so:

```
On-chain binary:  declare_id!("22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4")
Deployment keypair: 8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx
```

When Anchor validates transactions, it checks the declared ID matches the account being called.

### Solution
Update source code with correct program ID, rebuild, and redeploy:

```bash
# 1. Update declare_id in lib.rs
declare_id!("8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx");

# 2. Update PROGRAM_ID in useGameProgram.js
const PROGRAM_ID = new PublicKey("8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx");

# 3. Update Anchor.toml
zk_card_arena = "8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx"

# 4. Rebuild and redeploy
anchor build && anchor deploy --provider.cluster devnet
```

### Files Changed
- `programs/zk-card-arena/src/lib.rs` line 5
- `hooks/useGameProgram.js` line 12
- `Anchor.toml` line 9

---

## Issue 10: Verifier IDs Pointing to Wrong Programs

### Symptom
```
Transaction simulation failed: Error processing Instruction 1: invalid instruction data
Program EbqLX5ryQAuch2zueoNoXyV9B8okvpRPLCgxYgZLf8g failed
Program log: Proof verification failed
```

Shuffle verification failed even though proof was generated correctly.

### Root Cause
The code had been updated to use **different verifier IDs** than the ones deployed with matching PK/VK keys:

| Verifier | In Code (Wrong) | In DEPLOYED_PROGRAM_IDS.md (Correct) |
|----------|-----------------|--------------------------------------|
| Shuffle | `EbqLX5ry...` | `6sju9HLJ...` |
| Deal | `7p8MDtni...` | `Epoxbrv1...` |
| Reveal | `7PMUYpFv...` | `HrETBH5n...` |

The proving keys in `solana-verifiers/target/` were generated on Jan 23 and match the verifiers in `DEPLOYED_PROGRAM_IDS.md`. Someone had updated the code to point to different verifiers (Jan 26) that don't match these keys.

### Solution
Restore verifier IDs to match the deployed keys:

```rust
// lib.rs - Use Jan 23 deployed verifiers that match solana-verifiers/target/*.pk
mod shuffle_verifier {
    declare_id!("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");
}
mod deal_verifier {
    declare_id!("Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC");
}
mod reveal_verifier {
    declare_id!("HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9");
}
```

### Files Changed
- `programs/zk-card-arena/src/lib.rs` lines 8-23 - Reverted to correct verifier IDs
- `hooks/useGameProgram.js` lines 14-16 - Reverted to correct verifier IDs

### Key Insight
**Always check that verifier program IDs match the proving keys being used.** The PK files in `solana-verifiers/target/` must correspond to the VK embedded in the on-chain verifier program.

---

## Issue 11: Transaction Too Large - Dealer Turn with Multiple Cards

### Symptom
```
WalletSignTransactionError: Transaction too large: 1243 > 1232
```

Dealer turn fails when dealer needs to hit (reveal 2+ cards). Game stuck in `dealerTurn` state.

### Root Cause
Solana transactions have a **hard limit of 1232 bytes**. Each Groth16 proof is ~388 bytes plus ~100 bytes of public inputs. When dealer needs to reveal 2+ cards:

```
Transaction breakdown:
├── Proof 1:        388 bytes
├── Public inputs 1: ~100 bytes
├── Proof 2:        388 bytes
├── Public inputs 2: ~100 bytes
├── Accounts:       ~200 bytes
├── Instruction:    ~70 bytes
└── Signatures:     ~64 bytes
    ────────────────────────
    TOTAL:          ~1310 bytes > 1232 limit ❌
```

The on-chain `dealer_play_turn` instruction was designed to receive ALL cards and proofs in a single atomic transaction, making it impossible to reveal 2+ cards.

### Solution
Two-part fix:

**1. On-Chain Program Update** (`lib.rs`):
Modified `dealer_play_turn` to support **incremental reveals** across multiple transactions:

```rust
pub fn dealer_play_turn(
    ctx: Context<DealerPlayTurnSecure>,
    dealer_card_values: Vec<u8>,
    proofs: Vec<Vec<u8>>,
    public_inputs_list: Vec<Vec<u8>>,
) -> Result<()> {
    // Check if hole card already revealed (from previous call)
    let hole_card_revealed = game.dealer_revealed.len() >= 2;

    if !hole_card_revealed {
        // Reveal hole card with ZK proof
        verify_and_reveal_hole_card(...)?;
    }

    // Hit loop - process as many cards as provided
    loop {
        let dealer_total = calculate_hand_value(&game.dealer_revealed);

        if dealer_total >= 17 {
            // Finalize game
            determine_winner(game)?;
            return Ok(());
        }

        // Check if we have more cards in THIS transaction
        if value_index >= dealer_card_values.len() {
            // No more cards - return SUCCESS, stay in DealerTurn
            // Frontend will call again with next card
            msg!("Dealer needs hit but no more cards in this tx");
            return Ok(());
        }

        // Verify and reveal hit card
        verify_and_reveal_hit_card(...)?;
    }
}
```

**2. Frontend Sequential Submission** (`useGameProgram.js`):
Added `dealerPlayTurnSequential` function that submits cards one at a time:

```javascript
const dealerPlayTurnSequential = async (
  gameId, dealerPubkey, cardValues, proofs, publicInputsList, onProgress
) => {
  for (let i = 0; i < cardValues.length; i++) {
    // Submit ONE card per transaction
    await program.methods
      .dealerPlayTurn(
        [cardValues[i]],      // Single card
        [proofs[i]],          // Single proof
        [publicInputsList[i]] // Single public input
      )
      .accounts({...})
      .rpc();

    onProgress?.(i + 1, cardValues.length, tx);
  }
};
```

**3. Game Logic Update** (`game.js`):
Use sequential submission when 2+ cards:

```javascript
if (cardValues.length >= 2) {
  console.log("[Game] Using sequential submission...");
  await dealerPlayTurnSequential(gameId, dealerPubkey, cardValues, proofs, publicInputsList);
} else {
  await dealerPlayTurn(gameId, dealerPubkey, cardValues, proofs, publicInputsList);
}
```

### Transaction Flow After Fix

```
Dealer has upcard=8, hole=4, needs hit → gets 9, total=21

Transaction 1: Hole Card
┌─────────────────────────────────────────┐
│ Input: [hole=4], [proof1]               │
│ Size: ~788 bytes ✓                      │
│ On-chain:                               │
│   - Verify proof via CPI                │
│   - dealer_revealed: [8] → [8, 4]       │
│   - Total = 12, needs hit               │
│   - No more cards → return SUCCESS      │
│   - State: still DealerTurn             │
└─────────────────────────────────────────┘
              ↓
Transaction 2: Hit Card
┌─────────────────────────────────────────┐
│ Input: [hit=9], [proof2]                │
│ Size: ~788 bytes ✓                      │
│ On-chain:                               │
│   - Hole card already revealed (skip)   │
│   - Verify proof via CPI                │
│   - dealer_revealed: [8,4] → [8,4,9]    │
│   - Total = 21, stands                  │
│   - determine_winner() → DealerWon      │
│   - State: DealerWon                    │
└─────────────────────────────────────────┘
```

### Files Changed
- `programs/zk-card-arena/src/lib.rs` - Modified `dealer_play_turn` to support incremental reveals
- `hooks/useGameProgram.js` - Added `dealerPlayTurnSequential` function
- `pages/game.js` - Uses sequential submission when cardValues.length >= 2

### Console Output After Fix
```
[Game] Dealer turn - final hand: [8, 4, 9], total: 21
[Game] Submitting 2 card(s) with ZK proofs to chain...
[Game] Using sequential submission for 2 cards (avoiding tx size limit)...
[DealerPlayTurnSequential] Submitting 2 cards one at a time...
[DealerPlayTurnSequential] Submitting card 1/2: value=4
[DealerPlayTurnSequential] Card 1/2 submitted: 29nEh4oNTYqG...
[DealerPlayTurnSequential] Submitting card 2/2: value=9
[DealerPlayTurnSequential] Card 2/2 submitted: 4U6vbuUe6smn...
Game update: {state: 'playerWon', ...}
```

### Key Insight
Solana's 1232 byte transaction limit is a fundamental constraint. For ZK applications with large proofs (~388 bytes each), design instructions to accept **incremental inputs** rather than requiring all data atomically. This pattern applies to any ZK verification where multiple proofs might be needed.

---

## Summary of All Verifier Deployments

### Final Deployed Program IDs (Devnet)

| Program | Address | Last Updated |
|---------|---------|--------------|
| ZK Card Arena (Anchor) | `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx` | Jan 26, 2026 |
| Shuffle Verifier | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` | Jan 23, 2026 |
| Deal Verifier | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` | Jan 23, 2026 |
| Reveal Verifier | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` | Jan 23, 2026 |

### PK/VK File Locations

```
circuits/target/
├── shuffle_proof.pk    # Used for shuffle proof generation
├── shuffle_proof.vk    # Deployed in shuffle verifier
├── deal_proof.pk       # Used for deal proof generation
├── deal_proof.vk       # Deployed in deal verifier
├── reveal_proof.pk     # Used for reveal proof generation
└── reveal_proof.vk     # Deployed in reveal verifier

solana-verifiers/target/
├── shuffle_proof.pk    # Copy for backend proof generation
├── deal_proof.pk       # Copy for backend proof generation
└── reveal_proof.pk     # Copy for backend proof generation
```

---

## Lessons Learned

### 1. VK/PK Matching is Critical
Groth16 proofs require **exact** matching between:
- Proving Key (PK) used to generate proofs
- Verification Key (VK) deployed on-chain

**Always regenerate both together with `sunspot setup`.**

### 2. Update ALL Verifiers Together
When circuit constraints change, ALL verifiers need updating:
- Don't fix one and forget the others
- Document which verifier was last updated

### 3. Copy PK After Regenerating
After `sunspot setup`, always:
```bash
cp circuits/target/<circuit>.pk solana-verifiers/target/<circuit>.pk
```

### 4. Check File Timestamps
Quick way to identify stale files:
```bash
ls -la circuits/target/*.pk circuits/target/*.vk
```
Files should have matching timestamps if generated together.

### 5. localStorage Doesn't Work Cross-Browser
For multiplayer features, localStorage won't sync between different browsers/devices. Use:
- On-chain state
- WebSockets
- Manual communication (for hackathon demos)

### 6. Watch for React State Race Conditions
When multiple effects update the same state, use refs or flags to prevent overwrites:
```javascript
const skipSync = useRef(false);
// Set before critical state updates
// Clear after operation completes
```

### 7. Anchor Deploy Requires SOL
Program deployment costs ~2.26 SOL. Keep devnet wallet funded:
- Use https://faucet.solana.com
- Or `solana airdrop 2 --url devnet` (has rate limits)

### 8. Security Audit Before Production
Always audit for missing ZK verification:
- Check ALL instructions that accept user-provided values
- Every card value should require a ZK proof
- Use `grep -n "card_value\|cardValue"` to find potential vulnerabilities

### 9. Update Source Before Deploy
When deploying program updates:
1. Update `declare_id!` in source FIRST
2. Then build and deploy
3. Never deploy first, update source second (causes DeclaredProgramIdMismatch)

### 10. Design for Solana's 1232 Byte Transaction Limit
Groth16 proofs are ~388 bytes each. With 2+ proofs, you'll exceed the 1232 byte limit:
- **Don't design atomic multi-proof instructions** that require all proofs at once
- **Support incremental reveals** - let the instruction be called multiple times
- **Track state on-chain** - know which proofs have been submitted
- **Finalize on last proof** - only call determine_winner() when done

```rust
// BAD: Requires all proofs atomically (fails with 2+ proofs)
pub fn reveal_all_cards(values: Vec<u8>, proofs: Vec<Vec<u8>>) { ... }

// GOOD: Supports incremental submission
pub fn reveal_card(value: u8, proof: Vec<u8>) {
    // Check if this is the last card needed
    if all_cards_revealed() {
        determine_winner()?;
    }
    Ok(())  // Stay in current state if more cards needed
}
```

---

## Quick Reference: Fixing VK/PK Mismatch

When you see "invalid instruction data" or "Proof verification failed":

```bash
# 1. Identify which verifier failed (check error logs for program ID)

# 2. Regenerate matching PK/VK
cd circuits
~/.nargo/bin/nargo compile --package <circuit_name>
~/bin/sunspot compile target/<circuit_name>.json
sunspot setup target/<circuit_name>.ccs

# 3. Deploy new verifier (note the new program ID)
solana program deploy target/<circuit_name>.so --url devnet \
  --program-id target/<circuit_name>-keypair.json

# 4. Update program IDs in code
# - programs/zk-card-arena/src/lib.rs
# - hooks/useGameProgram.js

# 5. Copy PK for proof generation
cp circuits/target/<circuit_name>.pk solana-verifiers/target/<circuit_name>.pk

# 6. Rebuild and redeploy Anchor program
anchor build
anchor deploy --provider.cluster devnet
```

---

## Quick Reference: Adding ZK Verification to Instructions

When an instruction accepts values without ZK proof:

```rust
// 1. Create secure context with verifier account
#[derive(Accounts)]
pub struct SecureInstruction<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub dealer: Signer<'info>,
    /// CHECK: Validated against verifier::ID in handler
    pub reveal_verifier_program: AccountInfo<'info>,
}

// 2. Add proof parameters to instruction
pub fn secure_instruction(
    ctx: Context<SecureInstruction>,
    values: Vec<u8>,
    proofs: Vec<Vec<u8>>,
    public_inputs_list: Vec<Vec<u8>>,
) -> Result<()> {
    // 3. Verify proof for each value
    for i in 0..values.len() {
        let mut instruction_data = Vec::new();
        instruction_data.extend_from_slice(&proofs[i]);
        instruction_data.extend_from_slice(&public_inputs_list[i]);

        invoke(&Instruction {
            program_id: reveal_verifier::ID,
            accounts: vec![],
            data: instruction_data,
        }, &[ctx.accounts.reveal_verifier_program.to_account_info()])?;
    }
    Ok(())
}
```

---

*Document created: January 26, 2026*
*Last updated: January 26, 2026 (Issue 11 added - Transaction size limit fix)*
*ZK Card Arena - Solana Privacy Hackathon*
