import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkRaffles() {
  try {
    console.log('🔍 Checking raffles table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'raffles'
      );
    `);
    
    console.log('📋 Raffles table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get all raffles
      const result = await pool.query('SELECT * FROM raffles ORDER BY created_at DESC;');
      console.log('🎯 Found', result.rows.length, 'raffles:');
      
      result.rows.forEach((raffle, index) => {
        console.log(`${index + 1}. ID: ${raffle.id}`);
        console.log(`   Title: ${raffle.title}`);
        console.log(`   Status: ${raffle.status}`);
        console.log(`   Created: ${raffle.created_at}`);
        console.log(`   Active: ${raffle.is_active}`);
        console.log('---');
      });
    } else {
      console.log('❌ Raffles table does not exist!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRaffles();

