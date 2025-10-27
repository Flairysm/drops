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
  idleTimeoutMillis: 30000, // Increased timeout
  connectionTimeoutMillis: 30000, // Increased timeout
  ssl: false, // Disable SSL completely
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Simple error handling
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

export const db = drizzle(pool, { schema });

// Simple connection test with retry
export async function testDatabaseConnection(): Promise<boolean> {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection successful');
      return true;
    } catch (error: any) {
      retries++;
      console.error(`❌ Database connection failed (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (retries < maxRetries) {
        console.log(`⏳ Retrying database connection in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.error('❌ Database connection failed after all retries');
  return false;
}