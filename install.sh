#!/usr/bin/env bash

# Noteece deterministic development installer and verifier.
#
# This script intentionally does not download and execute remote installers,
# delete lockfiles, or fall back from frozen dependency installation. Install
# Node.js and Rust from their official distribution channels before running it.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SCRIPT_DIR
readonly MIN_NODE_MAJOR=20
readonly MIN_RUST_MINOR=80
readonly REQUIRED_PNPM_VERSION="8.15.6"

SKIP_TESTS=false
SKIP_BUILD=false
ONLY_SETUP=false
BUILD_TAURI=false

usage() {
  cat <<'EOF'
Usage: ./install.sh [options]

Options:
  --skip-tests     Install dependencies and build without running verification.
  --skip-build     Install dependencies and run verification without building.
  --only-setup     Install dependencies only.
  --build-tauri    Build native Tauri bundles after the normal workspace build.
  -h, --help       Show this help text.
EOF
}

log() {
  printf '[noteece] %s\n' "$*"
}

fail() {
  printf '[noteece] ERROR: %s\n' "$*" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  printf '[noteece] ERROR: command failed at line %s with exit code %s\n' \
    "${BASH_LINENO[0]:-unknown}" "$exit_code" >&2
  exit "$exit_code"
}
trap on_error ERR

while (($# > 0)); do
  case "$1" in
    --skip-tests)
      SKIP_TESTS=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    --only-setup)
      ONLY_SETUP=true
      SKIP_TESTS=true
      SKIP_BUILD=true
      ;;
    --build-tauri)
      BUILD_TAURI=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      fail "unknown option: $1"
      ;;
  esac
  shift
done

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found"
}

version_ge() {
  local actual=$1
  local required=$2
  [[ "$(printf '%s\n%s\n' "$required" "$actual" | sort -V | head -n1)" == "$required" ]]
}

require_command node
require_command corepack
require_command rustc
require_command cargo
require_command git

NODE_VERSION="$(node --version | sed 's/^v//')"
NODE_MAJOR="${NODE_VERSION%%.*}"
((NODE_MAJOR >= MIN_NODE_MAJOR)) || fail "Node.js ${MIN_NODE_MAJOR}+ is required; found ${NODE_VERSION}"

RUST_VERSION="$(rustc --version | awk '{print $2}')"
RUST_MAJOR="${RUST_VERSION%%.*}"
RUST_REMAINDER="${RUST_VERSION#*.}"
RUST_MINOR="${RUST_REMAINDER%%.*}"
if ((RUST_MAJOR < 1 || (RUST_MAJOR == 1 && RUST_MINOR < MIN_RUST_MINOR))); then
  fail "Rust 1.${MIN_RUST_MINOR}+ is required; found ${RUST_VERSION}"
fi

cd "$SCRIPT_DIR"
[[ -f package.json ]] || fail "package.json is missing from ${SCRIPT_DIR}"
[[ -f pnpm-lock.yaml ]] || fail "pnpm-lock.yaml is required for reproducible installation"
[[ -f Cargo.lock ]] || fail "Cargo.lock is required for reproducible Rust builds"

log "enabling the repository-pinned pnpm version ${REQUIRED_PNPM_VERSION}"
corepack enable
corepack prepare "pnpm@${REQUIRED_PNPM_VERSION}" --activate
require_command pnpm
PNPM_VERSION="$(pnpm --version)"
[[ "$PNPM_VERSION" == "$REQUIRED_PNPM_VERSION" ]] || \
  fail "expected pnpm ${REQUIRED_PNPM_VERSION}; found ${PNPM_VERSION}"

log "installing JavaScript dependencies from the committed lockfile"
pnpm install --frozen-lockfile

log "fetching Rust dependencies from Cargo.lock"
cargo fetch --locked

if [[ "$ONLY_SETUP" == true ]]; then
  log "setup completed"
  exit 0
fi

if [[ "$SKIP_TESTS" == false ]]; then
  log "checking Rust formatting"
  cargo fmt --all -- --check

  log "checking Rust workspace"
  cargo check --workspace --all-targets --locked

  log "running Rust clippy"
  cargo clippy --workspace --all-targets --locked -- -D warnings

  log "running Rust tests"
  cargo test --workspace --all-targets --locked

  log "running JavaScript lint"
  pnpm lint

  log "running TypeScript checks"
  pnpm type-check

  log "running repository coverage suites"
  pnpm test:coverage
fi

if [[ "$SKIP_BUILD" == false ]]; then
  log "building all workspace packages"
  pnpm build

  if [[ "$BUILD_TAURI" == true ]]; then
    case "$(uname -s)" in
      Linux|Darwin|MINGW*|MSYS*|CYGWIN*)
        log "building native Tauri bundles"
        pnpm --dir apps/desktop build:tauri
        ;;
      *)
        fail "unsupported platform for Tauri bundling: $(uname -s)"
        ;;
    esac
  fi
fi

log "verification completed successfully"
log "Node.js ${NODE_VERSION}; pnpm ${PNPM_VERSION}; Rust ${RUST_VERSION}"
