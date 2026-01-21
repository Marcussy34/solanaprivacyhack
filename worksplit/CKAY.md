# CKay's Task List - Full-Stack Developer

> **Role:** Anchor Smart Contracts + Frontend  
> **Focus:** Solana program, React UI, wallet integration

---

## Week 1 Tasks (Days 1-5)

### Day 1-2: Anchor Setup
- [ ] Install Anchor: `cargo install --git https://github.com/coral-xyz/anchor avm --locked`
- [ ] Initialize project: `anchor init zk-card-arena`
- [ ] Configure for devnet: `solana config set --url devnet`
- [ ] Get devnet SOL: `solana airdrop 2`

### Day 3-4: Core Program Structure
- [ ] Define `Game` account structure
- [ ] Define `GameState` enum
- [ ] Implement `create_game` instruction
- [ ] Implement `join_game` instruction
- [ ] Add basic error handling
- [ ] ✅ Receive from Marcus: Proof format spec

### Day 5: Light Protocol Integration
- [ ] Research Light Protocol Groth16 verifier
- [ ] Set up verification key storage
- [ ] Implement `verify_shuffle` instruction stub
- [ ] Test that program builds and deploys
- [ ] **DECISION (with Marcus):** GO/NO-GO on full ZK

---

## Week 2 Tasks (Days 6-10)

### Days 6-7: Game Logic
- [ ] Implement `deal_card` instruction
- [ ] Implement `player_action` (hit/stand/double)
- [ ] Implement `reveal_card` instruction
- [ ] Implement winner determination logic
- [ ] ✅ Receive from Marcus: Working circuits
- [ ] ✅ Deliver to Marcus: Anchor program ready

### Days 7-8: Frontend Core
- [ ] Set up wallet adapter
- [ ] Create `GameBoard` component
- [ ] Create `Card` component (face up/down)
- [ ] Create `ActionButtons` (Hit/Stand/Double)
- [ ] Create `GameStatus` display

### Days 8-9: Integration
- [ ] Connect frontend to Anchor program
- [ ] Work with Marcus on NoirJS integration
- [ ] Test full game flow
- [ ] Deploy to Devnet

### Days 9-10: Polish
- [ ] Fix bugs
- [ ] UI polish and animations
- [ ] Record demo video
- [ ] Final deployment

---

## Your Files

```
programs/zk-card-arena/
├── Cargo.toml
└── src/
    ├── lib.rs                 ← MAIN ENTRY
    ├── state/
    │   ├── mod.rs
    │   └── game.rs            ← Account structures
    ├── instructions/
    │   ├── mod.rs
    │   ├── create_game.rs
    │   ├── join_game.rs
    │   ├── deal_card.rs
    │   ├── player_action.rs
    │   └── reveal_card.rs
    └── errors.rs

components/
├── game/
│   ├── GameBoard.jsx
│   ├── Card.jsx
│   ├── Hand.jsx
│   └── ActionButtons.jsx
├── wallet/
│   └── WalletButton.jsx
└── ui/
    └── (shadcn components)

pages/
├── index.js                   ← Landing page
├── play.js                    ← Game page
└── verify.js                  ← Proof verification
```

---

## Account Structures (Reference)

```rust
#[account]
pub struct Game {
    pub dealer: Pubkey,
    pub player: Option<Pubkey>,
    pub deck_commitment: [u8; 32],
    pub shuffle_verified: bool,
    pub state: GameState,
    pub player_cards: Vec<[u8; 32]>,
    pub dealer_cards: Vec<[u8; 32]>,
    pub deck_position: u8,
    pub created_at: i64,
    pub bump: u8,
}
```

See [SMART_CONTRACTS.md](../docs/SMART_CONTRACTS.md) for full details.

---

## Compute Unit Targets

| Instruction | Target CUs |
|-------------|-----------|
| create_game | ~10,000 |
| verify_shuffle | ~200,000 |
| join_game | ~5,000 |
| deal_card | ~50,000 |
| player_action | ~5,000 |
| reveal_card | ~30,000 |

> ⚠️ Groth16 verification must fit in 400,000 CU limit. Test this on Day 3.

---

## Handoffs from Marcus

| Day | What You Receive |
|-----|------------------|
| 2 | Proof format spec (to design verification) |
| 5 | Working shuffle circuit |
| 8 | NoirJS integration code |

---

## If Day 5 Pivot Happens

If ZK doesn't work, your tasks become:
- [ ] Implement commit-reveal scheme (simpler)
- [ ] Remove ZK verification dependencies
- [ ] Simplify game flow
- [ ] Extra time for polish and video

---

## Quick Reference

### Useful Commands
```bash
# Build program
anchor build

# Test program
anchor test

# Deploy to devnet
anchor deploy

# View logs
solana logs

# Check balance
solana balance
```

### Key Docs
- [SMART_CONTRACTS.md](../docs/SMART_CONTRACTS.md) - Full program spec
- [FRONTEND.md](../docs/FRONTEND.md) - UI implementation guide
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System design
- [Anchor Book](https://www.anchor-lang.com/) - Official docs
