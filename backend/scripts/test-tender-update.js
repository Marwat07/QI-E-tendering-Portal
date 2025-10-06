const { connectDB, query, gracefulShutdown } = require('../config/database');
const Tender = require('../models/Tender');

async function testTenderUpdate() {
  try {
    await connectDB();
    
    console.log('=== TESTING TENDER UPDATE FUNCTIONALITY ===');
    
    // Get a sample tender to test with
    const sampleResult = await query(`
      SELECT t.id, t.title, t.category_id, c.name as category_name
      FROM tenders t 
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.id DESC 
      LIMIT 1
    `);
    
    if (sampleResult.rows.length === 0) {
      console.log('No tenders found to test with');
      return;
    }
    
    const sampleTender = sampleResult.rows[0];
    console.log(`\nTesting with tender: ${sampleTender.id} - "${sampleTender.title}"`);
    console.log(`Current category: ${sampleTender.category_name || 'NULL'} (ID: ${sampleTender.category_id || 'NULL'})`);
    
    // Test 1: Load the tender using Tender model
    console.log('\n--- Test 1: Loading tender with model ---');
    const tender = await Tender.findById(sampleTender.id);
    if (tender) {
      console.log(`✓ Tender loaded: ${tender.title}`);
      console.log(`✓ Category ID: ${tender.category_id}`);
    } else {
      console.log('✗ Failed to load tender');
      return;
    }
    
    // Test 2: Test category name resolution
    console.log('\n--- Test 2: Testing category update ---');
    const testCategory = 'Professional Services';
    console.log(`Attempting to update category to: ${testCategory}`);
    
    const updateData = {
      category: testCategory,
      title: tender.title + ' (Updated)'
    };
    
    try {
      const updatedTender = await tender.update(updateData);
      console.log(`✓ Update successful`);
      console.log(`✓ New title: ${updatedTender.title}`);
      console.log(`✓ New category ID: ${updatedTender.category_id}`);
      
      // Verify in database
      const verifyResult = await query(`
        SELECT t.*, c.name as category_name
        FROM tenders t 
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = $1
      `, [sampleTender.id]);
      
      if (verifyResult.rows.length > 0) {
        const verified = verifyResult.rows[0];
        console.log(`✓ Database verification:`);
        console.log(`  - Title: ${verified.title}`);
        console.log(`  - Category: ${verified.category_name || 'NULL'} (ID: ${verified.category_id || 'NULL'})`);
      }
      
    } catch (updateError) {
      console.log(`✗ Update failed: ${updateError.message}`);
    }
    
    // Test 3: Test with invalid category
    console.log('\n--- Test 3: Testing with non-existent category ---');
    try {
      const invalidUpdateData = {
        category: 'Non-existent Category'
      };
      
      await tender.update(invalidUpdateData);
      console.log('✓ Update with invalid category handled gracefully');
    } catch (invalidError) {
      console.log(`✗ Update with invalid category failed: ${invalidError.message}`);
    }
    
    // Test 4: Check available categories
    console.log('\n--- Test 4: Available categories in database ---');
    const categoriesResult = await query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name');
    console.log('Available categories:');
    categoriesResult.rows.forEach(cat => {
      console.log(`  ${cat.id}: ${cat.name}`);
    });
    
  } catch (error) {
    console.error('Error testing tender update:', error);
  } finally {
    await gracefulShutdown();
  }
}

testTenderUpdate();