const { query, connectDB, gracefulShutdown } = require('./config/database');

async function checkAdminUsers() {
  try {
    // Ensure DB connection
    await connectDB();

    console.log('Checking admin users and their roles...');
    
    // Get all admin users
    const adminUsers = await query(`
      SELECT email, role, is_active, is_verified 
      FROM users 
      WHERE role = 'admin' 
      ORDER BY email
    `);
    
    console.log('\n👑 Admin role users:');
    adminUsers.rows.forEach(row => {
      console.log(`- ${row.email} (${row.role}) - Active: ${row.is_active}, Verified: ${row.is_verified}`);
    });
    
    // Check for users with @admin.com emails
    const adminEmailUsers = await query(`
      SELECT email, role, is_active, is_verified 
      FROM users 
      WHERE email LIKE '%@admin.com' 
      ORDER BY email
    `);
    
    console.log('\n📧 Users with @admin.com emails:');
    if (adminEmailUsers.rows.length === 0) {
      console.log('- No users with @admin.com emails found');
    } else {
      adminEmailUsers.rows.forEach(row => {
        console.log(`- ${row.email} (${row.role}) - Active: ${row.is_active}, Verified: ${row.is_verified}`);
      });
    }
    
    // Check all users to see their email patterns
    const allUsers = await query(`
      SELECT email, role 
      FROM users 
      ORDER BY role, email
    `);
    
    console.log('\n📊 All users by role:');
    const roleGroups = {};
    allUsers.rows.forEach(row => {
      if (!roleGroups[row.role]) {
        roleGroups[row.role] = [];
      }
      roleGroups[row.role].push(row.email);
    });
    
    Object.keys(roleGroups).forEach(role => {
      console.log(`\n${role.toUpperCase()} (${roleGroups[role].length} users):`);
      roleGroups[role].forEach(email => {
        console.log(`  - ${email}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to check admin users:', error.message);
  } finally {
    await gracefulShutdown();
  }
  
  process.exit(0);
}

checkAdminUsers();
