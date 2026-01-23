# ZK Card Arena - Quick Start Guide

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Rust | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | 1.17+ | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Anchor | 0.29+ | `cargo install --git https://github.com/coral-xyz/anchor avm --locked` |
| Nargo (Noir) | 0.30+ | `curl -L https://raw.githubusercontent.com/noir-lang/noir/master/install.sh \| sh` |

### Verify Installation

```bash
node --version       # Should show v18.x.x or higher
rustc --version      # Should show 1.70.x or higher
solana --version     # Should show 1.17.x or higher
anchor --version     # Should show 0.29.x or higher
nargo --version      # Should show 0.30.x or higher
```

---

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/solanaprivacyhack.git
cd solanaprivacyhack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Solana

```bash
# Set to devnet
solana config set --url devnet

# Create a new keypair (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop some SOL for testing
solana airdrop 2
```

---

## Development Workflow

### Running the Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Building ZK Circuits

```bash
cd circuits

# Compile the shuffle circuit
nargo compile

# Run tests
nargo test

# Generate proof (requires inputs)
nargo prove
```

### Building Anchor Program

```bash
cd programs/zk-card-arena

# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy
```

---

## Project Structure

```
solanaprivacyhack/
│
├── circuits/                 # Noir ZK circuits
│   ├── Nargo.toml
│   └── src/
│       ├── shuffle_proof.nr
│       ├── deal_proof.nr
│       └── reveal_proof.nr
│
├── programs/                 # Anchor smart contracts
│   └── zk-card-arena/
│       └── src/
│           └── lib.rs
│
├── components/               # React components
│   ├── game/
│   ├── wallet/
│   └── ui/
│
├── pages/                    # Next.js pages
│   ├── index.js
│   └── play.js
│
├── lib/                      # Utility functions
│   ├── noir/
│   └── program/
│
├── docs/                     # Documentation (you are here)
│
└── public/                   # Static assets
```

---

## Key Files

| File | Purpose |
|------|---------|
| `circuits/src/shuffle_proof.nr` | Main ZK shuffle circuit |
| `programs/zk-card-arena/src/lib.rs` | Anchor program entry |
| `pages/play.js` | Main game page |
| `lib/noir/prover.js` | Browser proof generation |
| `components/game/GameBoard.jsx` | Game UI |

---

## Day 1 Tasks (Critical Path)

### Task 1: Set Up Noir Circuit

```bash
# Create circuits directory
mkdir circuits
cd circuits

# Initialize Noir project
nargo init

# Edit src/main.nr with shuffle circuit code
```

### Task 2: Benchmark Circuit

```bash
# Compile
nargo compile

# Check constraint count (in Nargo.toml output)
cat target/*.json | jq '.abi.constraint_count'

# Generate test proof
nargo prove --input prover.toml
```

### Task 3: Test in Browser

```javascript
// In a test page or console
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

const start = Date.now();
const circuit = await fetch('/circuits/shuffle_proof.json').then(r => r.json());
const backend = new BarretenbergBackend(circuit);
const noir = new Noir(circuit, backend);
const { proof } = await noir.generateProof(testInputs);
console.log(`Proof time: ${Date.now() - start}ms`);
```

---

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

---

## Useful Commands

```bash
# Frontend
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run linter

# Noir
nargo compile            # Compile circuits
nargo test               # Run circuit tests
nargo prove              # Generate proof

# Anchor
anchor build             # Build program
anchor test              # Run tests
anchor deploy            # Deploy to network
anchor idl               # Generate IDL

# Solana
solana balance           # Check SOL balance
solana airdrop 2         # Get devnet SOL
solana logs              # Stream program logs
```

---

## Troubleshooting

### "NoirJS proof generation slow"

- Check constraint count (should be < 50k)
- Use latest Noir version
- Consider native proving for development

### "Anchor build fails"

```bash
# Update Anchor
avm install latest
avm use latest
```

### "Solana transaction fails"

- Check compute units (use `solana logs`)
- Ensure account sizes are correct
- Verify PDA seeds match

### "Circuit won't compile"

- Check Noir version compatibility
- Verify all imports are correct
- Run `nargo check` for detailed errors

---

## Resources

- [Noir Documentation](https://noir-lang.org/docs)
- [Anchor Book](https://www.anchor-lang.com/)
- [Solana Docs](https://docs.solana.com/)
- [Sunspot (Noir → Solana)](https://github.com/reilabs/sunspot)
- [Solana Noir Examples](https://github.com/solana-foundation/noir-examples)

---

## Getting Help

1. Check project documentation in `/docs`
2. Review Noir examples at noir-lang.org
3. Anchor examples in the Anchor book
4. Solana Stack Exchange for blockchain issues
