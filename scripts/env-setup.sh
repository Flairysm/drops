#!/bin/bash

# 🔧 Environment Setup Script
# This script helps manage environment variables

set -e

echo "🔧 Environment Setup for Drops TCG..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Please install it with: npm install -g vercel"
    exit 1
fi

# Function to pull environment variables from Vercel
pull_env() {
    print_status "Pulling environment variables from Vercel..."
    
    if vercel env pull .env.local; then
        print_success "Environment variables pulled to .env.local"
    else
        print_error "Failed to pull environment variables"
        exit 1
    fi
}

# Function to list environment variables
list_env() {
    print_status "Listing environment variables from Vercel..."
    vercel env ls
}

# Function to add environment variable
add_env() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        print_error "Usage: $0 add <name> <value> [environment]"
        exit 1
    fi
    
    local name="$1"
    local value="$2"
    local env="${3:-production}"
    
    print_status "Adding environment variable: $name"
    
    if echo "$value" | vercel env add "$name" "$env"; then
        print_success "Environment variable $name added to $env"
    else
        print_error "Failed to add environment variable"
        exit 1
    fi
}

# Function to remove environment variable
remove_env() {
    if [ -z "$1" ]; then
        print_error "Usage: $0 remove <name> [environment]"
        exit 1
    fi
    
    local name="$1"
    local env="${2:-production}"
    
    print_warning "Removing environment variable: $name from $env"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if vercel env rm "$name" "$env"; then
            print_success "Environment variable $name removed from $env"
        else
            print_error "Failed to remove environment variable"
            exit 1
        fi
    else
        print_status "Operation cancelled"
    fi
}

# Function to setup required environment variables
setup_required() {
    print_status "Setting up required environment variables..."
    
    # Check if DATABASE_URL exists
    if ! vercel env ls | grep -q "DATABASE_URL"; then
        print_warning "DATABASE_URL not found. Please add it manually."
        print_status "You can add it with: $0 add DATABASE_URL 'your-connection-string'"
    else
        print_success "DATABASE_URL is configured"
    fi
    
    # Check if JWT_SECRET exists
    if ! vercel env ls | grep -q "JWT_SECRET"; then
        print_warning "JWT_SECRET not found. Generating one..."
        local jwt_secret=$(openssl rand -base64 32)
        add_env "JWT_SECRET" "$jwt_secret"
    else
        print_success "JWT_SECRET is configured"
    fi
    
    # Check if SESSION_SECRET exists
    if ! vercel env ls | grep -q "SESSION_SECRET"; then
        print_warning "SESSION_SECRET not found. Generating one..."
        local session_secret=$(openssl rand -base64 32)
        add_env "SESSION_SECRET" "$session_secret"
    else
        print_success "SESSION_SECRET is configured"
    fi
}

# Main script logic
case "${1:-help}" in
    "pull")
        pull_env
        ;;
    "list")
        list_env
        ;;
    "add")
        add_env "$2" "$3" "$4"
        ;;
    "remove")
        remove_env "$2" "$3"
        ;;
    "setup")
        setup_required
        ;;
    "help"|*)
        echo "🔧 Environment Management Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  pull                    Pull environment variables from Vercel to .env.local"
        echo "  list                    List all environment variables in Vercel"
        echo "  add <name> <value> [env] Add environment variable to Vercel"
        echo "  remove <name> [env]     Remove environment variable from Vercel"
        echo "  setup                   Setup required environment variables"
        echo "  help                    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 pull"
        echo "  $0 list"
        echo "  $0 add DATABASE_URL 'postgresql://...' production"
        echo "  $0 remove OLD_VAR development"
        echo "  $0 setup"
        ;;
esac
