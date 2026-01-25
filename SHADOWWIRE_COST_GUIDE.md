# ShadowWire Integration - Cost & Flow Guide

## Overview

This document explains which stages of the game flow require SOL spending and who pays.

---

## Wallet Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                        │
├─────────────────────────────────────────────────────────────────┤
│  Player Wallet (Phantom)     Dealer Wallet (Phantom)            │
│  - Places bets               - Creates game                      │
│  - Receives payouts          - Pays game creation fee            │
│  - Signs deposit tx          - Signs shuffle proof tx            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Server)                          │
├─────────────────────────────────────────────────────────────────┤
│  House Wallet (Secret Key in .env.local)                        │
│  - Receives player deposits (via ShadowWire)                    │
│  - AUTO-SIGNS payout transactions                               │
│  - No manual approval needed                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Transaction Flow & Costs

### Stage 1: Game Creation (Dealer Pays)
| Action | Who Pays | Estimated Cost | Network |
|--------|----------|----------------|---------|
| Create game PDA | Dealer | ~0.003 SOL | Solana |
| Shuffle proof verification | Dealer | ~0.001 SOL | Solana |
| **Total** | **Dealer** | **~0.004 SOL** | |

### Stage 2: Player Joins & Bets (Player Pays)
| Action | Who Pays | Estimated Cost | Network |
|--------|----------|----------------|---------|
| Deposit to ShadowWire escrow | Player | Bet amount + ~0.001 SOL fee | ShadowWire |
| ZK proof generation | FREE | 0 SOL | Off-chain |
| Private transfer to house | Player | ~0.0001 SOL (gasless via relayer) | ShadowWire |
| **Total** | **Player** | **Bet amount + ~0.001 SOL** | |

### Stage 3: Game Play (Dealer Pays Proof Fees)
| Action | Who Pays | Estimated Cost | Network |
|--------|----------|----------------|---------|
| Deal proof verification | Dealer | ~0.001 SOL per card | Solana |
| Hit (deal another card) | Dealer | ~0.001 SOL | Solana |
| Stand (no cost) | - | 0 SOL | - |
| Reveal proof verification | Dealer | ~0.001 SOL per reveal | Solana |
| **Total (typical game)** | **Dealer** | **~0.005-0.010 SOL** | |

### Stage 4: Payout (House Wallet Pays)
| Action | Who Pays | Estimated Cost | Network |
|--------|----------|----------------|---------|
| Direct SOL transfer to winner | House Wallet | ~0.000005 SOL | Solana |
| 2% platform fee deducted | Winner loses | 2% of winnings | - |
| **Total** | **House Wallet** | **~0.000005 SOL** | |

---

## Cost Summary Per Game

### For Dealer (Game Host)
```
Game creation:     ~0.004 SOL
Dealing cards:     ~0.003 SOL (3 cards typical)
Reveals:           ~0.002 SOL (2 reveals typical)
─────────────────────────────
TOTAL:             ~0.009 SOL per game
```

### For Player
```
Bet deposit:       Bet amount (e.g., 0.1 SOL)
ShadowWire fee:    ~0.001 SOL
─────────────────────────────
TOTAL:             Bet + 0.001 SOL
```

### For House Wallet (Backend)
```
Payout tx fee:     ~0.000005 SOL
─────────────────────────────
TOTAL:             ~0.000005 SOL per payout
```

---

## Network Requirements

### Devnet (Free Testing)
- All transactions use fake SOL
- Get free SOL: `solana airdrop 2`
- ShadowWire may have limited devnet support

### Mainnet (Real Money)
- Required if ShadowWire SDK only supports mainnet
- All costs are real SOL
- Recommended: Start with small bets (0.01-0.1 SOL)

---

## ShadowWire Specific Costs

| Feature | Cost | Notes |
|---------|------|-------|
| Deposit to escrow | Standard Solana tx fee | ~0.000005 SOL |
| ZK proof generation | FREE | Done off-chain |
| Private transfer | Gasless (relayer pays) | ShadowWire covers this |
| Withdrawal from escrow | Standard Solana tx fee | ~0.000005 SOL |

---

## Testing Budget Recommendation

### Devnet Testing
```
Dealer wallet:     2 SOL (airdrop)
Player wallet:     2 SOL (airdrop)
House wallet:      2 SOL (airdrop)
─────────────────────────────
TOTAL NEEDED:      6 SOL (free via airdrop)
```

### Mainnet Testing
```
Dealer wallet:     0.1 SOL (~$15 USD)
Player wallet:     0.2 SOL (for bets + fees)
House wallet:      0.5 SOL (for payouts)
─────────────────────────────
TOTAL NEEDED:      ~0.8 SOL (~$120 USD)
```

---

## Important Notes

1. **House Wallet Auto-Signing**: The house wallet secret key is stored in `.env.local` on your server. It signs payout transactions automatically without Phantom approval.

2. **Same Browser Testing**: You can test both dealer and player with the same Phantom wallet. Just switch accounts in Phantom between roles.

3. **House Wallet is NOT in Phantom**: The house wallet `BzfKZnxJwsbP5BWy7tb5KFYNuHKcUXDecEX7b2h4eE14` should have its secret key exported and stored in `.env.local`.

4. **Fallback Mode**: If ShadowWire SDK fails, the system falls back to direct SOL transfers (no privacy, but still works).

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Who pays for game creation? | Dealer |
| Who pays for bets? | Player |
| Who pays for payouts? | House wallet (auto-signed) |
| Can I test on devnet? | Yes, but ShadowWire may need mainnet |
| How much SOL do I need? | ~0.8 SOL for mainnet testing |
| Is ZK proof generation free? | Yes, it's off-chain |
