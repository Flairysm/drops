const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/drops'
});

async function createTables() {
  const client = await pool.connect();
  
  try {
    // Create raffles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS raffles (
        id varchar(255) PRIMARY KEY NOT NULL,
        title varchar(255) NOT NULL,
        description text,
        prize_name varchar(255) NOT NULL,
        prize_image_url text,
        prize_type varchar(50) NOT NULL,
        prize_value numeric(10, 2),
        total_slots integer NOT NULL,
        price_per_slot numeric(10, 2) NOT NULL,
        filled_slots integer DEFAULT 0,
        max_winners integer DEFAULT 1,
        status varchar(20) DEFAULT 'active',
        is_active boolean DEFAULT true,
        auto_draw boolean DEFAULT true,
        drawn_at timestamp,
        created_at timestamp DEFAULT now(),
        created_by varchar
      );
    `);
    
    // Create raffle_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS raffle_entries (
        id varchar(255) PRIMARY KEY NOT NULL,
        raffle_id varchar(255) NOT NULL,
        user_id varchar,
        slots integer NOT NULL,
        total_cost numeric(10, 2) NOT NULL,
        entry_numbers jsonb NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);
    
    // Create raffle_winners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS raffle_winners (
        id varchar(255) PRIMARY KEY NOT NULL,
        raffle_id varchar(255) NOT NULL,
        user_id varchar,
        entry_id varchar(255) NOT NULL,
        winning_slot integer NOT NULL,
        prize_position integer NOT NULL,
        prize_delivered boolean DEFAULT false,
        delivered_at timestamp,
        created_at timestamp DEFAULT now()
      );
    `);
    
    console.log('✅ Raffle tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();

