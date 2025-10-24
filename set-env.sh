#!/bin/bash

# Set the DATABASE_URL environment variable for Vercel
vercel env add DATABASE_URL production <<EOF
postgresql://postgres:Byys318633!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=1&pool_timeout=0&statement_timeout=0&idle_in_transaction_session_timeout=0
EOF
