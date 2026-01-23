# Sunspot Verifier Program IDs

**Deployed:** January 23, 2026
**Network:** Solana Devnet
**Deployer:** 2myuLZ82FoZgk9rboKpog2n5qbHvoWeCxJ75R2n4VF1t

## Program IDs

| Verifier | Program ID |
|----------|------------|
| **Shuffle Proof** | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` |
| **Deal Proof** | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` |
| **Reveal Proof** | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` |

## Rust Constants (for Anchor Program)

```rust
use solana_program::pubkey;

pub const SHUFFLE_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");
pub const DEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC");
pub const REVEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9");
```

## JavaScript/TypeScript Constants (for Frontend)

```typescript
export const VERIFIER_PROGRAM_IDS = {
  shuffle: '6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2',
  deal: 'Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC',
  reveal: 'HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9',
} as const;
```

## Solana Explorer Links

- [Shuffle Verifier](https://explorer.solana.com/address/6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2?cluster=devnet)
- [Deal Verifier](https://explorer.solana.com/address/Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC?cluster=devnet)
- [Reveal Verifier](https://explorer.solana.com/address/HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9?cluster=devnet)

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

