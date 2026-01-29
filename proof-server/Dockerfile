# ZK Proof Server Dockerfile
# Installs nargo (Noir compiler) and sunspot (Groth16 prover) for proof generation

FROM node:20-slim

# Install system dependencies (including OpenSSL dev libs for sunspot compilation)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install noirup (Noir version manager) and nargo
# Using a specific version for reproducibility
ENV NARGO_HOME=/app/.nargo
ENV PATH="${NARGO_HOME}/bin:${PATH}"

RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash \
    && ${NARGO_HOME}/bin/noirup --version 1.0.0-beta.18

# Install sunspot (Groth16 prover for Noir)
# Pin Rust to 1.75.0 - newer versions break wasm-bindgen in sunspot's dependencies
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.75.0
ENV PATH="/root/.cargo/bin:${PATH}"

# Install sunspot from cargo
RUN cargo install sunspot --locked

# Copy package files first for better caching
# NOTE: Build context is repo root, so paths must include proof-server/
COPY proof-server/package*.json ./

# Install Node.js dependencies
RUN npm ci --omit=dev

# Copy circuits (source files and compiled artifacts)
COPY circuits/ ./circuits/

# Copy proving keys from solana-verifiers
# NOTE: .ccs files are in circuits/target/, not solana-verifiers/target/
COPY solana-verifiers/target/*.pk ./solana-verifiers/target/

# Copy server code
COPY proof-server/server.js ./

# Expose port
ENV PORT=3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Run server
CMD ["node", "server.js"]
