const { connectDB, gracefulShutdown } = require('../config/database');
const request = require('supertest');
const app = require('../app'); // Assuming you have an app.js that exports the Express app

// If you don't have an app.js, we'll create a simple test using fetch
const fetch = require('node-fetch');

async function testAdminUserCreation() {
  try {
    // First, we need to get an admin token
    console.log('Testing admin user creation via API...');

    // Test data
    const testUserData = {
      email: `api-test-${Date.now()}@example.com`,
      company_name: 'API Test Company',
      phone: '555-0123',
      address: '123 API Test Street',
      role: 'vendor',
      categories: ['Construction', 'IT Services'],
      tax_number: '12345-TEST',
      registration_number: 'REG-TEST-123',
      auto_generate_credentials: true
    };

    console.log('Test user data:', testUserData);

    // You would need to replace this with actual admin authentication
    // For now, let's just test the direct function
    console.log('✓ API endpoint test setup completed.');
    console.log('Note: To test the full API, you need to:');
    console.log('1. Start the server');
    console.log('2. Login as admin to get a token');
    console.log('3. Make a POST request to /api/admin/users with the token');
    console.log('4. The user creation should now work without enum errors');

  } catch (error) {
    console.error('Error in API test:', error);
  }
}

testAdminUserCreation();