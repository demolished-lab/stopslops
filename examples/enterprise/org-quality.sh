#!/bin/bash
# Organization-wide quality for Enterprise
# Multi-team enforcement

echo "=== Organization-Wide Quality ==="

# Check all services
echo "Checking all services..."
for service in user-service order-service payment-service notification-service; do
  echo ""
  echo "Checking $service..."
  antislop-check --path /services/$service
done

# Check all documentation
echo ""
echo "Checking documentation..."
for f in docs/*.md; do
  antislop-judge --category docs --file "$f"
done

# Generate organization report
echo ""
echo "Generating organization report..."
node scripts/audit-logger.mjs --report $(date -d "30 days ago" +%Y-%m-%d) $(date +%Y-%m-%d)

echo ""
echo "=== Organization-Wide Quality Complete ==="
