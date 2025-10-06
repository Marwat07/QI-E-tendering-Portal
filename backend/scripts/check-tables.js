const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'Bidding',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123'),
};

async function checkTables() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to database...');
    console.log('Config:', { 
      host: dbConfig.host, 
      port: dbConfig.port, 
      database: dbConfig.database, 
      user: dbConfig.user 
    });
    
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // List all tables
    console.log('\n📋 Checking all tables in database...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Found tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check specifically for file_uploads table
    console.log('\n🔍 Checking file_uploads table...');
    const fileUploadsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'file_uploads'
      );
    `);
    
    if (fileUploadsCheck.rows[0].exists) {
      console.log('✅ file_uploads table exists');
      
      // Get table structure
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'file_uploads' 
        ORDER BY ordinal_position
      `);
      
      console.log('Table structure:');
      structure.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('❌ file_uploads table does NOT exist');
    }
    
    // Check for any file-related tables
    console.log('\n🔍 Looking for file-related tables...');
    const fileTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%file%'
      ORDER BY table_name
    `);
    
    if (fileTablesResult.rows.length > 0) {
      console.log('File-related tables found:');
      fileTablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('No file-related tables found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

checkTables();