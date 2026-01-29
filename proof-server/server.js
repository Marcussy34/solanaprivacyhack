/**
 * ZK Proof Generation Server
 *
 * This Express server runs nargo + sunspot to generate Groth16 proofs.
 * Required because Vercel serverless functions have a read-only filesystem.
 *
 * Endpoints:
 * - POST /api/prove - Generate a Groth16 proof for shuffle_proof, deal_proof, or reveal_proof
 * - GET /health - Health check
 */

const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const { writeFile, readFile, rm, mkdir } = require('fs/promises');
const { join } = require('path');
const { randomBytes } = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3001;
const PROJECT_ROOT = process.cwd();
const CIRCUITS_DIR = join(PROJECT_ROOT, 'circuits');
const CIRCUITS_TARGET = join(CIRCUITS_DIR, 'target');
const VERIFIERS_TARGET = join(PROJECT_ROOT, 'solana-verifiers', 'target');

// Valid circuit names (must match folder names in circuits/)
const VALID_CIRCUITS = ['shuffle_proof', 'deal_proof', 'reveal_proof'];

// Allowed origins for CORS (add your frontend domains)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://solanaprivacyhack.vercel.app',
  /\.vercel\.app$/,  // Allow all vercel.app subdomains
];

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// CORS configuration - allow requests from frontend
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check against allowed origins
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Parse JSON bodies (limit to 1MB)
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    circuits: VALID_CIRCUITS,
  });
});

// Also support /api/health for consistency
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    circuits: VALID_CIRCUITS,
  });
});

// ============================================================================
// PROOF GENERATION ENDPOINT
// ============================================================================

app.post('/api/prove', async (req, res) => {
  const { circuit, inputs } = req.body;

  // Validate request
  if (!circuit || !inputs) {
    return res.status(400).json({ error: 'Missing circuit or inputs field' });
  }

  if (!VALID_CIRCUITS.includes(circuit)) {
    return res.status(400).json({
      error: `Invalid circuit. Must be one of: ${VALID_CIRCUITS.join(', ')}`,
    });
  }

  // Generate unique request ID for temp files
  const requestId = randomBytes(8).toString('hex');
  console.log(`[${requestId}] Starting proof generation for circuit: ${circuit}`);
  console.log(`[${requestId}] Inputs:`, JSON.stringify(inputs, null, 2));

  // Track files to cleanup
  const filesToCleanup = [];

  try {
    // Step 1: Write Prover.toml from inputs
    const proverToml = formatProverToml(circuit, inputs);
    const circuitSrcDir = join(CIRCUITS_DIR, circuit);
    const tempProverToml = join(circuitSrcDir, 'Prover.toml');

    console.log(`[${requestId}] Writing Prover.toml...`);
    await writeFile(tempProverToml, proverToml);
    filesToCleanup.push(tempProverToml);

    // Step 2: Run nargo execute to generate witness
    const witnessName = `witness_${requestId}`;
    console.log(`[${requestId}] Running nargo execute...`);

    const nargoResult = await runCommand(
      'nargo', ['execute', '--package', circuit, witnessName],
      { cwd: CIRCUITS_DIR, timeout: 30000 }
    );

    if (!nargoResult.success) {
      console.error(`[${requestId}] nargo execute failed:`, nargoResult.error);
      return res.status(400).json({
        error: `Witness generation failed: ${nargoResult.error}`,
      });
    }

    const witnessFile = join(CIRCUITS_TARGET, `${witnessName}.gz`);
    filesToCleanup.push(witnessFile);
    console.log(`[${requestId}] Witness generated: ${witnessFile}`);

    // Step 3: Run Sunspot prove for Groth16
    const acirFile = join(CIRCUITS_TARGET, `${circuit}.json`);
    const ccsFile = join(CIRCUITS_TARGET, `${circuit}.ccs`);
    const pkFile = join(VERIFIERS_TARGET, `${circuit}.pk`);

    // Sunspot outputs to the same directory as the ACIR file
    const proofFile = join(CIRCUITS_TARGET, `${circuit}.proof`);
    const pwFile = join(CIRCUITS_TARGET, `${circuit}.pw`);
    filesToCleanup.push(proofFile, pwFile);

    console.log(`[${requestId}] Running sunspot prove...`);
    const sunspotResult = await runCommand(
      'sunspot', ['prove', acirFile, witnessFile, ccsFile, pkFile],
      { timeout: 120000 }
    );

    if (!sunspotResult.success) {
      console.error(`[${requestId}] sunspot prove failed:`, sunspotResult.error);
      return res.status(500).json({
        error: `Groth16 proof generation failed: ${sunspotResult.error}`,
      });
    }

    console.log(`[${requestId}] Reading proof files...`);
    const [proofData, pwData] = await Promise.all([
      readFile(proofFile),
      readFile(pwFile),
    ]);

    console.log(`[${requestId}] Proof generated! Size: ${proofData.length} bytes`);

    // Return proof data as base64
    return res.status(200).json({
      proof: proofData.toString('base64'),
      publicInputs: pwData.toString('base64'),
      proofBytes: proofData.length,
      publicInputsBytes: pwData.length,
    });

  } catch (err) {
    console.error(`[${requestId}] Prove API error:`, err);
    return res.status(500).json({ error: err.message });
  } finally {
    // Cleanup temp files
    console.log(`[${requestId}] Cleaning up temp files...`);
    await Promise.all(
      filesToCleanup.map(f => rm(f, { force: true }).catch(() => {}))
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format circuit inputs as a TOML file for nargo execute.
 * Handles arrays, strings, and numbers.
 */
function formatProverToml(circuit, inputs) {
  const lines = [];

  for (const [key, value] of Object.entries(inputs)) {
    if (Array.isArray(value)) {
      // Format arrays: key = [val1, val2, ...]
      const formatted = value.map(v => typeof v === 'string' ? `"${v}"` : String(v));
      lines.push(`${key} = [${formatted.join(', ')}]`);
    } else if (typeof value === 'string') {
      lines.push(`${key} = "${value}"`);
    } else {
      lines.push(`${key} = "${String(value)}"`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Run a command with timeout and proper PATH setup.
 * Returns { success, stdout, stderr, error }
 */
function runCommand(cmd, args, options = {}) {
  const { timeout = 60000, cwd } = options;

  // Ensure nargo and sunspot are findable in common installation paths
  const env = {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.HOME}/bin:/usr/local/bin:/app/.nargo/bin:${process.env.PATH}`,
  };

  return new Promise((resolve) => {
    execFile(
      cmd, args,
      { timeout, maxBuffer: 10 * 1024 * 1024, cwd, env },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            error: `${error.message}${stderr ? `. stderr: ${stderr}` : ''}`,
          });
        } else {
          resolve({ success: true, stdout, stderr });
        }
      }
    );
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`ZK Proof Server running on port ${PORT}`);
  console.log(`Circuits directory: ${CIRCUITS_DIR}`);
  console.log(`Valid circuits: ${VALID_CIRCUITS.join(', ')}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
