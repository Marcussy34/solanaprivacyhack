# ZK Proof Server

External proof generation server for the ZK card game. Runs `nargo` and `sunspot` to generate Groth16 proofs.

## Why External Server?

Vercel serverless functions have:
1. **Read-only filesystem** - Cannot write `Prover.toml`, witness files, or proof files
2. **No CLI tools** - `nargo` and `sunspot` binaries are not installed

This server provides a writable environment with the required tools.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prove` | POST | Generate a Groth16 proof |
| `/health` | GET | Health check |

### POST /api/prove

Request body:
```json
{
  "circuit": "shuffle_proof" | "deal_proof" | "reveal_proof",
  "inputs": { ... circuit-specific inputs ... }
}
```

Response:
```json
{
  "proof": "<base64 encoded proof>",
  "publicInputs": "<base64 encoded public inputs>",
  "proofBytes": 123,
  "publicInputsBytes": 456
}
```

## Local Development

```bash
cd proof-server
npm install
npm start
```

Server runs on port 3001 by default.

## Deploy to Render

1. Push this folder to a GitHub repo
2. Create a new "Web Service" on [Render](https://render.com)
3. Connect your repo
4. Select "Docker" as the environment
5. Deploy

## Environment Variables

Set these in your Vercel project:

```bash
NEXT_PUBLIC_PROVE_API_URL=https://your-server.onrender.com
```

## Required Files

The Docker build expects:
- `circuits/` - Circuit source files and compiled artifacts
- `solana-verifiers/target/*.pk` - Proving keys
