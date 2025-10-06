const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
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

async function createFileUploadsTable() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_file_uploads_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n🔧 Creating file_uploads table...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ file_uploads table created successfully!');
    
    // Verify the table was created
    console.log('\n🔍 Verifying table creation...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'file_uploads'
    `);
    
    console.log('\nIndexes:');
    indexResult.rows.forEach(row => {
      console.log(`  ${row.indexname}: ${row.indexdef}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

createFileUploadsTable();