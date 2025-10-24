#!/bin/bash

# 🚀 Drops TCG Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Drops TCG Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Please install it with: npm install -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

print_status "Running pre-deployment checks..."

# Check if there are any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. Consider committing them first."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled."
        exit 1
    fi
fi

# Run tests (if they exist)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    print_status "Running tests..."
    npm test || {
        print_error "Tests failed. Please fix them before deploying."
        exit 1
    }
    print_success "All tests passed!"
fi

# Build the project
print_status "Building project..."
npm run build || {
    print_error "Build failed. Please fix build errors before deploying."
    exit 1
}
print_success "Build completed successfully!"

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod || {
    print_error "Deployment failed!"
    exit 1
}

print_success "🎉 Deployment completed successfully!"
print_status "Your app is now live on Vercel!"

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "Check Vercel dashboard for URL")
print_status "Deployment URL: https://$DEPLOYMENT_URL"

# Test the deployment
print_status "Testing deployment..."
if curl -s -f "https://$DEPLOYMENT_URL/api/health" > /dev/null; then
    print_success "✅ Health check passed!"
else
    print_warning "⚠️  Health check failed. Check the deployment logs."
fi

echo ""
print_success "🚀 Deployment process completed!"
print_status "Next steps:"
echo "  1. Test your application at: https://$DEPLOYMENT_URL"
echo "  2. Check logs with: vercel logs"
echo "  3. Monitor performance in Vercel dashboard"
