#!/bin/bash

# Sprint Retro Tool - Build Script
# Builds the Expo web app for production deployment

set -e

echo "🚀 Building Sprint Retro Tool for production..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build for web
echo "📦 Building Expo web app..."
npx expo export --platform web

echo "✅ Build complete! Output in dist/ directory"
echo ""
echo "To test locally:"
echo "  npx serve dist"
echo ""
echo "To deploy to GitHub Pages, push to main branch (GHA will handle it)"
