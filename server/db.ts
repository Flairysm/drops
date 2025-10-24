import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

// Simple database connection without complex SSL handling
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/drops_dev';

console.log('🔗 Database URL configured:', databaseUrl.replace(/\/\/.*@/, '//***@'));

export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 2, // Small pool for Vercel
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ssl: false, // Disable SSL completely
});

// Simple error handling
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

export const db = drizzle(pool, { schema });

// Simple connection test
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}