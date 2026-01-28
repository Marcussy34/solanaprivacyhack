# Sunspot Verifier Program IDs

**Deployed:** January 23, 2026
**Network:** Solana Devnet
**Deployer:** 2myuLZ82FoZgk9rboKpog2n5qbHvoWeCxJ75R2n4VF1t

## Program IDs

| Verifier | Program ID |
|----------|------------|
| **Shuffle Proof** | `F5W3HDqnZaqCUaGkFFypSxzWA3XBCnBK6yyGymk81ViJ` |
| **Deal Proof** | `5zPYh2Fvt34mLHQuCjUmBEwRSzAkzwzLcYSrrRmzdtPz` |
| **Reveal Proof** | `9sag96gkAhSZCFQweJVw9AocMvMXzS9B2yi1oruF81oH` |

## Rust Constants (for Anchor Program)

```rust
mod shuffle_verifier {
    use super::*;
    declare_id!("F5W3HDqnZaqCUaGkFFypSxzWA3XBCnBK6yyGymk81ViJ");
}

mod deal_verifier {
    use super::*;
    declare_id!("5zPYh2Fvt34mLHQuCjUmBEwRSzAkzwzLcYSrrRmzdtPz");
}

mod reveal_verifier {
    use super::*;
    declare_id!("9sag96gkAhSZCFQweJVw9AocMvMXzS9B2yi1oruF81oH");
}
```

## JavaScript/TypeScript Constants (for Frontend)

```typescript
export const VERIFIER_PROGRAM_IDS = {
  shuffle: 'F5W3HDqnZaqCUaGkFFypSxzWA3XBCnBK6yyGymk81ViJ',
  deal: '5zPYh2Fvt34mLHQuCjUmBEwRSzAkzwzLcYSrrRmzdtPz',
  reveal: '9sag96gkAhSZCFQweJVw9AocMvMXzS9B2yi1oruF81oH',
} as const;
```

## Solana Explorer Links

- [Shuffle Verifier](https://explorer.solana.com/address/F5W3HDqnZaqCUaGkFFypSxzWA3XBCnBK6yyGymk81ViJ?cluster=devnet)
- [Deal Verifier](https://explorer.solana.com/address/5zPYh2Fvt34mLHQuCjUmBEwRSzAkzwzLcYSrrRmzdtPz?cluster=devnet)
- [Reveal Verifier](https://explorer.solana.com/address/9sag96gkAhSZCFQweJVw9AocMvMXzS9B2yi1oruF81oH?cluster=devnet)

## Deployment Cost

- SOL before: 11.98 SOL
- SOL after: 7.77 SOL
- **Total cost: ~4.21 SOL** (for 3 verifier programs)

## Usage

These verifiers are called via CPI from the main ZK Card Arena Anchor program.

### Proof Format for CPI

```
instruction_data = proof_bytes || public_inputs_bytes
```

- `proof_bytes`: Groth16 proof from Sunspot (serialized)
- `public_inputs_bytes`: Public witness values (serialized Field elements)

## Notes

- Each verifier is specific to one circuit (shuffle/deal/reveal)
- Verification costs ~200k compute units per proof
- Programs are upgradeable (authority: deployer wallet)

