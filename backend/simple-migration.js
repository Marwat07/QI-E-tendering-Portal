const { Client } = require('pg');
require('dotenv').config();

async function runSimpleMigration() {
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

    // Execute each SQL statement individually
    const statements = [
      // Add the column
      `ALTER TABLE users ADD COLUMN credential_expires_at TIMESTAMP;`,
      
      // Set default expiry for existing users (1 year from their created_at date)
      `UPDATE users 
       SET credential_expires_at = created_at + INTERVAL '1 year' 
       WHERE credential_expires_at IS NULL;`,
      
      // Add comment to column
      `COMMENT ON COLUMN users.credential_expires_at IS 'Timestamp when user credentials expire (1 year from creation/last credential update)';`,
      
      // Create index for efficient queries on credential expiry
      `CREATE INDEX idx_users_credential_expires_at ON users(credential_expires_at);`
    ];

    for (let i = 0; i < statements.length; i++) {
      try {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statements[i]);
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

    // Check how many users now have credential expiry dates
    const userCount = await client.query(`
      SELECT COUNT(*) as total_users, 
             COUNT(credential_expires_at) as users_with_expiry
      FROM users
    `);
    
    console.log('📊 User credential status:');
    console.log(`   Total users: ${userCount.rows[0].total_users}`);
    console.log(`   Users with expiry dates: ${userCount.rows[0].users_with_expiry}`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔐 Database connection closed');
  }
}

// Run the migration
console.log('🚀 Starting simple credential expiry migration...');
runSimpleMigration();