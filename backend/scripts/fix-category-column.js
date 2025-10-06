const { connectDB, query, gracefulShutdown } = require('../config/database');

async function fixCategoryColumn() {
  try {
    await connectDB();
    console.log('Connected to database. Fixing category column...');

    // First, check current values in users.category
    const currentValues = await query(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM users 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `);

    console.log('\nCurrent category values in users table:');
    currentValues.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count} users`);
    });

    // Alter the column type from enum to varchar
    console.log('\nAltering category column from enum to varchar...');
    await query('ALTER TABLE users ALTER COLUMN category TYPE VARCHAR(255)');
    console.log('✓ Successfully changed category column to VARCHAR(255)');

    // Drop the enum type if it's not used elsewhere
    try {
      console.log('\nTrying to drop the user_category enum type...');
      await query('DROP TYPE user_category');
      console.log('✓ Successfully dropped user_category enum type');
    } catch (error) {
      if (error.code === '2BP01') {
        console.log('⚠ Cannot drop enum type because it\'s still in use elsewhere');
      } else {
        console.log('⚠ Error dropping enum type:', error.message);
      }
    }

    // Verify the column change
    const updatedColumn = await query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'category'
    `);

    console.log('\nUpdated category column info:');
    updatedColumn.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    console.log('\n✅ Category column fix completed successfully!');
    console.log('Now you can use any string value for the category field.');

  } catch (error) {
    console.error('❌ Error fixing category column:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await gracefulShutdown();
  }
}

fixCategoryColumn();