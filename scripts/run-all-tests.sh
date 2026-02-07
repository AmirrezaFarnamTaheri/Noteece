#!/bin/bash

# Noteece - Comprehensive Test Runner
# Runs all backend (Core, Relay) and frontend tests with coverage reporting

set -e

# Color codes
GREEN="\033[0;32m"
BLUE="\033[0;34m"
RED="\033[0;31m"
NC="\033[0m" # No Color

FAILED=0

echo "========================================="
echo "  Noteece Comprehensive Test Suite"
echo "========================================="
echo ""

run_tests() {
    package=$1
    name=$2
    echo -e "${BLUE}Testing $name ($package)...${NC}"

    if [ -d "$package" ]; then
        cd "$package"
        if [ -f "Cargo.toml" ]; then
            if cargo test --color always 2>&1 | tee /tmp/test-$name.log; then
                echo -e "${GREEN}✓ $name tests passed${NC}"
            else
                echo -e "${RED}✗ $name tests failed${NC}"
                FAILED=1
            fi

            echo -e "${BLUE}Running Clippy for $name...${NC}"
            if cargo clippy --all -- -D warnings 2>&1 | tee /tmp/lint-$name.log; then
                echo -e "${GREEN}✓ $name linting passed${NC}"
            else
                echo -e "${RED}✗ $name linting failed${NC}"
                FAILED=1
            fi
        elif [ -f "package.json" ]; then
             if [ ! -d "node_modules" ]; then
                echo "Installing dependencies..."
                npm install
            fi

            if npm test -- --passWithNoTests 2>&1 | tee /tmp/test-$name.log; then
                 echo -e "${GREEN}✓ $name tests passed${NC}"
            else
                 echo -e "${RED}✗ $name tests failed${NC}"
                 FAILED=1
            fi

            echo -e "${BLUE}Running ESLint for $name...${NC}"
             if npm run lint 2>&1 | tee /tmp/lint-$name.log; then
                echo -e "${GREEN}✓ $name linting passed${NC}"
            else
                echo -e "${RED}⚠ $name linting found issues${NC}"
            fi
        fi
        cd - > /dev/null
    else
        echo -e "${RED}⚠ Package directory $package not found${NC}"
    fi
    echo ""
}

# 1. Core Rust Backend
run_tests "packages/core-rs" "Core-RS"

# 2. Relay Server
run_tests "packages/relay-server" "Relay-Server"

# 3. Desktop App
run_tests "apps/desktop" "Desktop-App"

# Summary
echo "========================================="
echo -e "${BLUE}Test Summary${NC}"
echo "========================================="

echo "Check logs in /tmp/ for details:"
echo "  - /tmp/test-Core-RS.log"
echo "  - /tmp/test-Relay-Server.log"
echo "  - /tmp/test-Desktop-App.log"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================="
    echo -e "  ✓ All tests passed!"
    echo -e "=========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================="
    echo -e "  ✗ Some tests failed"
    echo -e "=========================================${NC}"
    exit 1
fi
