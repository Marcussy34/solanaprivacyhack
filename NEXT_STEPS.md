# Next Steps - ZK Card Arena

## What Was Fixed

### Issue 1: Random Fallbacks in useGameProgram.js

All game functions in `hooks/useGameProgram.js` previously had random fallback values when ZK-derived data wasn't provided. These have been replaced with hard errors:

- **`createGame`** - No longer accepts `null` for `deckCommitment`; throws if ZK proof hasn't generated a commitment
- **`dealInitialHand`** - No longer generates random card commitments or card values; requires real ZK data
- **`playerAction`** (hit/double) - No longer falls back to `Math.floor(Math.random() * 13)`; requires explicit card value from shuffled deck
- **`dealerPlayTurn`** - No longer generates random dealer card values; requires values from the shuffled deck

### Issue 2: Null Propagation in game.js (Hit/Double)

The `handleHit` and `handleDouble` functions in `pages/game.js` previously passed `null` to `playerAction` when `shuffledDeck` was unavailable. Now they throw an explicit error: `"Card deck not available - dealer must be in same session for demo"`.

### Issue 4: Random Values in revealAllCards

The `handleRevealCards` function in `pages/game.js` was generating random card values for unrevealed cards using `Math.floor(Math.random() * 13)`. It now reads actual values from the shuffled deck using correct deck position logic:

- Positions 0-1: Player's initial cards
- Positions 2-3: Dealer's initial cards (upcard + hole card)
- Position 4+: Hit cards (player hits first, then dealer hits)

The `handleDealerPlay` function similarly now requires the shuffled deck and constructs dealer card values from the correct deck positions.

---

## What Still Needs to Be Done

### Issue 3: verifyShuffle Sends Empty Public Inputs - FIXED

The `verifyShuffle` function now passes the raw `.pw` bytes from the Sunspot verifier directly as `Vec<u8>`, matching the source program's `public_inputs: Vec<u8>` parameter type. The IDL was updated to use `"bytes"` type for `publicInputs`.

### Issue 5: On-Chain Verification is a Stub - FIXED

The Anchor program now performs real CPI to the deployed Sunspot Groth16 shuffle verifier at `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2`. The program concatenates proof + public_inputs and invokes the verifier, which will fail the transaction if the proof is invalid. The program was redeployed to devnet at new address `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx`.

The IDL now includes `shuffleVerifierProgram` in the accounts list for the `verifyShuffle` instruction.

---

## Known Limitations

### Single-Browser Demo

The `shuffledDeck` state is held in-memory in the React component (`pages/game.js`). Both the dealer and player must operate within the same browser session for card values to be available. In a production system, card data would be committed on-chain and revealed via ZK proofs, eliminating this requirement.

### Groth16 Verification Compute Units

The Sunspot Groth16 verifier consumes **527,073 CUs** for shuffle proof verification (533,475 total including game program overhead). This exceeds the 400,000 CU architecture target in CLAUDE.md. The transaction uses a 600,000 CU budget. This is within Solana's 1.4M max but means verification costs more than initially planned. The verifier likely uses pure BPF pairing operations rather than Solana's native `alt_bn128` precompiles.

### Proof Generation Performance

Browser-based Noir proof generation via NoirJS has not been benchmarked against the target (<15s). The shuffle circuit's constraint count should be verified to be under 50,000.

---

## Verification Steps

### Confirming Random Fallbacks Are Gone

```bash
# Should return NO matches for random fallback patterns:
grep -n "Math.random\|Math.floor(Math.random" hooks/useGameProgram.js
# Expected: no results (generateRandomCommitment has been removed)
```

### Confirming Null Guards Are In Place

```bash
# Should show throw statements for missing ZK data:
grep -n "throw new Error" hooks/useGameProgram.js | grep -i "required\|not available"
grep -n "throw new Error" pages/game.js | grep -i "not available"
```

### Testing the Game Flow

1. Connect a Phantom wallet on devnet
2. Click "New Game" - should see ZK proof generation progress (shuffle, prove, verify phases)
3. If proof generation succeeds, game enters AWAITING_PLAYER state
4. Join from same session, deal cards - values should come from the shuffled deck
5. Hit/Stand/Double - all card values traced via `[Game]` console logs
6. Verify on-chain transactions on Solana Explorer (devnet)

### Checking On-Chain State

```bash
# Fetch game account and inspect shuffle_verified field:
solana account <GAME_PDA> --output json | jq '.data'
```

The `shuffle_verified` field will be `true` after `verifyShuffle` succeeds. This now represents real cryptographic verification via CPI to the Sunspot Groth16 verifier. If the proof is invalid, the transaction will revert.

### Enable Remote Player Gameplay (Request-Response Flow)

**Issue:** Currently, the Player cannot "Hit" if they are in a different browser session than the Dealer, because the `shuffledDeck` is only in the Dealer's memory.

**Solution:** Implement a Request-Response flow:
1. **Player** clicks "Hit" -> Sends transaction with `cardValue: null`. This sets `pendingHit = true` on-chain.
2. **Dealer** (who has the deck) listens for `pendingHit`.
3. **Dealer** automatically sends a transaction to fulfill the hit (deal card + reveal).

**Status:** In Progress

