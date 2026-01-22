# ZK Card Arena - Future Features & Roadmap

> **Current Version:** P2P Blackjack (2 players)
> **Status:** MVP for Solana Privacy Hackathon

---

## Current Implementation (v1.0)

```
┌─────────────────────────────────────────┐
│           P2P MODE (Current)            │
├─────────────────────────────────────────┤
│  Dealer (Human) ◄────► Player (Human)   │
│                                         │
│  • Two real wallets                     │
│  • Dealer creates & hosts game          │
│  • Player joins and plays               │
│  • ZK proofs ensure fairness            │
└─────────────────────────────────────────┘
```

---

## Future Game Modes

### 1. Casino Mode (House vs Player)

**Description:** Automated dealer that follows standard Blackjack rules.

```
┌─────────────────────────────────────────┐
│              CASINO MODE                │
├─────────────────────────────────────────┤
│  Dealer (Bot/Backend)  ◄──► Player      │
│                                         │
│  • Dealer is automated service          │
│  • Follows casino rules:                │
│    - Must hit on 16 or less             │
│    - Must stand on 17+                  │
│  • House edge built-in                  │
│  • Players bet against the house        │
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Backend service calls dealer instructions
- Crank/keeper pattern for automation
- Could use Clockwork or similar for scheduling
- House bankroll management needed

**Smart Contract Changes:**
- Add `is_casino_mode` flag to Game account
- Add automated dealer logic (optional on-chain or off-chain)
- Add betting/payout system

---

### 2. Tournament Mode

**Description:** Multiple players compete, bracket-style elimination.

```
┌─────────────────────────────────────────┐
│            TOURNAMENT MODE              │
├─────────────────────────────────────────┤
│                                         │
│  Round 1:    Round 2:    Finals:        │
│  ┌───┐                                  │
│  │P1 │──┐                               │
│  └───┘  │   ┌───┐                       │
│         ├──►│W1 │──┐                    │
│  ┌───┐  │   └───┘  │                    │
│  │P2 │──┘          │   ┌───┐            │
│  └───┘             ├──►│   │ CHAMPION   │
│  ┌───┐             │   └───┘            │
│  │P3 │──┐          │                    │
│  └───┘  │   ┌───┐  │                    │
│         ├──►│W2 │──┘                    │
│  ┌───┐  │   └───┘                       │
│  │P4 │──┘                               │
│  └───┘                                  │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Tournament account to track brackets
- Entry fee pool → Winner takes pot
- Could be single-elimination or Swiss-style
- Leaderboard system

**Smart Contract Changes:**
- New `Tournament` account struct
- `create_tournament`, `join_tournament` instructions
- Bracket management logic
- Prize distribution

---

## Future Features (Priority Order)

### High Priority (Post-Hackathon)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Real ZK Verification | Replace stub with Light Protocol Groth16 | Medium |
| Betting System | Wager SOL/tokens on games | Medium |
| Multiple Hands | Play multiple hands per round | Low |
| Insurance/Split | Standard Blackjack options | Medium |

### Medium Priority

| Feature | Description | Complexity |
|---------|-------------|------------|
| Casino Mode | Automated dealer backend | High |
| Spectator Mode | Watch live games | Low |
| Game History | On-chain game records | Medium |
| NFT Cards | Custom card deck NFTs | Medium |

### Low Priority (Nice to Have)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Tournament Mode | Bracket competitions | High |
| Leaderboards | Track win/loss stats | Medium |
| Chat System | In-game messaging | Medium |
| Mobile App | Native iOS/Android | High |
| Multi-table | Play multiple games | High |

---

## Technical Improvements

### Smart Contract

- [ ] Real Groth16 verification (Light Protocol)
- [ ] Timeout handling (auto-forfeit inactive games)
- [ ] Game abandonment / refund logic
- [ ] Compressed accounts for cheaper storage
- [ ] Batch reveal (reveal all cards in one tx)

### Frontend

- [ ] Wallet adapter (Phantom, Solflare, etc.)
- [ ] Real-time game updates (WebSocket)
- [ ] Card animations
- [ ] Sound effects
- [ ] Mobile responsive design

### ZK Circuits

- [ ] Deal proof circuit (prove card from committed deck)
- [ ] Reveal proof circuit (prove card matches commitment)
- [ ] Optimize constraint count for faster proofs
- [ ] Browser proof generation < 10s

---

## Architecture Evolution

### Phase 1: Hackathon MVP (Current)
```
Frontend ──► Anchor Program (devnet)
    │
    └──► NoirJS (browser proofs)
```

### Phase 2: Production Ready
```
Frontend ──► Anchor Program (mainnet)
    │              │
    │              └──► Light Protocol (on-chain verification)
    │
    └──► NoirJS (browser proofs)
```

### Phase 3: Full Platform
```
Frontend ──► Anchor Program (mainnet)
    │              │
    │              ├──► Light Protocol
    │              │
    │              └──► Tournament Program
    │
    ├──► NoirJS (browser proofs)
    │
    └──► Backend Service (casino mode, matchmaking)
```

---

## Notes

- Keep P2P as the core mode - it's the simplest and most decentralized
- Casino mode requires trust in the backend operator
- Tournament mode could be fully on-chain (trustless)
- All modes benefit from ZK proofs for fairness

---

*Last updated: January 22, 2026*
