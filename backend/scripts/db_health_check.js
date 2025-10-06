const { query } = require('../config/database');

async function checkDatabaseHealth() {
  try {
    console.log('🔍 Checking database health...');
    
    // Check if main tables exist
    const tables = ['users', 'categories', 'tenders', 'bids'];
    
    for (const table of tables) {
      try {
        const result = await query(`
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [table]);
        
        if (result.rows.length === 0) {
          console.log(`❌ Table "${table}" does not exist`);
        } else {
          console.log(`✅ Table "${table}" exists with columns:`);
          result.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error checking table "${table}":`, error.message);
      }
      console.log('');
    }
    
    // Check for data in main tables
    console.log('📊 Checking data counts...');
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${table}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🧪 Testing sample queries...');
    
    // Test basic tender query
    try {
      const result = await query(`
        SELECT t.*, c.name as category_name, u.first_name || ' ' || u.last_name as created_by_name
        FROM tenders t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN users u ON t.created_by = u.id
        LIMIT 5
      `);
      console.log(`✅ Tender query successful: ${result.rows.length} records`);
      if (result.rows.length > 0) {
        console.log('   Sample tender:', {
          id: result.rows[0].id,
          title: result.rows[0].title,
          status: result.rows[0].status,
          category_name: result.rows[0].category_name
        });
      }
    } catch (error) {
      console.log(`❌ Tender query failed:`, error.message);
    }
    
    console.log('\n🎉 Database health check completed!');
    
  } catch (error) {
    console.error('💥 Database health check failed:', error);
  }
}

if (require.main === module) {
  checkDatabaseHealth()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { checkDatabaseHealth };
