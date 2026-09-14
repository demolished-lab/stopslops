#!/bin/bash
# Student grading for Educational Institutions
# Automated quality-based grading

echo "=== Student Grading ==="

# Check if student file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <student-file>"
  exit 1
fi

STUDENT_FILE=$1

echo "Grading $STUDENT_FILE..."

# Run quality checks
echo ""
echo "Running quality checks..."
antislop-judge --category general-code --file "$STUDENT_FILE"

# Run tests if provided
if [ -f "${STUDENT_FILE%.js}.test.js" ]; then
  echo ""
  echo "Running tests..."
  node "${STUDENT_FILE%.js}.test.js"
fi

echo ""
echo "=== Grading Complete ==="
