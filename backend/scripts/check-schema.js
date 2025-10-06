const { connectDB, query, gracefulShutdown } = require('../config/database');

async function checkSchema() {
  try {
    await connectDB();
    
    // Check category column info
    console.log('Checking category column information...');
    const columnInfo = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'category'
    `);
    console.log('Category column info:', columnInfo.rows);
    
    // Check if there's an enum type for categories
    console.log('\nChecking for enum types...');
    const enumInfo = await query(`
      SELECT t.typname, e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname LIKE '%category%'
      ORDER BY t.typname, e.enumsortorder
    `);
    console.log('Enum types:', enumInfo.rows);
    
    // Check sample users with categories
    console.log('\nChecking sample user categories...');
    const userCategories = await query(`
      SELECT category, COUNT(*) as count 
      FROM users 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `);
    console.log('User categories:', userCategories.rows);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await gracefulShutdown();
  }
}

checkSchema();