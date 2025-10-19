#!/bin/bash

# ============================================================================
# Frontend Deployment Test Script
# ============================================================================
# This script tests the frontend build locally before pushing to GitHub
# ============================================================================

set -e

echo "========================================="
echo "Testing Frontend Deployment"
echo "========================================="

# ============================================================================
# CHECK DEPENDENCIES
# ============================================================================

echo ""
echo "🔍 Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js 20+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found! Please install npm"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

echo ""
echo "📦 Installing dependencies..."

if [ ! -d "node_modules" ]; then
    echo "Running npm install..."
    npm install
else
    echo "node_modules exists, skipping install"
    echo "Run 'rm -rf node_modules && npm install' to reinstall"
fi

# ============================================================================
# BUILD FRONTEND
# ============================================================================

echo ""
echo "🏗️  Building frontend..."

npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist/ directory not found"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "Build output:"
ls -lh dist/
echo ""
echo "Build size: $(du -sh dist | cut -f1)"

# ============================================================================
# VERIFY BUILD CONTENTS
# ============================================================================

echo ""
echo "🔍 Verifying build contents..."

REQUIRED_FILES=(
    "dist/index.html"
    "dist/assets"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        echo "❌ Missing required file/directory: $file"
        exit 1
    fi
    echo "✅ Found: $file"
done

# ============================================================================
# CHECK FOR COMMON ISSUES
# ============================================================================

echo ""
echo "🔍 Checking for common issues..."

# Check if index.html has script tags
if ! grep -q "<script" dist/index.html; then
    echo "⚠️  WARNING: No <script> tags found in index.html"
fi

# Check if assets directory has files
ASSET_COUNT=$(find dist/assets -type f 2>/dev/null | wc -l)
if [ "$ASSET_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: No files found in dist/assets/"
else
    echo "✅ Found $ASSET_COUNT asset files"
fi

# ============================================================================
# PREVIEW BUILD (OPTIONAL)
# ============================================================================

echo ""
echo "========================================="
echo "✅ Build Test Complete!"
echo "========================================="
echo ""
echo "Build size: $(du -sh dist | cut -f1)"
echo "Asset files: $ASSET_COUNT"
echo ""
echo "To preview the build locally:"
echo "  npm run preview"
echo ""
echo "To deploy to production:"
echo "  git add ."
echo "  git commit -m 'Your commit message'"
echo "  git push origin main"
echo ""
echo "========================================="

# ============================================================================
# OPTIONAL: START PREVIEW SERVER
# ============================================================================

read -p "Start preview server now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting preview server..."
    echo "Press Ctrl+C to stop"
    echo ""
    npm run preview
fi

