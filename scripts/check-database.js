#!/usr/bin/env node

// Simple script to test database connection
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log('🔗 Testing database connection...');
console.log('📍 Database URL:', databaseUrl.replace(/\/\/.*@/, '//***@'));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  const client = await pool.connect();
  console.log('✅ Database connection successful!');
  
  const result = await client.query('SELECT NOW() as current_time');
  console.log('🕐 Current database time:', result.rows[0].current_time);
  
  client.release();
  await pool.end();
  
  console.log('🎉 Database test completed successfully!');
} catch (error) {
  console.error('❌ Database connection failed:');
  console.error('Error:', error.message);
  console.error('Code:', error.code);
  
  if (error.code === 'ENOTFOUND') {
    console.log('\n💡 Possible solutions:');
    console.log('1. Check if your Supabase project is paused');
    console.log('2. Verify the database URL is correct');
    console.log('3. Make sure the project reference is correct');
  }
  
  process.exit(1);
}
