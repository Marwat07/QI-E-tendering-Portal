const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3001}/api`;

// Test user creation with auto-generated credentials
async function testUserCreation() {
  try {
    console.log('🧪 Testing user creation with auto-generated credentials...\n');

    // First, login as admin to get auth token (you need an admin user)
    const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com', // Replace with your admin email
      password: 'admin123' // Replace with your admin password
    });

    const adminToken = adminLoginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Create test user with auto-generated credentials
    const userData = {
      email: 'testuser@example.com',
      company_name: 'Test Company Ltd',
      phone: '+1234567890',
      role: 'vendor',
      auto_generate_credentials: true
    };

    const createUserResponse = await axios.post(
      `${API_BASE_URL}/admin/users`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ User created successfully!');
    console.log('📧 Response:', JSON.stringify(createUserResponse.data, null, 2));

    // Test login with generated credentials (if in development mode)
    if (createUserResponse.data.debug_credentials) {
      const { username, password } = createUserResponse.data.debug_credentials;
      
      console.log('\n🔑 Testing login with generated credentials...');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);

      // Test login with username
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: username, // Using username
          password: password
        });
        console.log('✅ Login with username successful!');
      } catch (loginError) {
        console.log('❌ Login with username failed:', loginError.response?.data?.message);
      }

      // Test login with email
      try {
        const emailLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: userData.email,
          password: password
        });
        console.log('✅ Login with email successful!');
      } catch (emailLoginError) {
        console.log('❌ Login with email failed:', emailLoginError.response?.data?.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting E-Tendering Portal User Creation Test\n');
  console.log('⚠️  Make sure the backend server is running and you have admin credentials configured.\n');
  
  testUserCreation()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = testUserCreation;
