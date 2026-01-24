# Next Steps - ZK Card Arena

## Current Status (Jan 24, 2026)

### What's Working on Devnet
- ✅ ZK shuffle/deal/reveal proofs (Noir + Sunspot Groth16)
- ✅ On-chain verification via CPI to Sunspot verifiers
- ✅ Betting UI with direct SOL transfer (devnet fallback)
- ✅ Remote gameplay (player hits from separate browser)
- ✅ Dealer auto-reveal flow
- ✅ Full game state machine (create → bet → play → win/lose)
- ✅ Payout claim (simulated on devnet)

### What's NOT Working Yet
- ❌ Privacy Cash integration (mainnet-only — devnet uses transparent SOL transfers)
- ❌ Real payouts (no house wallet keypair available in browser)
- ❌ Gasless transactions (Privacy Cash relayer is mainnet-only)

---

## Completed Fixes

### Issue 1: Random Fallbacks in useGameProgram.js — FIXED

All game functions in `hooks/useGameProgram.js` previously had random fallback values when ZK-derived data wasn't provided. These have been replaced with hard errors:

- **`createGame`** - No longer accepts `null` for `deckCommitment`; throws if ZK proof hasn't generated a commitment
- **`dealInitialHand`** - No longer generates random card commitments or card values; requires real ZK data
- **`playerAction`** (hit/double) - No longer falls back to `Math.floor(Math.random() * 13)`; requires explicit card value from shuffled deck
- **`dealerPlayTurn`** - No longer generates random dealer card values; requires values from the shuffled deck

### Issue 2: Null Propagation in game.js (Hit/Double) — FIXED

The `handleHit` and `handleDouble` functions in `pages/game.js` previously passed `null` to `playerAction` when `shuffledDeck` was unavailable. Now they throw an explicit error: `"Card deck not available - dealer must be in same session for demo"`.

### Issue 3: verifyShuffle Sends Empty Public Inputs — FIXED

The `verifyShuffle` function now passes the raw `.pw` bytes from the Sunspot verifier directly as `Vec<u8>`, matching the source program's `public_inputs: Vec<u8>` parameter type. The IDL was updated to use `"bytes"` type for `publicInputs`.

### Issue 4: Random Values in revealAllCards — FIXED

The `handleRevealCards` function in `pages/game.js` was generating random card values for unrevealed cards using `Math.floor(Math.random() * 13)`. It now reads actual values from the shuffled deck using correct deck position logic:

- Positions 0-1: Player's initial cards
- Positions 2-3: Dealer's initial cards (upcard + hole card)
- Position 4+: Hit cards (player hits first, then dealer hits)

The `handleDealerPlay` function similarly now requires the shuffled deck and constructs dealer card values from the correct deck positions.

### Issue 5: On-Chain Verification is a Stub — FIXED

The Anchor program now performs real CPI to the deployed Sunspot Groth16 shuffle verifier at `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2`. The program concatenates proof + public_inputs and invokes the verifier, which will fail the transaction if the proof is invalid. The program was redeployed to devnet at new address `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx`.

### Enable Remote Player Gameplay (Request-Response Flow) — FIXED

**Issue:** The Player could not "Hit" or "Double" from a different browser session than the Dealer, because `shuffledDeck` only existed in the Dealer's React state.

**Solution:** Implemented a request-response flow using the existing contract (no on-chain changes):
1. **Player** clicks "Hit"/"Double" → sends transaction with `cardValue: null` (contract deals from `committed_cards` without revealing)
2. **Signal:** On-chain state has `playerCards.length > playerRevealed.length`
3. **Dealer auto-fulfills:** A `useEffect` in the dealer's session detects the mismatch and calls `revealCard` for each unrevealed card
4. **Both see update:** Subscription fires with the newly revealed card

**Changes made:**
- `hooks/useGameProgram.js` — Removed null-throw guards for hit/double; passes `null` to Anchor as `Option::None`
- `pages/game.js` — Branched hit/double for remote play, added dealer auto-reveal `useEffect`, disabled action buttons during pending reveal
- `components/game/PlayingCard.jsx` — Added `PendingCard` component (yellow-bordered spinner) shown to remote player while awaiting reveal

### ShadowPay 404 Fix — FIXED (Jan 24)

**Issue:** `@radr/shadowwire` SDK called API paths that returned 404. Investigation revealed:
1. SDK uses wrong paths (`/pool/balance/` vs actual `/api/escrow/balance/:wallet`)
2. ShadowPay program is mainnet-only (`GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD`)

**Solution:** Replaced SDK with direct `SystemProgram.transfer` on devnet:
- `getBalance` → `connection.getBalance()` (wallet SOL balance)
- `deposit` → No-op (wallet IS the escrow on devnet)
- `pay` → Direct SOL transfer to house wallet
- `requestPayout` → Simulated success (no house keypair available)

**Changes:**
- `hooks/useShadowPay.js` — Full rewrite (removed @radr/shadowwire)
- `package.json` — Moved @solana/web3.js to deps, removed @radr/shadowwire
- `.env.local` — Fixed invalid house wallet address

### Payout Error Fix — FIXED (Jan 24)

**Issue:** `requestPayout` threw "Payouts are not available on devnet" → runtime error on win
**Solution:** Changed to no-op that returns simulated success (`{ txSignature: 'devnet-simulated-payout', amount }`)

---

## Roadmap to Submission (Feb 1 Deadline)

### 1. Mainnet Privacy Cash Integration (Jan 25-28)
- [ ] Install `privacycash` SDK (`npm install privacycash`)
- [ ] Add postinstall script for WASM files (see Privacy Cash section below)
- [ ] Test frontend wallet adapter compatibility (signMessage → encryption key)
- [ ] Rewrite `useShadowPay.js` → `usePrivacyPay.js` for mainnet
- [ ] Deploy ZK Card Arena + Sunspot verifiers to mainnet
- [ ] Fund house wallet + deployer with mainnet SOL
- [ ] Test full flow: Deposit → Private Withdraw (bet) → Win → Payout

### 2. Polish & Edge Cases (Jan 28-30)
- [ ] Error handling: graceful failure if Privacy Cash API is down
- [ ] Loading states: ZK proof generation progress (5-10s)
- [ ] Mobile responsiveness for betting UI
- [ ] Payout via Privacy Cash relayer (house→player settlement)

### 3. Demo & Submission (Jan 30-31)
- [ ] Record demo: Deposit → Private Bet → Play → Win → Payout
- [ ] Ensure all programs and verifiers are live and funded
- [ ] Submit to Hackathon portal

---

## Known Limitations

### Dealer Must Remain Online

The `shuffledDeck` state is held in-memory in the dealer's React session. Remote players can now hit/double from a separate browser, but the dealer's window must stay open to auto-reveal cards (each reveal requires a Phantom wallet approval). In a production system, card data would be committed on-chain and revealed via ZK proofs, eliminating this requirement.

### Groth16 Verification Compute Units

The Sunspot Groth16 verifier consumes **527,073 CUs** for shuffle proof verification (533,475 total including game program overhead). This exceeds the 400,000 CU architecture target in CLAUDE.md. The transaction uses a 600,000 CU budget. This is within Solana's 1.4M max but means verification costs more than initially planned. The verifier likely uses pure BPF pairing operations rather than Solana's native `alt_bn128` precompiles.

### Proof Generation Performance

Browser-based Noir proof generation via NoirJS has not been benchmarked against the target (<15s). The shuffle circuit's constraint count should be verified to be under 50,000.

### Privacy Cash is Mainnet-Only

**ShadowPay was abandoned** — The `@radr/shadowwire` SDK returned 404 errors on all API calls. After investigation, we pivoted to **Privacy Cash** (`npm install privacycash`).

**Privacy Cash** is also mainnet-only (FAQ: "Is there any devnet support? Not for now."). However, it has:
- ✅ Working npm SDK (TypeScript, well-documented)
- ✅ 14 audits + Veridise formal verification
- ✅ $190M+ volume, backed by AllianceDAO
- ✅ Gasless withdrawals (relayer pays)
- ⚠️ Withdrawal fees: 0.006 SOL + 0.35%
- ⚠️ Requires Node.js 24+

The devnet fallback (direct `SystemProgram.transfer` in `hooks/useShadowPay.js`) remains unchanged.

### Privacy Cash SDK API

```js
import { PrivacyCash } from 'privacycash'

// Backend initialization (requires private key)
const client = new PrivacyCash({
  RPC_url: 'MAINNET_RPC',
  owner: 'PRIVATE_KEY'  // or Keypair, Uint8Array, number[]
})

// Core operations
await client.deposit({ lamports: 100_000_000 })  // 0.1 SOL
await client.getPrivateBalance()                  // { lamports: ... }
await client.withdraw({ lamports: 50_000_000, recipientAddress: '...' })
```

**Frontend** — User signs message to derive encryption key:
```js
const signature = await wallet.signMessage(
  new TextEncoder().encode('Privacy Money account sign in')
)
import { EncryptionService } from 'privacycash/utils'
const encryptionService = new EncryptionService()
encryptionService.deriveEncryptionKeyFromSignature(signature)
```

**Next.js postinstall** (required for WASM):
```json
"postinstall": "cp node_modules/@lightprotocol/hasher.rs/dist/hasher_wasm_simd_bg.wasm node_modules/@lightprotocol/hasher.rs/dist/browser-fat/es/ && cp node_modules/@lightprotocol/hasher.rs/dist/light_wasm_hasher_bg.wasm node_modules/@lightprotocol/hasher.rs/dist/browser-fat/es/"
```

### Privacy Cash Integration Flow (Mainnet)

**Bet Flow (Player → House):**
1. Player signs message → derives encryption key
2. Player deposits SOL into Privacy Cash pool
3. Player withdraws to house wallet = **private bet** (relayer submits, no link to player)

**Payout Flow (House → Player):**
4. Backend (house keypair) deposits winnings into Privacy Cash
5. Backend withdraws to player's wallet

**Privacy Guarantee:** On-chain only shows "someone withdrew X SOL to house wallet" — no link to depositor.

### Known Blockers for Next Agent

| Blocker | Status | Notes |
|---------|--------|-------|
| No devnet | ⚠️ | Must test on mainnet; devnet fallback unchanged |
| Node.js 24+ | ❓ | Verify Next.js 16 compatibility |
| Frontend wallet adapter | ❓ | SDK takes private key; unclear if wallet adapter works for deposits |
| Timing correlation | ⚠️ | Deposit→withdraw in same session reduces privacy; recommend pre-funding |
| Withdrawal fees | ℹ️ | 0.006 SOL + 0.35% per payout (6.5% on 0.1 SOL bet, 0.95% on 1 SOL) |

**Docs:** https://privacycash.mintlify.app/
**Program:** `9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD` (verified on Solscan)
