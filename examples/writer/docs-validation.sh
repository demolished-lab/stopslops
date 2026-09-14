#!/bin/bash
# Documentation validation for Technical Writers
# Ensures documentation quality

echo "=== Documentation Validation ==="

# Validate all markdown files
echo "Validating documentation..."
for f in docs/*.md; do
  echo "  Checking $f..."
  antislop-judge --category docs --file "$f"
done

# Validate README
echo ""
echo "Validating README..."
antislop-judge --category docs --file README.md

# Validate CHANGELOG
echo ""
echo "Validating CHANGELOG..."
antislop-judge --category docs --file CHANGELOG.md

echo ""
echo "=== Documentation Validation Complete ==="
