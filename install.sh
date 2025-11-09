#!/bin/bash

################################################################################
# Noteece - One-Click Installation and Build Automation Script
# Supports: macOS (Intel & Apple Silicon), Linux (Ubuntu, Fedora, etc.)
#
# Usage: bash install.sh [--skip-tests] [--skip-build] [--only-setup]
#
# Features:
# - System requirement verification
# - Automatic dependency installation
# - Repository setup
# - Comprehensive test suite
# - Multi-platform builds (desktop, mobile)
# - Installation package generation
# - Release artifact creation
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="Noteece"
MIN_NODE_VERSION="18.0.0"
MIN_RUST_VERSION="1.70.0"
MIN_PNPM_VERSION="8.0.0"

# Flags
SKIP_TESTS=false
SKIP_BUILD=false
ONLY_SETUP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --only-setup)
            ONLY_SETUP=true
            SKIP_TESTS=true
            SKIP_BUILD=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
    echo -e "\n${CYAN}→ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

get_version() {
    local cmd=$1
    local version_flag=${2:-"--version"}

    if check_command "$cmd"; then
        "$cmd" "$version_flag" 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1
    else
        echo "not found"
    fi
}

compare_versions() {
    printf '%s\n%s' "$2" "$1" | sort -V -C
}

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

detect_arch() {
    local machine=$(uname -m)
    case "$machine" in
        x86_64|amd64)
            echo "x86_64"
            ;;
        arm64|aarch64)
            echo "arm64"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

detect_linux_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

################################################################################
# System Detection
################################################################################

print_header "System Detection"

OS=$(detect_os)
ARCH=$(detect_arch)
DISTRO="unknown"

if [ "$OS" = "linux" ]; then
    DISTRO=$(detect_linux_distro)
fi

echo "Operating System: $(echo $OS | tr '[:lower:]' '[:upper:]')"
echo "Architecture: $ARCH"
if [ "$OS" = "linux" ]; then
    echo "Distribution: $(echo $DISTRO | tr '[:lower:]' '[:upper:]')"
fi

if [ "$OS" = "unknown" ]; then
    print_error "Unsupported operating system"
    exit 1
fi

if [ "$ARCH" = "unknown" ]; then
    print_error "Unsupported architecture"
    exit 1
fi

################################################################################
# Dependency Checking
################################################################################

print_header "Checking System Requirements"

declare -A dependency_status

# Check Node.js
node_version=$(get_version "node" "-v" | sed 's/v//')
if [ "$node_version" != "not found" ]; then
    if compare_versions "$node_version" "$MIN_NODE_VERSION"; then
        dependency_status["node"]="✓"
        print_success "Node.js $node_version (required: $MIN_NODE_VERSION+)"
    else
        dependency_status["node"]="✗"
        print_error "Node.js $node_version (required: $MIN_NODE_VERSION+)"
    fi
else
    dependency_status["node"]="✗"
    print_error "Node.js not found (required: $MIN_NODE_VERSION+)"
fi

# Check Rust
rust_version=$(get_version "rustc" "-V" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
if [ "$rust_version" != "not found" ] && [ ! -z "$rust_version" ]; then
    if compare_versions "$rust_version" "$MIN_RUST_VERSION"; then
        dependency_status["rust"]="✓"
        print_success "Rust $rust_version (required: $MIN_RUST_VERSION+)"
    else
        dependency_status["rust"]="✗"
        print_error "Rust $rust_version (required: $MIN_RUST_VERSION+)"
    fi
else
    dependency_status["rust"]="✗"
    print_error "Rust not found (required: $MIN_RUST_VERSION+)"
fi

# Check pnpm
pnpm_version=$(get_version "pnpm" "-v")
if [ "$pnpm_version" != "not found" ]; then
    if compare_versions "$pnpm_version" "$MIN_PNPM_VERSION"; then
        dependency_status["pnpm"]="✓"
        print_success "pnpm $pnpm_version (required: $MIN_PNPM_VERSION+)"
    else
        dependency_status["pnpm"]="✗"
        print_error "pnpm $pnpm_version (required: $MIN_PNPM_VERSION+)"
    fi
else
    dependency_status["pnpm"]="✗"
    print_error "pnpm not found (required: $MIN_PNPM_VERSION+)"
fi

# Check Git
if check_command "git"; then
    git_version=$(get_version "git" "--version" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    dependency_status["git"]="✓"
    print_success "Git $git_version"
else
    dependency_status["git"]="✗"
    print_error "Git not found"
fi

################################################################################
# Dependency Installation
################################################################################

print_header "Installing Missing Dependencies"

# Node.js installation
if [ "${dependency_status[node]}" = "✗" ]; then
    print_step "Installing Node.js..."

    if [ "$OS" = "macos" ]; then
        if check_command "brew"; then
            brew install node
            print_success "Node.js installed via Homebrew"
        else
            print_error "Homebrew not found. Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    elif [ "$OS" = "linux" ]; then
        if [ "$DISTRO" = "ubuntu" ] || [ "$DISTRO" = "debian" ]; then
            sudo apt-get update
            sudo apt-get install -y curl gnupg2 ca-certificates apt-transport-https software-properties-common
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            print_success "Node.js installed via apt"
        elif [ "$DISTRO" = "fedora" ] || [ "$DISTRO" = "rhel" ] || [ "$DISTRO" = "centos" ]; then
            sudo dnf install -y nodejs
            print_success "Node.js installed via dnf"
        else
            print_warning "Automatic Node.js installation not supported for $DISTRO. Please install manually."
        fi
    fi
fi

# Rust installation
if [ "${dependency_status[rust]}" = "✗" ]; then
    print_step "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    print_success "Rust installed"
fi

# pnpm installation
if [ "${dependency_status[pnpm]}" = "✗" ]; then
    print_step "Installing pnpm..."
    npm install -g pnpm@8
    print_success "pnpm installed"
fi

# Additional dependencies for Rust builds
print_step "Installing Rust build targets..."
rustup target add x86_64-unknown-linux-gnu 2>/dev/null || true
if [ "$OS" = "macos" ]; then
    rustup target add x86_64-apple-darwin aarch64-apple-darwin 2>/dev/null || true
fi
print_success "Rust targets configured"

# Platform-specific system dependencies
if [ "$OS" = "macos" ]; then
    print_step "Installing macOS build dependencies..."
    if check_command "brew"; then
        brew install --cask xcode-select 2>/dev/null || true
        xcode-select --install 2>/dev/null || true
        print_success "Xcode Command Line Tools ready"
    fi
elif [ "$OS" = "linux" ]; then
    print_step "Installing Linux build dependencies..."
    if [ "$DISTRO" = "ubuntu" ] || [ "$DISTRO" = "debian" ]; then
        sudo apt-get update
        sudo apt-get install -y build-essential pkg-config libssl-dev libsoup-2.4-dev \
            libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.0-dev
        print_success "Linux build dependencies installed"
    elif [ "$DISTRO" = "fedora" ] || [ "$DISTRO" = "rhel" ]; then
        sudo dnf install -y gcc g++ make openssl-devel libsoup-devel gtk3-devel \
            libayatana-appindicator-devel librsvg2-devel webkit2gtk4.0-devel
        print_success "Linux build dependencies installed"
    fi
fi

################################################################################
# Repository Setup
################################################################################

print_header "Repository Setup"

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    print_error "package.json not found. Are you running this from the project root?"
    exit 1
fi

print_success "Project directory: $SCRIPT_DIR"

# Clean previous installations if needed
if [ -d "$SCRIPT_DIR/node_modules" ]; then
    print_warning "Existing node_modules found. Cleaning..."
    rm -rf "$SCRIPT_DIR/node_modules" "$SCRIPT_DIR/pnpm-lock.yaml"
fi

print_step "Installing Node dependencies..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile || pnpm install
print_success "Node dependencies installed"

print_step "Setting up Rust workspace..."
if [ -f "$SCRIPT_DIR/Cargo.toml" ]; then
    cargo fetch
    print_success "Rust workspace ready"
else
    print_warning "No Cargo.toml found at project root"
fi

################################################################################
# Configuration
################################################################################

print_header "Configuration Setup"

print_step "Creating .env file if not exists..."
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cat > "$SCRIPT_DIR/.env" << EOF
# Noteece Configuration

# Server Configuration
NOTEECE_SERVER_PORT=8765
NOTEECE_SERVER_HOST=127.0.0.1

# Sync Configuration
NOTEECE_SYNC_PORT=8443
NOTEECE_SYNC_AUTO_INTERVAL=300

# Database Configuration
NOTEECE_DB_PATH=$HOME/.noteece/data
NOTEECE_BACKUP_PATH=$HOME/.noteece/backups

# Security Configuration
NOTEECE_ENABLE_HTTPS=false
NOTEECE_DEV_MODE=true

# Build Configuration
NOTEECE_VERSION=1.0.0
EOF
    print_success ".env file created with defaults"
else
    print_success ".env file already exists"
fi

################################################################################
# Testing
################################################################################

if [ "$SKIP_TESTS" = false ] && [ "$ONLY_SETUP" = false ]; then
    print_header "Running Test Suite"

    print_step "Running all tests..."
    if pnpm test 2>&1 | tee "$SCRIPT_DIR/.test-output.log"; then
        print_success "All tests passed ✓"
    else
        print_error "Some tests failed. Review .test-output.log"
        exit 1
    fi
fi

################################################################################
# Building
################################################################################

if [ "$SKIP_BUILD" = false ] && [ "$ONLY_SETUP" = false ]; then
    print_header "Building Noteece"

    # Create distribution directory
    mkdir -p "$SCRIPT_DIR/dist"

    # Build desktop app
    print_step "Building desktop application..."
    cd "$SCRIPT_DIR/apps/desktop"

    case "$OS" in
        macos)
            if [ "$ARCH" = "x86_64" ]; then
                print_step "Building macOS (Intel x86_64)..."
                if pnpm build -- --target x86_64-apple-darwin > "$SCRIPT_DIR/.build-output-x86_64.log" 2>&1; then
                    tail -20 "$SCRIPT_DIR/.build-output-x86_64.log"
                    print_success "macOS Intel build complete"
                else
                    print_error "macOS Intel build failed. See .build-output-x86_64.log for details."
                    cat "$SCRIPT_DIR/.build-output-x86_64.log" | tail -50
                    exit 1
                fi
            fi

            if [ "$ARCH" = "arm64" ]; then
                print_step "Building macOS (Apple Silicon arm64)..."
                if pnpm build -- --target aarch64-apple-darwin > "$SCRIPT_DIR/.build-output-arm64.log" 2>&1; then
                    tail -20 "$SCRIPT_DIR/.build-output-arm64.log"
                    print_success "macOS Apple Silicon build complete"
                else
                    print_error "macOS Apple Silicon build failed. See .build-output-arm64.log for details."
                    cat "$SCRIPT_DIR/.build-output-arm64.log" | tail -50
                    exit 1
                fi
            fi
            ;;
        linux)
            print_step "Building Linux (x86_64)..."
            if pnpm build -- --target x86_64-unknown-linux-gnu > "$SCRIPT_DIR/.build-output-linux.log" 2>&1; then
                tail -20 "$SCRIPT_DIR/.build-output-linux.log"
                print_success "Linux build complete"
            else
                print_error "Linux build failed. See .build-output-linux.log for details."
                cat "$SCRIPT_DIR/.build-output-linux.log" | tail -50
                exit 1
            fi
            ;;
    esac

    # Collect artifacts
    print_step "Collecting build artifacts..."
    if [ -d "$SCRIPT_DIR/apps/desktop/dist" ]; then
        cp -r "$SCRIPT_DIR/apps/desktop/dist"/* "$SCRIPT_DIR/dist/" 2>/dev/null || true
    fi

    print_success "Desktop build complete"
fi

################################################################################
# Build Verification
################################################################################

print_header "Build Verification"

print_step "Checking generated artifacts..."

if [ -d "$SCRIPT_DIR/dist" ]; then
    artifact_count=$(find "$SCRIPT_DIR/dist" -type f | wc -l)
    if [ "$artifact_count" -gt 0 ]; then
        print_success "Generated $artifact_count artifacts in ./dist/"
        echo ""
        echo "Available packages:"
        find "$SCRIPT_DIR/dist" -type f -exec ls -lh {} \; | awk '{print "  - " $9 " (" $5 ")"}'
    else
        print_warning "No artifacts found in ./dist/"
    fi
else
    print_warning "Distribution directory not found"
fi

################################################################################
# Summary
################################################################################

print_header "Installation Complete!"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC} ${PROJECT_NAME} has been successfully installed!               ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo ""

if [ "$OS" = "macos" ]; then
    if [ -f "$SCRIPT_DIR/dist/Noteece.dmg" ]; then
        echo "1. Open the installation package:"
        echo "   open ./dist/Noteece.dmg"
        echo ""
    fi
fi

echo "2. Run the application:"
echo "   cd apps/desktop"
echo "   pnpm dev"
echo ""
echo "3. For mobile development:"
echo "   cd apps/mobile"
echo "   pnpm dev"
echo ""
echo "4. For backend development:"
echo "   cargo run --package core-rs"
echo ""

echo -e "${CYAN}Configuration:${NC}"
echo "  - Environment: .env"
echo "  - Build config: build.config.ts"
echo "  - Installation: INSTALLATION.md"
echo ""

echo -e "${CYAN}Documentation:${NC}"
echo "  - See INSTALLATION.md for detailed setup instructions"
echo "  - See README.md for project overview"
echo ""

echo -e "${CYAN}Version Info:${NC}"
echo "  - Node.js: $(node -v)"
echo "  - Rust: $(rustc --version)"
echo "  - pnpm: $(pnpm -v)"
echo ""

if [ "$SKIP_TESTS" = true ]; then
    print_warning "Tests were skipped. Run 'pnpm test' to verify installation."
fi

if [ "$SKIP_BUILD" = true ]; then
    print_warning "Build was skipped. Run 'pnpm build' to create installation packages."
fi

echo -e "${GREEN}Enjoy Noteece! 🎉${NC}\n"
