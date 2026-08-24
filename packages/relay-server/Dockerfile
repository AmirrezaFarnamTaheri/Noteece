FROM rust:1.75-slim AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
COPY packages/core-rs ./packages/core-rs
COPY packages/relay-server ./packages/relay-server

RUN cargo build --release -p relay-server

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false relayuser

COPY --from=builder /usr/src/app/target/release/relay-server /usr/local/bin/relay-server

USER relayuser
EXPOSE 3000

ENTRYPOINT ["relay-server"]
