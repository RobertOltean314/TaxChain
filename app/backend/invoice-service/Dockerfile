# Invoice Service Dockerfile
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
RUN cargo build --release --bin invoice-service

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies including curl for health checks
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/target/release/invoice-service .

# Change ownership to appuser
RUN chown appuser:appuser /app/invoice-service
RUN chmod +x /app/invoice-service

# Switch to non-root user
USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["./invoice-service"]
