#!/usr/bin/env node

require('dotenv').config();
const User = require('../models/User');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');

async function testLoginCredentials() {
  console.log(`
🔐 Login Credentials Test
========================

This will test the full credential generation and login flow.
`);

  try {
    // Generate test credentials
    console.log('1️⃣ Generating credentials...');
    const testEmail = `test-${Date.now()}@example.com`;
    const credentials = emailService.generateCredentials(testEmail);
    
    console.log(`📧 Test Email: ${testEmail}`);
    console.log(`👤 Generated Username: ${credentials.username}`);
    console.log(`🔑 Generated Password: ${credentials.password}`);
    console.log(`📏 Password Length: ${credentials.password.length}`);
    
    // Create user with generated credentials
    console.log('\n2️⃣ Creating user in database...');
    const user = await User.create({
      email: testEmail,
      username: credentials.username,
      password: credentials.password,
      company_name: 'Test Company',
      role: 'vendor'
    });
    
    console.log(`✅ User created with ID: ${user.id}`);
    console.log(`🔒 Stored password hash: ${user.password.substring(0, 20)}...`);
    
    // Test password hashing manually
    console.log('\n3️⃣ Verifying password hashing...');
    const manualHash = await bcrypt.hash(credentials.password, 10);
    const manualCompare = await bcrypt.compare(credentials.password, user.password);
    
    console.log(`🔍 Manual hash compare: ${manualCompare ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    // Test user.matchPassword method
    console.log('\n4️⃣ Testing User.matchPassword method...');
    const methodMatch = await user.matchPassword(credentials.password);
    console.log(`🔍 User.matchPassword: ${methodMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    // Test finding user by email or username
    console.log('\n5️⃣ Testing user lookup...');
    const foundByEmail = await User.findByEmailOrUsername(testEmail);
    const foundByUsername = await User.findByEmailOrUsername(credentials.username);
    
    console.log(`🔍 Found by email: ${foundByEmail ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`🔍 Found by username: ${foundByUsername ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    if (foundByUsername) {
      console.log(`👤 Found username: ${foundByUsername.username}`);
      console.log(`📧 Found email: ${foundByUsername.email}`);
    }
    
    // Test login simulation
    console.log('\n6️⃣ Simulating login process...');
    
    // Test with email
    console.log('\n📧 Testing login with EMAIL:');
    const userByEmail = await User.findByEmailOrUsername(testEmail);
    if (userByEmail) {
      const emailPasswordMatch = await userByEmail.matchPassword(credentials.password);
      console.log(`  Email login: ${emailPasswordMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    } else {
      console.log(`  ❌ User not found by email`);
    }
    
    // Test with username
    console.log('\n👤 Testing login with USERNAME:');
    const userByUsername = await User.findByEmailOrUsername(credentials.username);
    if (userByUsername) {
      const usernamePasswordMatch = await userByUsername.matchPassword(credentials.password);
      console.log(`  Username login: ${usernamePasswordMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    } else {
      console.log(`  ❌ User not found by username`);
    }
    
    // Test with wrong password
    console.log('\n🚫 Testing with WRONG password:');
    const wrongPasswordMatch = await user.matchPassword('wrongpassword123');
    console.log(`  Wrong password: ${wrongPasswordMatch ? '❌ WRONGLY MATCHED' : '✅ CORRECTLY REJECTED'}`);
    
    // Clean up - delete test user
    console.log('\n🧹 Cleaning up...');
    await user.delete();
    console.log('✅ Test user deleted');
    
    console.log(`\n🎉 Test completed successfully!
    
💡 Key findings:
- Password generation: ✅
- Password hashing: ${manualCompare ? '✅' : '❌'}
- User lookup: ${foundByEmail && foundByUsername ? '✅' : '❌'}
- Login simulation: ${methodMatch ? '✅' : '❌'}

If all tests pass, the credential system is working correctly!
`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

testLoginCredentials();
