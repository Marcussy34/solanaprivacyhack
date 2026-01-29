# ZK Proof Server Dockerfile
# Installs nargo (Noir compiler) and sunspot (Groth16 prover) for proof generation

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install noirup (Noir version manager) and nargo
# Using a specific version for reproducibility
ENV NARGO_HOME=/app/.nargo
ENV PATH="${NARGO_HOME}/bin:${PATH}"

RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash \
    && ${NARGO_HOME}/bin/noirup --version 1.0.0-beta.18

# Install Go (required to build sunspot)
ENV GO_VERSION=1.21.6
RUN curl -OL https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install sunspot from reilabs/sunspot (Go binary for Noir Groth16 proofs)
RUN git clone https://github.com/reilabs/sunspot.git /tmp/sunspot \
    && cd /tmp/sunspot/go && go build -o /usr/local/bin/sunspot . \
    && rm -rf /tmp/sunspot

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
