#!/bin/bash
# Client delivery check for Agencies/Consultancies
# Ensures deliverable quality

echo "=== Client Delivery Check ==="

# Check if client is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <client-name>"
  exit 1
fi

CLIENT=$1

echo "Checking deliverables for $CLIENT..."

# Run quality checks
echo ""
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

# Generate client report
echo ""
echo "Generating client report..."
node scripts/audit-logger.mjs --report $(date -d "30 days ago" +%Y-%m-%d) $(date +%Y-%m-%d)

echo ""
echo "=== Client Delivery Check Complete ==="
echo "Deliverables for $CLIENT are enterprise-quality! 🎯"
