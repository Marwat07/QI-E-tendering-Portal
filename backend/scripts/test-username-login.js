#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios').default;

async function testUsernameLogin() {
  const baseURL = 'http://localhost:3001';
  
  console.log(`
🔐 Testing Username Login Validation
====================================

Testing login with usernames from recent logs...
`);

  // Test usernames from recent logs
  const testCases = [
    { username: 'ETUGJ988070', email: 'alibhai804139@gmail.com', description: 'Recent username from logs' },
    { username: 'ETUSN089923', email: 'talalk948@gmail.com', description: 'Recent username from logs' },
    { username: 'ETU7H170628', email: 'talalk948@gmail.com', description: 'Most recent username from logs' },
    { email: 'talalk948@gmail.com', description: 'Valid email format' },
    { username: 'invalid@email', description: 'Invalid format (should fail validation)' },
    { username: 'abc', description: 'Too short username (should fail validation)' }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📧 Testing: ${testCase.username || testCase.email} - ${testCase.description}`);
      
      const loginData = {
        email: testCase.username || testCase.email,
        password: 'dummy-password' // We expect this to fail at password level, not validation level
      };

      const response = await axios.post(`${baseURL}/api/auth/login`, loginData);
      console.log(`  ✅ Validation passed - Response: ${response.status}`);
      
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 400 && data.message === 'Validation failed') {
          console.log(`  ❌ Validation failed: ${JSON.stringify(data.errors)}`);
        } else if (status === 401 && data.message === 'Invalid credentials') {
          console.log(`  ✅ Validation passed - Authentication failed (expected with dummy password)`);
        } else {
          console.log(`  🔍 Unexpected response: ${status} - ${data.message}`);
        }
      } else {
        console.log(`  ❌ Request failed: ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`
🎯 Summary:
- Usernames like ETU7H170628 should pass validation and fail at authentication
- Invalid formats should fail at validation level
- Valid emails should pass validation and fail at authentication

If usernames are passing validation but failing at authentication with dummy password,
the validation fix is working correctly!
`);
}

testUsernameLogin();
