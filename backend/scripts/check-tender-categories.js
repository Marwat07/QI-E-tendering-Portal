const { connectDB, query, gracefulShutdown } = require('../config/database');

async function checkTenderCategories() {
  try {
    await connectDB();
    
    // Check tenders table structure
    console.log('=== CHECKING TENDERS TABLE STRUCTURE ===');
    const tendersColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'tenders' 
      ORDER BY ordinal_position
    `);
    console.log('Tenders table columns:', tendersColumns.rows);
    
    // Check categories table structure  
    console.log('\n=== CHECKING CATEGORIES TABLE STRUCTURE ===');
    const categoriesColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      ORDER BY ordinal_position
    `);
    console.log('Categories table columns:', categoriesColumns.rows);
    
    // Check categories table data
    console.log('\n=== CHECKING CATEGORIES TABLE DATA ===');
    const categoriesData = await query(`
      SELECT id, name, is_active 
      FROM categories 
      ORDER BY name
    `);
    console.log('Categories data:', categoriesData.rows);
    
    // Check sample tenders with category information
    console.log('\n=== CHECKING SAMPLE TENDERS WITH CATEGORY INFO ===');
    const sampleTenders = await query(`
      SELECT t.id, t.title, t.category_id, c.name as category_name,
             c.name as display_category
      FROM tenders t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    console.log('Sample tenders with categories:', sampleTenders.rows);
    
    // Check tenders without category_id
    console.log('\n=== CHECKING TENDERS WITHOUT CATEGORY_ID ===');
    const tendersWithoutCategory = await query(`
      SELECT COUNT(*) as count
      FROM tenders
      WHERE category_id IS NULL
    `);
    console.log('Tenders without category_id:', tendersWithoutCategory.rows[0]);
    
    // Check if there are any other category-related columns
    console.log('\n=== CHECKING FOR OTHER CATEGORY COLUMNS ===');
    const categoryColumns = await query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE column_name ILIKE '%categor%'
      ORDER BY table_name, column_name
    `);
    console.log('All category-related columns:', categoryColumns.rows);
    
  } catch (error) {
    console.error('Error checking tender categories:', error);
  } finally {
    await gracefulShutdown();
  }
}

checkTenderCategories();