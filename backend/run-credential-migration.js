const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runCredentialMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'Bidding',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || '123')
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_credential_expiry_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running credential expiry migration...');
    
    // Split the SQL into individual statements (rough split by semicolon followed by newline)
    const statements = migrationSQL
      .split(';\n')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement + (statement.endsWith(';') ? '' : ';'));
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('column "credential_expires_at" of relation "users" already exists')) {
            console.log(`⚠️ Statement ${i + 1} skipped (already exists):`, error.message);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    
    // Verify the migration worked
    console.log('🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'credential_expires_at'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ credential_expires_at column exists:', verifyResult.rows[0]);
    } else {
      console.log('❌ credential_expires_at column not found');
    }

    // Check the view
    const viewResult = await client.query(`
      SELECT schemaname, viewname 
      FROM pg_views 
      WHERE viewname = 'users_expiring_credentials'
    `);
    
    if (viewResult.rows.length > 0) {
      console.log('✅ users_expiring_credentials view created successfully');
    } else {
      console.log('❌ users_expiring_credentials view not found');
    }

    // Check functions
    const functionResult = await client.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('extend_user_credentials', 'is_user_credentials_expired')
    `);
    
    console.log(`✅ Found ${functionResult.rows.length} credential functions`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔐 Database connection closed');
  }
}

// Run the migration
console.log('🚀 Starting credential expiry migration...');
runCredentialMigration();