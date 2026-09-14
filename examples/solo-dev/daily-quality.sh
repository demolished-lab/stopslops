#!/bin/bash
# Daily quality routine for Solo Developers
# Personal quality gate before shipping

echo "=== Daily Quality Routine ==="

# Run all checks
echo "Running quality checks..."
pnpm check

# Run tests
echo ""
echo "Running tests..."
pnpm test

# Security scan
echo ""
echo "Running security scan..."
pnpm security

echo ""
echo "=== Quality Routine Complete ==="
echo "You're ready to ship! 🚀"
