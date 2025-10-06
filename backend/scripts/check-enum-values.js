const { connectDB, query, gracefulShutdown } = require('../config/database');

async function checkEnumValues() {
  try {
    await connectDB();
    console.log('Connected to database. Checking enum values...');

    // Check all enum types
    const enumsResult = await query(`
      SELECT t.typname, e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      ORDER BY t.typname, e.enumsortorder
    `);

    console.log('Found enum types and values:');
    const enums = {};
    for (const row of enumsResult.rows) {
      if (!enums[row.typname]) {
        enums[row.typname] = [];
      }
      enums[row.typname].push(row.enumlabel);
    }

    for (const [enumName, values] of Object.entries(enums)) {
      console.log(`\n${enumName}:`);
      values.forEach(value => console.log(`  - ${value}`));
    }

    // Check what categories are in the categories table
    const categoriesResult = await query(`
      SELECT id, name, is_active FROM categories ORDER BY name
    `);

    console.log('\nCategories in the categories table:');
    categoriesResult.rows.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat.id}, Active: ${cat.is_active})`);
    });

    // Check the users table structure
    const usersTableResult = await query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);

    console.log('\nUsers table structure:');
    usersTableResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

  } catch (error) {
    console.error('Error checking enum values:', error);
  } finally {
    await gracefulShutdown();
  }
}

checkEnumValues();