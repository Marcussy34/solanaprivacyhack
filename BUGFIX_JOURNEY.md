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
9. [Summary of All Verifier Deployments](#summary-of-all-verifier-deployments)
10. [Lessons Learned](#lessons-learned)

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

## Summary of All Verifier Deployments

### Final Deployed Program IDs (Devnet)

| Program | Address | Last Updated |
|---------|---------|--------------|
| ZK Card Arena (Anchor) | `22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4` | Jan 26, 2026 |
| Shuffle Verifier | `EbqLX5ryQAuch2zueoNoXyV9B8okvpRPLCgxYgZLf8g` | Jan 24, 2026 |
| Deal Verifier | `7p8MDtniW4WgE8LpT2R2t35CSG3YbkWGCjWixPuq6AbL` | Jan 26, 2026 |
| Reveal Verifier | `7PMUYpFvo2pKjTH2r6YJ2MZC4Tb72SS9hmfu8QzW41NW` | Jan 26, 2026 |

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
solana program deploy target/deploy/zk_card_arena.so \
  --program-id 22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4 --url devnet
```

---

*Document created: January 26, 2026*
*ZK Card Arena - Solana Privacy Hackathon*
