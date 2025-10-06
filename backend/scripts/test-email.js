#!/usr/bin/env node

require('dotenv').config();
const EmailService = require('../services/emailService');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function testEmail() {
  console.log(`
📧 Email Configuration Test
===========================

This script will test your Gmail SMTP configuration.

Current Configuration:
- SMTP Host: ${process.env.SMTP_HOST || 'Not set'}
- SMTP Port: ${process.env.SMTP_PORT || 'Not set'}
- SMTP User: ${process.env.SMTP_USER || 'Not set'}
- SMTP Pass: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Not set'}
- From Email: ${process.env.FROM_EMAIL || 'Not set'}

`);

  try {
    // Get test email address
    const testEmail = await askQuestion('Enter email address to send test email to: ');
    
    if (!testEmail.includes('@')) {
      console.log('❌ Please enter a valid email address.');
      rl.close();
      return;
    }

    console.log('\n🔧 Initializing email service...');

    // Initialize email service
    const emailService = new (require('../services/emailService').constructor)();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for initialization

    console.log('📨 Sending test email...\n');

    // Send test email
    const result = await emailService.sendPasswordResetEmail(
      testEmail, 
      'test-token-123',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );

    if (result.success) {
      console.log(`✅ Test email sent successfully!
      
📧 Email Details:
- To: ${testEmail}
- Message ID: ${result.messageId}
- Subject: Password Reset Request - E-Tendering Portal

${result.previewUrl ? `🔗 Preview URL (Development): ${result.previewUrl}` : ''}

✅ Gmail SMTP is working correctly!
`);
    } else {
      console.log('❌ Failed to send test email.');
    }

  } catch (error) {
    console.log('\n❌ Email test failed!\n');
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log(`🔐 Gmail Authentication Error:

Common solutions:
1. Make sure you're using a Gmail App Password (not your regular password)
2. Ensure 2-Factor Authentication is enabled on your Gmail account
3. Verify your App Password is exactly 16 characters
4. Check that your Gmail account allows "Less secure app access" (if using regular password)

📋 To fix this:
   Run: node scripts/setup-gmail.js

`);
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log(`🌐 Connection Error:

This could be due to:
1. Firewall blocking SMTP connections
2. Network connectivity issues
3. Wrong SMTP server settings

Current settings:
- Host: ${process.env.SMTP_HOST}
- Port: ${process.env.SMTP_PORT}

`);
    } else {
      console.log(`Error details:
- Code: ${error.code}
- Message: ${error.message}

`);
    }

    console.log('📋 Need help? Run: node scripts/setup-gmail.js');
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\n👋 Test cancelled.');
  rl.close();
});

testEmail();
