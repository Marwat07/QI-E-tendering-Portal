const { query } = require('../config/database');
const User = require('../models/User');
const Tender = require('../models/Tender');

async function debugTenderEndpoint() {
  try {
    console.log('🔍 Debugging tender endpoint issue...');
    
    // Test 1: Check if we can create a basic user and verify JWT
    console.log('\n1️⃣ Testing JWT configuration...');
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET environment variable is not set!');
      process.env.JWT_SECRET = 'test-secret-key-for-debugging';
      console.log('✅ Set temporary JWT_SECRET for testing');
    } else {
      console.log('✅ JWT_SECRET is configured');
    }
    
    // Test 2: Try to get the first user and generate a token
    console.log('\n2️⃣ Testing user retrieval...');
    try {
      const result = await query('SELECT * FROM users LIMIT 1');
      if (result.rows.length > 0) {
        console.log('✅ Users table accessible');
        const user = new User(result.rows[0]);
        console.log(`   Sample user: ${user.email} (${user.role})`);
        
        // Test token generation
        try {
          const token = user.generateToken();
          console.log('✅ Token generation works');
          console.log(`   Token: ${token.substring(0, 20)}...`);
        } catch (tokenError) {
          console.log('❌ Token generation failed:', tokenError.message);
        }
      } else {
        console.log('❌ No users found in database');
      }
    } catch (userError) {
      console.log('❌ User retrieval failed:', userError.message);
    }
    
    // Test 3: Test tender retrieval directly
    console.log('\n3️⃣ Testing tender retrieval...');
    try {
      const tenders = await Tender.findAll({ limit: 5 });
      console.log(`✅ Tender.findAll() works: ${tenders.length} tenders found`);
      if (tenders.length > 0) {
        console.log(`   Sample tender: ${tenders[0].title} (${tenders[0].status})`);
      }
    } catch (tenderError) {
      console.log('❌ Tender retrieval failed:', tenderError.message);
      console.log('   Stack:', tenderError.stack);
    }
    
    // Test 4: Test the specific query that might be failing
    console.log('\n4️⃣ Testing specific tender query with user join...');
    try {
      const result = await query(`
        SELECT t.*, c.name as category_name, u.first_name || ' ' || u.last_name as created_by_name
        FROM tenders t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.status = $1
        LIMIT 3
      `, ['open']);
      
      console.log(`✅ Complex tender query works: ${result.rows.length} results`);
      if (result.rows.length > 0) {
        console.log('   Sample result:', {
          id: result.rows[0].id,
          title: result.rows[0].title,
          category_name: result.rows[0].category_name,
          created_by_name: result.rows[0].created_by_name
        });
      }
    } catch (queryError) {
      console.log('❌ Complex tender query failed:', queryError.message);
    }
    
    console.log('\n🎉 Debug completed!');
    
  } catch (error) {
    console.error('💥 Debug script failed:', error);
  }
}

if (require.main === module) {
  debugTenderEndpoint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { debugTenderEndpoint };
