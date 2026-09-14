#!/bin/bash
# Test quality check for QA Engineers
# Validates test quality and coverage

echo "=== Test Quality Check ==="

# Run tests
echo "Running tests..."
pnpm test

# Check test coverage
echo ""
echo "Checking test coverage..."
pnpm test:coverage

# Validate test structure
echo ""
echo "Validating test structure..."
antislop-check --category tests

echo ""
echo "=== Test Quality Check Complete ==="
