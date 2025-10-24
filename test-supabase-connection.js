import { Pool } from 'pg';

// Test different connection configurations
const connectionConfigs = [
  {
    name: 'Direct Supabase (Working)',
    url: 'postgresql://postgres:Byys318633!@db.orgjlvvrirnpszenxjha.supabase.co:5432/postgres?sslmode=disable'
  },
  {
    name: 'Direct Supabase (SSL)',
    url: 'postgresql://postgres:Byys318633!@db.orgjlvvrirnpszenxjha.supabase.co:5432/postgres?sslmode=require'
  },
  {
    name: 'Supabase Pooler',
    url: 'postgresql://postgres:Byys318633!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=1'
  }
];

async function testConnection(config) {
  console.log(`\n🔍 Testing ${config.name}...`);
  console.log(`URL: ${config.url.replace(/\/\/.*@/, '//***@')}`);
  
  const pool = new Pool({
    connectionString: config.url,
    max: 1,
    ssl: false, // Disable SSL completely
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    console.log(`✅ ${config.name}: Connection successful!`);
    console.log(`   Result: ${JSON.stringify(result.rows[0])}`);
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ ${config.name}: Connection failed`);
    console.log(`   Error: ${error.message}`);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Supabase connection configurations...');
  
  for (const config of connectionConfigs) {
    const success = await testConnection(config);
    if (success) {
      console.log(`\n🎉 Found working configuration: ${config.name}`);
      console.log(`Use this URL: ${config.url}`);
      break;
    }
  }
}

main().catch(console.error);
