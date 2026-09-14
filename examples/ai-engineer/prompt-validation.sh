#!/bin/bash
# Prompt validation for AI/ML Engineers
# Validates LLM prompts and reasoning chains

echo "=== Prompt Validation ==="

# Validate system prompts
echo "Validating system prompts..."
for f in prompts/*.txt; do
  echo "  Checking $f..."
  antislop-judge --category prompts --file "$f"
done

# Validate reasoning chains
echo ""
echo "Validating reasoning chains..."
for f in reasoning/*.md; do
  echo "  Checking $f..."
  antislop-judge --category thinking --file "$f"
done

echo ""
echo "=== Prompt Validation Complete ==="
