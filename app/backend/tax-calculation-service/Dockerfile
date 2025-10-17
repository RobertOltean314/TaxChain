# Tax Calculation Service Dockerfile
FROM rust:latest as builder

WORKDIR /app

# Copy workspace configuration first for better caching
COPY Cargo.toml Cargo.lock ./

# Copy shared dependencies
COPY shared/ ./shared/

# Copy all service directories (required for workspace)
COPY invoice-service/ ./invoice-service/
COPY tax-calculation-service/ ./tax-calculation-service/
COPY business-entity-service/ ./business-entity-service/
COPY zk-proof-service/ ./zk-proof-service/
COPY validation-service/ ./validation-service/

# Build dependencies first (better Docker layer caching)
RUN cargo build --release --bin tax-calculation-service

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/tax-calculation-service .

EXPOSE 8002

CMD ["./tax-calculation-service"]