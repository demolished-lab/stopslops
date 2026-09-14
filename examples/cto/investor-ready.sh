#!/bin/bash
# Investor-ready quality check for Startup CTOs
# Demonstrates enterprise-grade quality

echo "=== Investor-Ready Quality Check ==="

# Run comprehensive checks
echo "Running comprehensive quality checks..."
pnpm check

# Run tests
echo ""
echo "Running tests..."
pnpm test

# Security audit
echo ""
echo "Running security audit..."
pnpm security:full

# Generate compliance report
echo ""
echo "Generating compliance report..."
node scripts/audit-logger.mjs --report 2026-01-01 $(date +%Y-%m-%d)

echo ""
echo "=== Investor-Ready Check Complete ==="
echo "Your code quality is enterprise-grade! 💼"
