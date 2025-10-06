const { connectDB, query, gracefulShutdown } = require('../config/database');

async function testCategoryMapping() {
  try {
    await connectDB();
    
    console.log('=== TESTING CATEGORY MAPPING ===');
    
    // The 9 categories from frontend (checkbox values)
    const frontendCategories = [
      'Construction & Infrastructure',
      'IT & Software Services', 
      'Pharmaceuticals',
      'Transportation & Logistics',
      'Professional Services',
      'Office Supplies & Equipment',
      'Chemicals',
      'Consulting',
      'Other'
    ];
    
    console.log('\nFrontend categories (checkbox values):');
    frontendCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat}`);
    });
    
    // Get database categories
    const dbCategories = await query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name');
    
    console.log('\nDatabase categories:');
    dbCategories.rows.forEach(cat => {
      console.log(`${cat.id}: ${cat.name}`);
    });
    
    // Test mapping for each frontend category
    console.log('\n=== MAPPING TEST ===');
    for (const frontendCat of frontendCategories) {
      // Find exact match first
      let match = dbCategories.rows.find(dbCat => dbCat.name === frontendCat);
      
      if (!match) {
        // Try alternative mappings
        const mappings = {
          'IT & Software Services': ['IT Services', 'IT & Software Services'],
          'Healthcare & Medical': ['Pharmaceuticals'],
          'Supplies & Equipment': ['Office Supplies & Equipment', 'Equipment', 'Supplies'],
          'Energy & Utilities': ['Chemicals'],
          'Education & Training': ['Consulting']
        };
        
        const alternatives = mappings[frontendCat];
        if (alternatives) {
          match = dbCategories.rows.find(dbCat => alternatives.includes(dbCat.name));
        }
      }
      
      if (match) {
        console.log(`✅ "${frontendCat}" -> DB: "${match.name}" (ID: ${match.id})`);
      } else {
        console.log(`❌ "${frontendCat}" -> NO MATCH FOUND`);
      }
    }
    
    console.log('\n=== CURRENT TENDER CATEGORIES ===');
    const tenderCategories = await query(`
      SELECT t.id, t.title, c.name as category_name, COUNT(*) as count
      FROM tenders t 
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.category_id IS NOT NULL
      GROUP BY t.category_id, c.name, t.id, t.title
      ORDER BY c.name, t.id DESC
    `);
    
    const categoryGroups = {};
    tenderCategories.rows.forEach(row => {
      if (!categoryGroups[row.category_name]) {
        categoryGroups[row.category_name] = [];
      }
      categoryGroups[row.category_name].push(`${row.id}: ${row.title}`);
    });
    
    Object.keys(categoryGroups).forEach(categoryName => {
      console.log(`\n${categoryName}:`);
      categoryGroups[categoryName].slice(0, 3).forEach(tender => {
        console.log(`  - ${tender}`);
      });
      if (categoryGroups[categoryName].length > 3) {
        console.log(`  ... and ${categoryGroups[categoryName].length - 3} more`);
      }
    });
    
  } catch (error) {
    console.error('Error testing category mapping:', error);
  } finally {
    await gracefulShutdown();
  }
}

testCategoryMapping();