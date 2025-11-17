#!/bin/bash
# RevClear Repository Cleanup Script
# Run this in WSL terminal: bash cleanup.sh

echo "🧹 Cleaning RevClear repository..."

# Clean Whisper build artifacts
echo "Cleaning Whisper directory..."
cd backend/lambdas/whisper
rm -rf build/ deploy/ *.zip __pycache__/ .pytest_cache/ .venv/ venv/
echo "✓ Whisper cleaned"

# Clean Python cache files
echo "Cleaning Python cache..."
cd /mnt/c/Dev/revclear
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null
echo "✓ Python cache cleaned"

# Clean node_modules if needed (optional - comment out if you want to keep)
# echo "Cleaning node_modules..."
# cd backend/lambdas
# rm -rf node_modules
# npm install
# echo "✓ Node modules reinstalled"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Your repository is now clean and organized."
echo "Next step: Follow TEST_GUIDE.md to test your infrastructure"
