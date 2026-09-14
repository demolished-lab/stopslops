#!/bin/bash
# Compliance audit for Security Engineers
# SOX, HIPAA, SOC2, GDPR compliance

echo "=== Compliance Audit ==="

# Run security audit
echo "Running security audit..."
node scripts/security-audit-full.mjs

# Generate compliance report
echo ""
echo "Generating compliance report..."
node scripts/audit-logger.mjs --report 2026-01-01 $(date +%Y-%m-%d)

# Check for vulnerabilities
echo ""
echo "Checking for vulnerabilities..."
npm audit

echo ""
echo "=== Compliance Audit Complete ==="
