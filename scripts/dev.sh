#!/bin/bash

# 🛠️ Drops TCG Development Script
# This script starts the development environment

set -e

echo "🛠️ Starting Drops TCG Development Environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed!"
fi

# Check if client dependencies are installed
if [ ! -d "client/node_modules" ]; then
    print_status "Installing client dependencies..."
    cd client && npm install && cd ..
    print_success "Client dependencies installed!"
fi

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    print_status "Installing server dependencies..."
    cd server && npm install && cd ..
    print_success "Server dependencies installed!"
fi

print_status "Starting development servers..."

# Start both client and server concurrently
if command -v concurrently &> /dev/null; then
    print_status "Using concurrently to start both servers..."
    concurrently \
        --names "CLIENT,SERVER" \
        --prefix-colors "cyan,yellow" \
        "cd client && npm run dev" \
        "cd server && npm run dev"
else
    print_warning "concurrently not found. Starting servers manually..."
    print_status "Starting server on port 3000..."
    cd server && npm run dev &
    SERVER_PID=$!
    
    print_status "Starting client on port 5173..."
    cd client && npm run dev &
    CLIENT_PID=$!
    
    # Wait for both processes
    wait $SERVER_PID $CLIENT_PID
fi
