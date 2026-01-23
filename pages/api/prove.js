import { execFile } from 'child_process';
import { writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

const PROJECT_ROOT = process.cwd();
const CIRCUITS_DIR = join(PROJECT_ROOT, 'circuits');
const CIRCUITS_TARGET = join(CIRCUITS_DIR, 'target');
const VERIFIERS_TARGET = join(PROJECT_ROOT, 'solana-verifiers', 'target');

const VALID_CIRCUITS = ['shuffle_proof', 'deal_proof', 'reveal_proof'];

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { circuit, inputs } = req.body;

  if (!circuit || !inputs) {
    return res.status(400).json({ error: 'Missing circuit or inputs field' });
  }

  if (!VALID_CIRCUITS.includes(circuit)) {
    return res.status(400).json({
      error: `Invalid circuit. Must be one of: ${VALID_CIRCUITS.join(', ')}`,
    });
  }

  const requestId = randomBytes(8).toString('hex');

  try {
    // Step 1: Write Prover.toml from inputs
    const proverToml = formatProverToml(circuit, inputs);
    const circuitSrcDir = join(CIRCUITS_DIR, circuit);
    const tempProverToml = join(circuitSrcDir, 'Prover.toml');
    await writeFile(tempProverToml, proverToml);

    // Step 2: Run nargo execute to generate witness
    const witnessName = `witness_${requestId}`;
    const nargoResult = await runCommand(
      'nargo', ['execute', '--package', circuit, witnessName],
      { cwd: CIRCUITS_DIR, timeout: 30000 }
    );

    if (!nargoResult.success) {
      return res.status(400).json({
        error: `Witness generation failed: ${nargoResult.error}`,
      });
    }

    const witnessFile = join(CIRCUITS_TARGET, `${witnessName}.gz`);

    // Step 3: Run Sunspot prove for Groth16
    const acirFile = join(CIRCUITS_TARGET, `${circuit}.json`);
    const ccsFile = join(CIRCUITS_TARGET, `${circuit}.ccs`);
    const pkFile = join(VERIFIERS_TARGET, `${circuit}.pk`);

    // Sunspot outputs to the same directory as the ACIR file
    const proofFile = join(CIRCUITS_TARGET, `${circuit}.proof`);
    const pwFile = join(CIRCUITS_TARGET, `${circuit}.pw`);

    const sunspotResult = await runCommand(
      'sunspot', ['prove', acirFile, witnessFile, ccsFile, pkFile],
      { timeout: 120000 }
    );

    if (!sunspotResult.success) {
      return res.status(500).json({
        error: `Groth16 proof generation failed: ${sunspotResult.error}`,
      });
    }

    const [proofData, pwData] = await Promise.all([
      readFile(proofFile),
      readFile(pwFile),
    ]);

    // Cleanup temp files
    await Promise.all([
      rm(witnessFile, { force: true }),
      rm(proofFile, { force: true }),
      rm(pwFile, { force: true }),
    ]).catch(() => {});

    return res.status(200).json({
      proof: proofData.toString('base64'),
      publicInputs: pwData.toString('base64'),
      proofBytes: proofData.length,
      publicInputsBytes: pwData.length,
    });
  } catch (err) {
    console.error('Prove API error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    // Cleanup is handled inline (witness file removed after proof gen)
  }
}

/**
 * Format circuit inputs as a TOML file for nargo execute.
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

function runCommand(cmd, args, options = {}) {
  const { timeout = 60000, cwd } = options;

  // Ensure nargo and sunspot are findable
  const env = {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:/usr/local/bin:${process.env.PATH}`,
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
