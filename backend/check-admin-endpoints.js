const { query, connectDB } = require('./config/database');

async function checkAdminEndpoints() {
  console.log('🔍 Checking Admin Dashboard Backend Health...\n');

  // Connect to database first
  await connectDB();

  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    const dbTest = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');
    console.log(`   Current time: ${dbTest.rows[0].current_time}\n`);

    // Test 2: Check users table
    console.log('2. Testing users table...');
    const usersCount = await query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table accessible: ${usersCount.rows[0].count} users found\n`);

    // Test 3: Check tenders table
    console.log('3. Testing tenders table...');
    const tendersCount = await query('SELECT COUNT(*) as count FROM tenders');
    console.log(`✅ Tenders table accessible: ${tendersCount.rows[0].count} tenders found\n`);

    // Test 4: Check bids table
    console.log('4. Testing bids table...');
    const bidsCount = await query('SELECT COUNT(*) as count FROM bids');
    console.log(`✅ Bids table accessible: ${bidsCount.rows[0].count} bids found\n`);

    // Test 5: Check categories table
    console.log('5. Testing categories table...');
    const categoriesCount = await query('SELECT COUNT(*) as count FROM categories WHERE is_active = true');
    console.log(`✅ Categories table accessible: ${categoriesCount.rows[0].count} active categories found\n`);

    // Test 6: Mock dashboard stats query
    console.log('6. Testing dashboard stats query...');
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM tenders WHERE deadline > CURRENT_TIMESTAMP AND (status = 'open' OR status IS NULL)) as active_tenders,
        (SELECT COUNT(*) FROM bids) as total_bids,
        (SELECT COUNT(*) FROM bids WHERE status = 'pending') as pending_bids
    `;
    const stats = await query(statsQuery);
    const result = stats.rows[0];
    
    console.log('✅ Dashboard stats query successful:');
    console.log(`   Total Users: ${result.total_users}`);
    console.log(`   Active Tenders: ${result.active_tenders}`);
    console.log(`   Total Bids: ${result.total_bids}`);
    console.log(`   Pending Bids: ${result.pending_bids}\n`);

    // Test 7: Check admin users
    console.log('7. Checking admin users...');
    const admins = await query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    console.log(`✅ Admin users found: ${admins.rows[0].count}\n`);

    console.log('🎉 All admin backend checks passed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   ✓ Database connection: Working`);
    console.log(`   ✓ Users table: ${usersCount.rows[0].count} records`);
    console.log(`   ✓ Tenders table: ${tendersCount.rows[0].count} records`);
    console.log(`   ✓ Bids table: ${bidsCount.rows[0].count} records`);
    console.log(`   ✓ Categories table: ${categoriesCount.rows[0].count} active records`);
    console.log(`   ✓ Admin users: ${admins.rows[0].count} found`);
    console.log(`   ✓ Dashboard stats: Ready to serve\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Admin backend check failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    
    console.log('🔧 Troubleshooting tips:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check database connection settings in .env');
    console.log('   3. Verify all required tables exist');
    console.log('   4. Run database migrations if needed\n');
    
    process.exit(1);
  }
}

// Run the check
checkAdminEndpoints();