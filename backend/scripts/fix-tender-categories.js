const { connectDB, query, gracefulShutdown } = require('../config/database');

async function fixTenderCategories() {
  try {
    await connectDB();
    
    console.log('=== MANUALLY FIXING TENDER CATEGORIES ===');
    
    // Get all tenders without category_id
    const tendersResult = await query(`
      SELECT id, title, description
      FROM tenders 
      WHERE category_id IS NULL
      ORDER BY id
    `);
    
    console.log(`Found ${tendersResult.rows.length} tenders without categories`);
    
    // Get available categories  
    const categoriesResult = await query(`
      SELECT id, name 
      FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);
    
    console.log('\nAvailable categories:');
    categoriesResult.rows.forEach(cat => {
      console.log(`  ${cat.id}: ${cat.name}`);
    });
    
    // Manual assignments based on tender titles/content
    const assignments = [];
    
    for (const tender of tendersResult.rows) {
      let categoryId = null;
      const title = (tender.title || '').toLowerCase();
      const desc = (tender.description || '').toLowerCase();
      const content = `${title} ${desc}`;
      
      // Rule-based category assignment
      if (content.includes('software') || content.includes('portal') || 
          content.includes('system') || content.includes('application') || 
          content.includes('technology') || content.includes('it ')) {
        categoryId = 1; // IT Services
      } else if (content.includes('construction') || content.includes('building') || 
                 content.includes('infrastructure') || content.includes('civil')) {
        categoryId = 2; // Construction  
      } else if (content.includes('office') || content.includes('supply') || 
                 content.includes('equipment') || content.includes('furniture')) {
        categoryId = 9; // Office Supplies & Equipment
      } else if (content.includes('service') || content.includes('consulting') || 
                 content.includes('professional')) {
        categoryId = 10; // Professional Services
      } else if (content.includes('multi') || content.includes('test')) {
        categoryId = 18; // Other - for test tenders
      } else {
        categoryId = 18; // Other - fallback
      }
      
      if (categoryId) {
        assignments.push({ 
          id: tender.id, 
          title: tender.title,
          categoryId: categoryId,
          categoryName: categoriesResult.rows.find(c => c.id === categoryId)?.name 
        });
      }
    }
    
    console.log('\n=== PROPOSED CATEGORY ASSIGNMENTS ===');
    assignments.forEach(a => {
      console.log(`Tender ${a.id}: "${a.title}" -> ${a.categoryName} (${a.categoryId})`);
    });
    
    console.log('\n=== APPLYING UPDATES ===');
    
    for (const assignment of assignments) {
      await query(
        'UPDATE tenders SET category_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [assignment.categoryId, assignment.id]
      );
      console.log(`✓ Updated tender ${assignment.id}`);
    }
    
    console.log(`\n✅ Successfully updated ${assignments.length} tenders with categories`);
    
    // Verify the updates
    const updatedResult = await query(`
      SELECT t.id, t.title, t.category_id, c.name as category_name
      FROM tenders t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id IN (${assignments.map(a => a.id).join(',')})
      ORDER BY t.id
    `);
    
    console.log('\n=== VERIFICATION ===');
    updatedResult.rows.forEach(row => {
      console.log(`Tender ${row.id}: "${row.title}" -> ${row.category_name || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error fixing tender categories:', error);
  } finally {
    await gracefulShutdown();
  }
}

fixTenderCategories();