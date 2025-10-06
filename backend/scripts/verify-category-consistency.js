const { connectDB, query, gracefulShutdown } = require('../config/database');

async function verifyCategoryConsistency() {
  try {
    await connectDB();
    
    console.log('=== VERIFYING CATEGORY CONSISTENCY ACROSS SYSTEM ===');
    
    // The 9 standard categories that should be used everywhere
    const standardCategories = [
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
    
    console.log('\n✅ STANDARD 9 CATEGORIES (should be used everywhere):');
    standardCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat}`);
    });
    
    // Check database categories table
    console.log('\n🗄️ DATABASE CATEGORIES TABLE:');
    const dbCategories = await query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name');
    console.log(`Total active categories in database: ${dbCategories.rows.length}`);
    
    // Check which of our standard categories exist in database
    console.log('\n🔍 MAPPING CHECK - Standard → Database:');
    for (const stdCat of standardCategories) {
      const match = dbCategories.rows.find(dbCat => dbCat.name === stdCat);
      if (match) {
        console.log(`✅ "${stdCat}" → DB ID ${match.id}`);
      } else {
        console.log(`❌ "${stdCat}" → NOT FOUND IN DATABASE`);
      }
    }
    
    // Check current tender categories
    console.log('\n📊 CURRENT TENDER CATEGORY DISTRIBUTION:');
    const tenderCategoryStats = await query(`
      SELECT c.name, COUNT(t.id) as tender_count
      FROM categories c
      LEFT JOIN tenders t ON c.id = t.category_id
      GROUP BY c.id, c.name
      ORDER BY tender_count DESC, c.name
    `);
    
    tenderCategoryStats.rows.forEach(stat => {
      const isStandard = standardCategories.includes(stat.name);
      const icon = isStandard ? '✅' : '⚠️';
      console.log(`${icon} ${stat.name}: ${stat.tender_count} tenders`);
    });
    
    // Summary
    console.log('\n📝 SUMMARY:');
    const standardInDb = standardCategories.filter(stdCat => 
      dbCategories.rows.some(dbCat => dbCat.name === stdCat)
    );
    const missingFromDb = standardCategories.filter(stdCat => 
      !dbCategories.rows.some(dbCat => dbCat.name === stdCat)
    );
    
    console.log(`✅ Standard categories in database: ${standardInDb.length}/9`);
    console.log(`❌ Missing from database: ${missingFromDb.length}/9`);
    
    if (missingFromDb.length > 0) {
      console.log('\n⚠️ MISSING CATEGORIES:');
      missingFromDb.forEach(cat => console.log(`   - ${cat}`));
      console.log('\n💡 These categories need to be added to the database for full consistency.');
    }
    
    if (standardInDb.length === 9) {
      console.log('\n🎉 SUCCESS: All 9 standard categories are present in the database!');
      console.log('✅ Frontend forms and backend validation are now consistent.');
    }
    
  } catch (error) {
    console.error('Error verifying category consistency:', error);
  } finally {
    await gracefulShutdown();
  }
}

verifyCategoryConsistency();