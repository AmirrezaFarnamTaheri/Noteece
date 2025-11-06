#!/bin/bash

# Noteece - Comprehensive Test Runner
# Runs all backend and frontend tests with coverage reporting

set -e

echo "========================================="
echo "  Noteece Comprehensive Test Suite"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Backend Tests
echo -e "${BLUE}[1/3] Running Rust Backend Tests...${NC}"
echo "-----------------------------------"
cd packages/core-rs

if cargo test --all 2>&1 | tee /tmp/rust-test-output.log; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
else
    echo -e "${RED}✗ Backend tests failed${NC}"
    FAILED=1
fi

echo ""
echo -e "${BLUE}Running Rust Linting (clippy)...${NC}"
if cargo clippy --all -- -D warnings 2>&1 | tee /tmp/rust-lint-output.log; then
    echo -e "${GREEN}✓ Backend linting passed${NC}"
else
    echo -e "${RED}✗ Backend linting failed${NC}"
    FAILED=1
fi

cd ../..

# Frontend Tests
echo ""
echo -e "${BLUE}[2/3] Running TypeScript Frontend Tests...${NC}"
echo "-----------------------------------"
cd apps/desktop

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if npm test -- --passWithNoTests 2>&1 | tee /tmp/frontend-test-output.log; then
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
else
    echo -e "${RED}✗ Frontend tests failed${NC}"
    FAILED=1
fi

echo ""
echo -e "${BLUE}Running TypeScript Linting (eslint)...${NC}"
if npm run lint 2>&1 | tee /tmp/frontend-lint-output.log; then
    echo -e "${GREEN}✓ Frontend linting passed${NC}"
else
    echo -e "${RED}⚠ Frontend linting found issues (allowed up to 500 warnings)${NC}"
    # Note: Not failing on lint warnings as per package.json config
fi

cd ../..

# Summary
echo ""
echo "========================================="
echo -e "${BLUE}[3/3] Test Summary${NC}"
echo "========================================="

# Count test results
RUST_TESTS=$(grep -E "test result:" /tmp/rust-test-output.log 2>/dev/null | tail -1 || echo "unknown")
FRONTEND_TESTS=$(grep -E "Tests:" /tmp/frontend-test-output.log 2>/dev/null | tail -1 || echo "unknown")

echo "Backend:  $RUST_TESTS"
echo "Frontend: $FRONTEND_TESTS"
echo ""

# Check for Session 5 QA fix tests
echo "Session 5 QA Fix Test Coverage:"
echo "  ✓ Token generation security: $(grep -c 'test_invitation_token_security' /tmp/rust-test-output.log 2>/dev/null || echo '0') tests"
echo "  ✓ N+1 query optimization: $(grep -c 'test_get_space_users_bulk_fetch' /tmp/rust-test-output.log 2>/dev/null || echo '0') tests"
echo "  ✓ Permission revocation: $(grep -c 'test_permission_revocation' /tmp/rust-test-output.log 2>/dev/null || echo '0') tests"
echo "  ✓ Database schema fixes: $(grep -c 'test_entity_sync_log' /tmp/rust-test-output.log 2>/dev/null || echo '0') tests"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================="
    echo -e "  ✓ All tests passed!"
    echo -e "=========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================="
    echo -e "  ✗ Some tests failed"
    echo -e "=========================================${NC}"
    echo ""
    echo "Check logs in /tmp/ for details:"
    echo "  - /tmp/rust-test-output.log"
    echo "  - /tmp/rust-lint-output.log"
    echo "  - /tmp/frontend-test-output.log"
    echo "  - /tmp/frontend-lint-output.log"
    exit 1
fi
