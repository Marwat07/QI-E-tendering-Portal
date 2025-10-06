const { connectDB, gracefulShutdown } = require('../config/database');
const User = require('../models/User');
const emailService = require('../services/emailService');

async function testUserCreation() {
  try {
    await connectDB();
    console.log('Connected to database. Testing user creation...');

    const testEmail = `test-${Date.now()}@example.com`;
    const testCategories = ['Construction', 'Engineering'];

    console.log('Test email:', testEmail);
    console.log('Test categories:', testCategories);

    // Generate credentials
    const credentials = emailService.generateCredentials(testEmail);
    console.log('Generated credentials:', { username: credentials.username, password: credentials.password });

    // Test user creation with categories
    console.log('Creating user...');
    const user = await User.createWithCategories({
      email: testEmail,
      username: credentials.username,
      password: credentials.password,
      company_name: 'Test Company',
      phone: '123-456-7890',
      address: '123 Test St',
      role: 'vendor',
      category: testCategories[0], // First category for backward compatibility
      tax_number: '12345',
      registration_number: '67890'
    }, testCategories);

    console.log('User created successfully with ID:', user.id);

    // Verify categories were set
    const userCategories = await user.getCategories();
    console.log('User categories after creation:', userCategories);

    // Test toJSON method
    const userJSON = await user.toJSON();
    console.log('User JSON (without password):', {
      id: userJSON.id,
      email: userJSON.email,
      username: userJSON.username,
      company_name: userJSON.company_name,
      role: userJSON.role,
      categories: userJSON.categories
    });

    console.log('✓ User creation test completed successfully!');

  } catch (error) {
    console.error('✗ Error in user creation test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await gracefulShutdown();
  }
}

testUserCreation();