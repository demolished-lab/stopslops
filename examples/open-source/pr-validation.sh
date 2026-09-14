#!/bin/bash
# PR validation for Open Source Maintainers
# Validates contributions automatically

echo "=== PR Validation ==="

# Check if PR is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <pr-number>"
  exit 1
fi

PR_NUMBER=$1

# Fetch PR changes
echo "Fetching PR #$PR_NUMBER changes..."
git fetch origin pull/$PR_NUMBER/head:pr-$PR_NUMBER

# Run quality checks on PR
echo ""
echo "Running quality checks on PR..."
git checkout pr-$PR_NUMBER
pnpm check

# Run tests
echo ""
echo "Running tests..."
pnpm test

# Clean up
git checkout main
git branch -D pr-$PR_NUMBER

echo ""
echo "=== PR Validation Complete ==="
