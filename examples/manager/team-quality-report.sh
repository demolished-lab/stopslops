#!/bin/bash
# Team quality report for Engineering Managers
# Generates weekly quality metrics

echo "=== Team Quality Report ==="
echo "Date: $(date)"
echo ""

# Generate audit report
echo "Generating audit report..."
node scripts/audit-logger.mjs --report $(date -d "7 days ago" +%Y-%m-%d) $(date +%Y-%m-%d)

# Run quality checks
echo ""
echo "Running quality checks..."
pnpm check

# Show metrics
echo ""
echo "=== Metrics ==="
curl -s http://localhost:3000/metrics | jq .

echo ""
echo "=== Report Complete ==="
