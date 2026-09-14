#!/bin/bash
# Architecture compliance check for System Architects
# Validates microservice boundaries and API consistency

echo "=== Architecture Compliance Check ==="

# Check API consistency across services
echo "Checking API consistency..."
for service in user-service order-service payment-service; do
  echo "  Checking $service..."
  antislop-check --category api --path /services/$service
done

# Check for architectural drift
echo "Checking for architectural drift..."
antislop-check --path /monolith

echo "=== Architecture Check Complete ==="
