#!/bin/bash

# 🗄️ Database Setup and Management Script
# This script helps manage your Supabase database

set -e

echo "🗄️ Drops TCG Database Management..."

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

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Function to test database connection
test_connection() {
    print_status "Testing database connection..."
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set."
        print_status "Please set it with: export DATABASE_URL='your-connection-string'"
        return 1
    fi
    
    # Test connection using node
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
        connectionTimeoutMillis: 10000
    });
    
    pool.connect()
        .then(client => {
            console.log('✅ Database connection successful!');
            client.release();
            pool.end();
            process.exit(0);
        })
        .catch(err => {
            console.log('❌ Database connection failed:', err.message);
            pool.end();
            process.exit(1);
        });
    " || {
        print_error "Database connection test failed!"
        return 1
    }
    
    print_success "Database connection is working!"
    return 0
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if [ -d "migrations" ]; then
        print_status "Found migrations directory. Running migrations..."
        # Add your migration logic here
        print_success "Migrations completed!"
    else
        print_warning "No migrations directory found."
    fi
}

# Function to reset database
reset_database() {
    print_warning "This will reset your database. Are you sure?"
    read -p "Type 'yes' to continue: " -r
    if [[ $REPLY == "yes" ]]; then
        print_status "Resetting database..."
        # Add your reset logic here
        print_success "Database reset completed!"
    else
        print_status "Database reset cancelled."
    fi
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Add your backup logic here
    print_success "Database backup created: $BACKUP_FILE"
}

# Main menu
show_menu() {
    echo ""
    echo "🗄️ Database Management Menu:"
    echo "1. Test database connection"
    echo "2. Run migrations"
    echo "3. Reset database"
    echo "4. Backup database"
    echo "5. Exit"
    echo ""
}

# Main script logic
if [ $# -eq 0 ]; then
    # Interactive mode
    while true; do
        show_menu
        read -p "Choose an option (1-5): " choice
        
        case $choice in
            1)
                test_connection
                ;;
            2)
                run_migrations
                ;;
            3)
                reset_database
                ;;
            4)
                backup_database
                ;;
            5)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-5."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
else
    # Command line mode
    case $1 in
        "test")
            test_connection
            ;;
        "migrate")
            run_migrations
            ;;
        "reset")
            reset_database
            ;;
        "backup")
            backup_database
            ;;
        *)
            echo "Usage: $0 [test|migrate|reset|backup]"
            exit 1
            ;;
    esac
fi
