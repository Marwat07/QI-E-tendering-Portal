const { query, getClient } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Run database migration to remove compliance_statement and additional_notes columns
 */
async function runMigration() {
  const client = await getClient();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/remove_compliance_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Extract the actual SQL commands (skip comments and \d command)
    const sqlCommands = migrationSQL
      .split('\n')
      .filter(line => 
        !line.trim().startsWith('--') && 
        !line.trim().startsWith('\\') && 
        line.trim() !== '' &&
        !line.trim().startsWith('BEGIN') &&
        !line.trim().startsWith('COMMIT')
      )
      .join('\n');
    
    // Execute the migration in a transaction
    await client.query('BEGIN');
    
    try {
      // Remove compliance_statement column
      await client.query('ALTER TABLE bids DROP COLUMN IF EXISTS compliance_statement');
      console.log('✅ Removed compliance_statement column');
      
      // Remove additional_notes column
      await client.query('ALTER TABLE bids DROP COLUMN IF EXISTS additional_notes');
      console.log('✅ Removed additional_notes column');
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
      
      // Verify the schema changes
      const result = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bids' 
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Current bids table structure:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Database migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
