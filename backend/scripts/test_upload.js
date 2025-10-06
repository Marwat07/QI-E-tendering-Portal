const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUploadEndpoint() {
  try {
    // Create a simple test file
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, 'This is a test document for upload testing.');
    
    console.log('🧪 Testing upload endpoint...');
    
    // Create form data
    const form = new FormData();
    form.append('files', fs.createReadStream(testFilePath));
    
    // Test the upload endpoint
    const response = await fetch('http://localhost:5000/api/upload/multiple', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer test-token', // You may need a real token
        ...form.getHeaders()
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    if (response.ok && data.success) {
      console.log('✅ Upload endpoint is working correctly!');
      return true;
    } else {
      console.log('❌ Upload endpoint failed:', data.message || 'Unknown error');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  testUploadEndpoint();
}

module.exports = { testUploadEndpoint };
