import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For development, use a default database URL if not set
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/drops_dev';

console.log('🔗 Using database URL:', databaseUrl.replace(/\/\/.*@/, '//***@')); // Hide credentials in logs

// Configure PostgreSQL connection pool for Supabase
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(-1);
    } else {
      console.log('⚠️  Database connection failed, but continuing in development mode');
    }
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

export const db = drizzle(pool, { schema });