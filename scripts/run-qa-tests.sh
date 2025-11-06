#!/bin/bash

# Noteece - Session 5 QA Fix Test Runner
# Runs only the new comprehensive tests created in Session 5

set -e

echo "========================================="
echo "  Session 5 QA Fix Test Suite"
echo "========================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Backend QA Tests
echo -e "${BLUE}Running Backend QA Tests...${NC}"
echo "-----------------------------------"
cd packages/core-rs

echo "1. Collaboration RBAC Tests (Token Security, N+1 Fix, Permissions)"
cargo test collaboration_rbac --no-fail-fast -- --nocapture

echo ""
echo "2. Sync Agent Tests (Database Schema, Query Optimization)"
cargo test sync_agent_comprehensive --no-fail-fast -- --nocapture

cd ../..

# Frontend QA Tests
echo ""
echo -e "${BLUE}Running Frontend QA Tests...${NC}"
echo "-----------------------------------"
cd apps/desktop

echo "3. UserManagement QA Fix Tests (Auth Helper, Permission Revocation)"
npm test -- UserManagement.qa-fixes.test.tsx --no-coverage

cd ../..

echo ""
echo -e "${GREEN}========================================="
echo -e "  ✓ All QA tests completed!"
echo -e "=========================================${NC}"
echo ""
echo "Test Coverage:"
echo "  • Token generation security: ✓"
echo "  • N+1 query optimization: ✓"
echo "  • Permission revocation fix: ✓"
echo "  • Database schema fixes: ✓"
echo "  • Auth helper function: ✓"
echo "  • Frontend validation: ✓"
