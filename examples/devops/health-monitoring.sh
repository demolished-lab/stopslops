#!/bin/bash
# Health monitoring for DevOps/SRE
# Real-time system health checks

echo "=== Health Monitoring ==="

# Check health endpoint
echo "Checking health endpoint..."
curl -s http://localhost:3000/health | jq .

# Check readiness
echo ""
echo "Checking readiness..."
curl -s http://localhost:3000/ready | jq .

# Check liveness
echo ""
echo "Checking liveness..."
curl -s http://localhost:3000/live | jq .

# Check metrics
echo ""
echo "Checking metrics..."
curl -s http://localhost:3000/metrics | jq .

echo ""
echo "=== Health Check Complete ==="
