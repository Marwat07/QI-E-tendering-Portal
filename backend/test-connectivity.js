const { query } = require('./config/database');

async function testConnectivity() {
  try {
    console.log('Testing database connectivity...');
    
    // Test basic connection
    const result1 = await query('SELECT NOW() as current_time');
    console.log('✅ Basic connection test passed:', result1.rows[0]);
    
    // Test tenders table access
    const result2 = await query('SELECT COUNT(*) FROM tenders');
    console.log('✅ Tenders table access:', result2.rows[0]);
    
    // Test bids table access
    const result3 = await query('SELECT COUNT(*) FROM bids');
    console.log('✅ Bids table access:', result3.rows[0]);
    
    // Test users table access
    const result4 = await query('SELECT COUNT(*) FROM users');
    console.log('✅ Users table access:', result4.rows[0]);
    
    // Test categories table access
    const result5 = await query('SELECT COUNT(*) FROM categories');
    console.log('✅ Categories table access:', result5.rows[0]);
    
    console.log('🎉 All database connectivity tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connectivity test failed:', error);
    process.exit(1);
  }
}

testConnectivity();
