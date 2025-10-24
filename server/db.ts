import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";
import { sql } from 'drizzle-orm';

// Get database URL and configure it properly
let databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/drops_dev';

console.log('🔗 Original database URL:', databaseUrl.replace(/\/\/.*@/, '//***@')); // Hide credentials in logs

// For Supabase, use the working configuration
if (process.env.NODE_ENV === 'production' && databaseUrl.includes('supabase.com')) {
  // Use the direct connection with SSL disabled (this works!)
  if (databaseUrl.includes('db.supabase.com')) {
    // Keep the direct connection but ensure sslmode=disable
    if (!databaseUrl.includes('sslmode=')) {
      databaseUrl += '&sslmode=disable';
    } else {
      databaseUrl = databaseUrl.replace(/sslmode=[^&]*/, 'sslmode=disable');
    }
  }
  
  console.log('🔗 Modified database URL for Supabase:', databaseUrl.replace(/\/\/.*@/, '//***@'));
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 5, // Allow more connections for better performance
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  acquireTimeoutMillis: 15000,
  ssl: false, // Disable SSL completely for Supabase
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  // Don't exit in production, just log the error
});

// Test connection on startup (non-blocking)
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️  Continuing without database connection...');
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

export const db = drizzle(pool, { schema });

// Test database connectivity
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await db.select(sql`1 as test, current_database() as db_name`).from(sql`pg_database`).limit(1);
    console.log('✅ Database connection test successful:', result[0]);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}