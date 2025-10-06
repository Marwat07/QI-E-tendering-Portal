#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🚀 Gmail SMTP Configuration Setup for E-Tendering Portal
========================================================

This script will help you configure Gmail SMTP for sending emails.

⚠️  IMPORTANT: You cannot use your regular Gmail password for SMTP!
   You MUST create a Gmail App Password.

📝 Steps to create Gmail App Password:
   1. Go to your Google Account (myaccount.google.com)
   2. Click "Security" on the left sidebar
   3. Enable "2-Step Verification" if not already enabled
   4. Once 2-Step Verification is enabled, you'll see "App passwords"
   5. Click "App passwords"
   6. Select "Mail" as the app type
   7. Copy the 16-character password generated
   8. Use that password in this setup

🌐 Direct link: https://myaccount.google.com/apppasswords

`);

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupGmail() {
  try {
    // Check if 2FA is enabled
    console.log('🔐 First, let\'s verify your Gmail account setup...\n');
    
    const has2FA = await askQuestion('Do you have 2-Factor Authentication enabled on your Gmail account? (y/n): ');
    
    if (has2FA.toLowerCase() !== 'y') {
      console.log(`
❌ 2-Factor Authentication is required for Gmail App Passwords!

📱 Please enable 2FA first:
   1. Go to https://myaccount.google.com/security
   2. Click "2-Step Verification"
   3. Follow the setup process
   4. Then run this script again

`);
      rl.close();
      return;
    }

    console.log('\n✅ Great! 2FA is enabled.\n');

    // Get Gmail credentials
    const gmailEmail = await askQuestion('Enter your Gmail address (e.g., scm@qaswaindustries.com): ');
    
    if (!gmailEmail.includes('@gmail.com') && !gmailEmail.includes('@')) {
      console.log('❌ Please enter a valid email address.');
      rl.close();
      return;
    }

    console.log(`
📋 Now create an App Password:
   1. Go to: https://myaccount.google.com/apppasswords
   2. Select "Mail" as the app
   3. Copy the 16-character password
   4. Enter it below

`);

    const appPassword = await askQuestion('Enter your Gmail App Password (16 characters): ');
    
    if (appPassword.length !== 16) {
      console.log('❌ Gmail App Password should be exactly 16 characters long.');
      console.log('   Make sure you copied the entire password without spaces.');
      rl.close();
      return;
    }

    // Update .env file
    const envPath = path.join(__dirname, '..', '.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env file not found. Make sure you\'re running this from the backend directory.');
      rl.close();
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Update SMTP credentials
    envContent = envContent.replace(
      /SMTP_USER=.*/,
      `SMTP_USER=${gmailEmail}`
    );
    
    envContent = envContent.replace(
      /SMTP_PASS=.*/,
      `SMTP_PASS=${appPassword}`
    );
    
    envContent = envContent.replace(
      /FROM_EMAIL=.*/,
      `FROM_EMAIL=${gmailEmail}`
    );

    // Write updated .env file
    fs.writeFileSync(envPath, envContent);

    console.log(`
✅ Gmail SMTP Configuration Updated Successfully!

📧 Email Settings:
   - SMTP Host: smtp.gmail.com
   - SMTP Port: 587
   - Email: ${gmailEmail}
   - App Password: ${appPassword.substring(0, 4)}************

🔄 Please restart your server for changes to take effect.

🧪 To test the email configuration, run:
   npm run test:email

`);

  } catch (error) {
    console.error('❌ Error setting up Gmail:', error.message);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled. Run the script again when ready.');
  rl.close();
});

setupGmail();
