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

### Issue 3: verifyShuffle Sends Empty Public Inputs

**File:** `hooks/useGameProgram.js:258-298`

The `verifyShuffle` function sends the proof bytes to the on-chain program, but passes an empty array `[]` for `publicInputsForChain`. The comment at line 277-281 explains why:

> The deployed program expects `Vec<[u8; 32]>` for publicInputs but ignores the content (it just sets `shuffle_verified = true`). The raw `.pw` file from Sunspot (460 bytes) is not directly compatible with this format.

**To fix this:**
1. Parse the Sunspot verifier's `.pw` public witness output into individual 32-byte field elements
2. Pass the correctly-formatted `Vec<[u8; 32]>` to the program
3. Redeploy the Anchor program with actual CPI verification logic (see Issue 5)

### Issue 5: On-Chain Verification is a Stub

The deployed Anchor program's `verify_shuffle` instruction currently just sets `game.shuffle_verified = true` without performing any actual proof verification. It does not CPI into the Light Protocol Groth16 verifier.

**To implement real on-chain verification:**
1. Generate a Groth16 verification key from the Noir circuit (compile -> export vkey)
2. Deploy the verification key via Light Protocol's verifier infrastructure
3. Update the Anchor program's `verify_shuffle` to CPI into the Light Protocol verifier, passing the proof and public inputs
4. Ensure the transaction fits within 400,000 compute units (Solana limit)
5. Redeploy the program to devnet

**Reference:** The IDL already has the `verifyShuffle` instruction with `proof: bytes` and `publicInputs: Vec<[u8; 32]>` parameters. The accounts list includes `game` and `dealer` but will need the verifier program account added back when CPI is implemented.

---

## Known Limitations

### Single-Browser Demo

The `shuffledDeck` state is held in-memory in the React component (`pages/game.js`). Both the dealer and player must operate within the same browser session for card values to be available. In a production system, card data would be committed on-chain and revealed via ZK proofs, eliminating this requirement.

### Legacy `dealCard` Function

`hooks/useGameProgram.js:364-385` still contains a `dealCard` function that uses `generateRandomCommitment()`. This function is not used in the main game flow (which uses `dealInitialHand` + `playerAction` instead) but remains exported. It should either be removed or updated to require real commitments if it has a use case.

### Proof Generation Performance

Browser-based Noir proof generation via NoirJS has not been benchmarked against the target (<15s). The shuffle circuit's constraint count should be verified to be under 50,000.

---

## Verification Steps

### Confirming Random Fallbacks Are Gone

```bash
# Should return NO matches for random fallback patterns in game logic:
grep -n "Math.random\|Math.floor(Math.random" hooks/useGameProgram.js

# The only Math.random in the file should be in generateRandomCommitment() helper (used only by legacy dealCard)
grep -n "Math.random" hooks/useGameProgram.js
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

The `shuffle_verified` field will be `true` after `verifyShuffle` is called, but this currently does not represent actual cryptographic verification.

### Enable Remote Player Gameplay (Request-Response Flow)

**Issue:** Currently, the Player cannot "Hit" if they are in a different browser session than the Dealer, because the `shuffledDeck` is only in the Dealer's memory.

**Solution:** Implement a Request-Response flow:
1. **Player** clicks "Hit" -> Sends transaction with `cardValue: null`. This sets `pendingHit = true` on-chain.
2. **Dealer** (who has the deck) listens for `pendingHit`.
3. **Dealer** automatically sends a transaction to fulfill the hit (deal card + reveal).

**Status:** In Progress

