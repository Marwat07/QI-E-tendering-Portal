const { query } = require('./config/database');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function testAuthentication() {
  try {
    console.log('🔐 Testing authentication for existing users...\n');

    // Test admin users
    console.log('👑 Testing Admin Users:');
    const adminUsers = await query('SELECT email FROM users WHERE role = $1', ['admin']);
    
    for (const user of adminUsers.rows) {
      console.log(`\n📧 Testing: ${user.email}`);
      
      // Get user details
      const foundUser = await User.findByEmail(user.email);
      if (foundUser) {
        console.log(`   ✅ User found in database`);
        console.log(`   📊 Role: ${foundUser.role}`);
        console.log(`   🏢 Company: ${foundUser.company_name || 'N/A'}`);
        console.log(`   ✔️ Active: ${foundUser.is_active}`);
        console.log(`   ✅ Verified: ${foundUser.is_verified}`);
        
        // Test common passwords
        const testPasswords = ['admin', 'password', '123456', '123', 'admin123'];
        let passwordFound = false;
        
        for (const testPassword of testPasswords) {
          try {
            const isMatch = await foundUser.matchPassword(testPassword);
            if (isMatch) {
              console.log(`   🔑 Working password found: "${testPassword}"`);
              passwordFound = true;
              break;
            }
          } catch (error) {
            console.log(`   ❌ Error testing password "${testPassword}": ${error.message}`);
          }
        }
        
        if (!passwordFound) {
          console.log(`   ⚠️  None of the common passwords worked`);
        }
      } else {
        console.log(`   ❌ User not found`);
      }
    }

    // Test vendor users (just a few)
    console.log('\n\n🏪 Testing Sample Vendor Users:');
    const vendorUsers = await query('SELECT email FROM users WHERE role = $1 LIMIT 3', ['vendor']);
    
    for (const user of vendorUsers.rows) {
      console.log(`\n📧 Testing: ${user.email}`);
      
      const foundUser = await User.findByEmail(user.email);
      if (foundUser) {
        console.log(`   ✅ User found in database`);
        
        // Test common passwords
        const testPasswords = ['vendor', 'password', '123456', '123', 'vendor123'];
        let passwordFound = false;
        
        for (const testPassword of testPasswords) {
          try {
            const isMatch = await foundUser.matchPassword(testPassword);
            if (isMatch) {
              console.log(`   🔑 Working password found: "${testPassword}"`);
              passwordFound = true;
              break;
            }
          } catch (error) {
            console.log(`   ❌ Error testing password "${testPassword}": ${error.message}`);
          }
        }
        
        if (!passwordFound) {
          console.log(`   ⚠️  None of the common passwords worked`);
        }
      }
    }

    console.log('\n\n🔧 Password Hash Analysis:');
    // Check if passwords are properly hashed
    const sampleUser = await query('SELECT email, password FROM users LIMIT 1');
    if (sampleUser.rows.length > 0) {
      const user = sampleUser.rows[0];
      console.log(`Sample user: ${user.email}`);
      console.log(`Password hash starts with: ${user.password.substring(0, 10)}...`);
      console.log(`Password hash length: ${user.password.length}`);
      console.log(`Is bcrypt hash: ${user.password.startsWith('$2a$') || user.password.startsWith('$2b$')}`);
    }

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

testAuthentication();
