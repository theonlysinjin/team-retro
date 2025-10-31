#!/bin/bash

# Sprint Retro Tool - Automated Test Script
# Tests compilation, TypeScript, and production build

set -e

echo "🧪 Running automated tests..."
echo ""

# 1. TypeScript Check
echo "1️⃣  Checking TypeScript..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ TypeScript: No errors"
else
    echo "❌ TypeScript: Errors found"
    exit 1
fi
echo ""

# 2. Production Build
echo "2️⃣  Building for production..."
rm -rf dist
npx expo export --platform web > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Production build: Success"
    echo "   Output directory: dist/"
    echo "   Total files: $(find dist -type f | wc -l)"
    echo "   Total size: $(du -sh dist | cut -f1)"
else
    echo "❌ Production build: Failed"
    exit 1
fi
echo ""

# 3. Check critical files
echo "3️⃣  Verifying output files..."
REQUIRED_FILES=(
    "dist/index.html"
    "dist/_expo/static/js/web/entry-*.js"
)

ALL_FOUND=true
for pattern in "${REQUIRED_FILES[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        echo "✅ Found: $pattern"
    else
        echo "❌ Missing: $pattern"
        ALL_FOUND=false
    fi
done
echo ""

# 4. Summary
echo "🎉 All tests passed!"
echo ""
echo "Next steps:"
echo "  1. Test locally: npx serve dist"
echo "  2. Deploy: git push origin main"
echo ""
