const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.orgjlvvrirnpszenxjha:Byys318633!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
});

async function addPrizesColumn() {
  try {
    console.log('Adding prizes column to raffles table...');
    
    // Add the prizes column
    await pool.query('ALTER TABLE raffles ADD COLUMN IF NOT EXISTS prizes JSONB');
    console.log('✅ Added prizes column');
    
    // Update existing records to have default prizes structure
    await pool.query(`
      UPDATE raffles 
      SET prizes = jsonb_build_array(
        jsonb_build_object(
          'position', 1,
          'name', COALESCE(prize_name, ''),
          'type', COALESCE(prize_type, 'pack'),
          'value', COALESCE(prize_value::text, '')
        )
      )
      WHERE prizes IS NULL
    `);
    console.log('✅ Updated existing records with default prizes');
    
    // Make the column not null
    await pool.query('ALTER TABLE raffles ALTER COLUMN prizes SET NOT NULL');
    console.log('✅ Made prizes column NOT NULL');
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addPrizesColumn();

