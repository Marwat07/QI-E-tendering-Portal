const { connectDB, query, gracefulShutdown } = require('../config/database');

async function checkAndAddMissingColumns() {
  try {
    await connectDB();
    console.log('Connected to database. Checking for missing columns...');
    
    // Check which columns exist in the users table
    const existingColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    const columnNames = existingColumns.rows.map(row => row.column_name);
    console.log('Existing columns in users table:', columnNames);
    
    const columnsToAdd = [];
    
    // Check for is_active column
    if (!columnNames.includes('is_active')) {
      columnsToAdd.push({
        name: 'is_active',
        definition: 'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL'
      });
    }
    
    // Check for is_verified column
    if (!columnNames.includes('is_verified')) {
      columnsToAdd.push({
        name: 'is_verified',
        definition: 'ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false NOT NULL'
      });
    }
    
    // Check for is_archived column
    if (!columnNames.includes('is_archived')) {
      columnsToAdd.push({
        name: 'is_archived',
        definition: 'ALTER TABLE users ADD COLUMN is_archived BOOLEAN DEFAULT false NOT NULL'
      });
    }
    
    // Check for username column (might be missing too)
    if (!columnNames.includes('username')) {
      columnsToAdd.push({
        name: 'username',
        definition: 'ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE'
      });
    }
    
    // Check for tax_number column
    if (!columnNames.includes('tax_number')) {
      columnsToAdd.push({
        name: 'tax_number',
        definition: 'ALTER TABLE users ADD COLUMN tax_number VARCHAR(255)'
      });
    }
    
    // Check for registration_number column
    if (!columnNames.includes('registration_number')) {
      columnsToAdd.push({
        name: 'registration_number',
        definition: 'ALTER TABLE users ADD COLUMN registration_number VARCHAR(255)'
      });
    }
    
    // Check for website column
    if (!columnNames.includes('website')) {
      columnsToAdd.push({
        name: 'website',
        definition: 'ALTER TABLE users ADD COLUMN website VARCHAR(255)'
      });
    }
    
    // Check for reset_token column
    if (!columnNames.includes('reset_token')) {
      columnsToAdd.push({
        name: 'reset_token',
        definition: 'ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)'
      });
    }
    
    // Check for reset_token_expires column
    if (!columnNames.includes('reset_token_expires')) {
      columnsToAdd.push({
        name: 'reset_token_expires',
        definition: 'ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP'
      });
    }
    
    if (columnsToAdd.length === 0) {
      console.log('All required columns already exist.');
      return;
    }
    
    console.log(`Found ${columnsToAdd.length} missing columns. Adding them now...`);
    
    // Add missing columns
    for (const column of columnsToAdd) {
      try {
        console.log(`Adding column: ${column.name}`);
        await query(column.definition);
        console.log(`✓ Successfully added column: ${column.name}`);
      } catch (error) {
        console.error(`✗ Error adding column ${column.name}:`, error.message);
      }
    }
    
    // Verify the columns were added
    console.log('\nVerifying columns were added...');
    const updatedColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    console.log('\nUpdated users table schema:');
    updatedColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
    
    console.log('\nDatabase schema update completed successfully!');
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  } finally {
    await gracefulShutdown();
  }
}

// Run the migration
checkAndAddMissingColumns();