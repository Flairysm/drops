#!/bin/bash

# Railway build script
echo "🚀 Starting Railway build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Build backend
echo "🔨 Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completed successfully!"
