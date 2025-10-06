#!/usr/bin/env node

require('dotenv').config();

async function quickEmailTest() {
  console.log(`
📧 Quick Email Configuration Test
================================

Testing current configuration:
- SMTP Host: ${process.env.SMTP_HOST || 'Not set'}
- SMTP User: ${process.env.SMTP_USER || 'Not set'}  
- SMTP Pass: ${process.env.SMTP_PASS ? '✅ Set (16 chars)' : '❌ Not set'}
- FORCE_SMTP: ${process.env.FORCE_SMTP || 'false'}
- NODE_ENV: ${process.env.NODE_ENV || 'development'}

`);

  try {
    // Import EmailService
    console.log('🔧 Initializing email service...');
    
    // Since EmailService is a singleton, we need to create a new instance for testing
    const EmailService = require('../services/emailService');
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📨 Sending test email to your configured email...\n');
    
    // Send test email to the configured FROM_EMAIL
    const testEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    
    if (!testEmail) {
      console.log('❌ No email configured to send test to');
      return;
    }

    const result = await EmailService.sendPasswordResetEmail(
      testEmail, 
      'test-token-' + Date.now(),
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );

    if (result.success) {
      console.log(`✅ Test email sent successfully!
      
📧 Email Details:
- To: ${testEmail}
- Message ID: ${result.messageId}
- Subject: Password Reset Request - E-Tendering Portal

${result.previewUrl ? `🔗 Preview URL (Development): ${result.previewUrl}` : ''}

✅ Your email configuration is working correctly!

🎉 Recipients should now receive real emails!
`);
    } else {
      console.log('❌ Failed to send test email.');
    }

  } catch (error) {
    console.log('\n❌ Email test failed!\n');
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log(`🔐 Gmail Authentication Error:

The App Password might be incorrect or expired.
Current password starts with: ${process.env.SMTP_PASS ? process.env.SMTP_PASS.substring(0, 4) + '************' : 'Not set'}

Solutions:
1. Verify your Gmail App Password is correct
2. Make sure 2-Factor Authentication is enabled on Gmail
3. Try regenerating a new App Password

`);
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log(`🌐 Connection Error:

Could be network/firewall issues.
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
  }
}

quickEmailTest();
