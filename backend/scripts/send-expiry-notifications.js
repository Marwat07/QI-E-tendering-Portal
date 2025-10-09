const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
require('dotenv').config();

async function sendCredentialExpiryNotifications() {
  try {
    console.log('🔍 Checking for users with expiring credentials...');
    
    // Get users with credentials expiring in the next 30 days
    const expiringUsers = await User.findUsersWithExpiringCredentials(30);
    
    if (expiringUsers.length === 0) {
      console.log('✅ No users with expiring credentials found.');
      return;
    }
    
    console.log(`📧 Found ${expiringUsers.length} users with expiring credentials`);
    
    // Group users by urgency level
    const usersByUrgency = {
      critical: [],  // <= 3 days
      urgent: [],    // <= 7 days
      warning: [],   // <= 30 days
      expired: []    // Already expired (shouldn't happen but just in case)
    };
    
    const now = new Date();
    
    expiringUsers.forEach(user => {
      const daysUntilExpiry = Math.ceil((new Date(user.credential_expires_at) - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        usersByUrgency.expired.push(user);
      } else if (daysUntilExpiry <= 3) {
        usersByUrgency.critical.push(user);
      } else if (daysUntilExpiry <= 7) {
        usersByUrgency.urgent.push(user);
      } else if (daysUntilExpiry <= 30) {
        usersByUrgency.warning.push(user);
      }
    });
    
    console.log('📊 Users by urgency level:');
    console.log(`  🔴 Critical (≤3 days): ${usersByUrgency.critical.length}`);
    console.log(`  🟠 Urgent (≤7 days): ${usersByUrgency.urgent.length}`);
    console.log(`  🟡 Warning (≤30 days): ${usersByUrgency.warning.length}`);
    console.log(`  ⚫ Expired: ${usersByUrgency.expired.length}`);
    
    // Send notifications for all non-expired users
    const usersToNotify = [
      ...usersByUrgency.critical,
      ...usersByUrgency.urgent,
      ...usersByUrgency.warning
    ];
    
    if (usersToNotify.length === 0) {
      console.log('ℹ️ No users need notifications at this time.');
      return;
    }
    
    console.log(`📤 Sending notifications to ${usersToNotify.length} users...`);
    
    // Send bulk notifications
    const results = await emailService.sendBulkCredentialExpiryNotifications(usersToNotify);
    
    console.log('📈 Notification Results:');
    console.log(`  ✅ Successful: ${results.successCount}`);
    console.log(`  ❌ Failed: ${results.errorCount}`);
    console.log(`  📊 Total Processed: ${results.totalProcessed}`);
    
    // Log details of successful notifications
    if (results.successful.length > 0) {
      console.log('\n✅ Successfully sent notifications:');
      results.successful.forEach(result => {
        console.log(`  📧 ${result.email} (${result.daysUntilExpiry} days, ${result.urgency})`);
      });
    }
    
    // Log errors
    if (results.errors.length > 0) {
      console.log('\n❌ Failed notifications:');
      results.errors.forEach(error => {
        console.log(`  💥 ${error.email}: ${error.error}`);
      });
    }
    
    // Handle expired users (log but don't email as they can't login)
    if (usersByUrgency.expired.length > 0) {
      console.log('\n⚠️ Found users with already expired credentials:');
      usersByUrgency.expired.forEach(user => {
        const daysOverdue = Math.abs(Math.ceil((new Date(user.credential_expires_at) - now) / (1000 * 60 * 60 * 24)));
        console.log(`  🔒 ${user.email} (expired ${daysOverdue} days ago)`);
      });
    }
    
    console.log('\n🎉 Credential expiry notification process completed!');
    
  } catch (error) {
    console.error('💥 Error in credential expiry notification process:', error);
    logger.error('Credential expiry notification process failed:', error);
    process.exit(1);
  }
}

// Check command line arguments for specific actions
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📧 Credential Expiry Notification Scheduler

Usage: node scripts/send-expiry-notifications.js [options]

Options:
  --help, -h        Show this help message
  --dry-run         Show what would be sent without actually sending emails
  --critical-only   Only send notifications for critical cases (≤3 days)
  --urgent-only     Only send notifications for urgent cases (≤7 days)
  --days=N          Custom days threshold (default: 30)

Examples:
  node scripts/send-expiry-notifications.js
  node scripts/send-expiry-notifications.js --dry-run
  node scripts/send-expiry-notifications.js --critical-only
  node scripts/send-expiry-notifications.js --days=14
  
This script should be run regularly (e.g., daily) via cron job or task scheduler.
  `);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  // Dry run mode - show what would be sent
  async function dryRun() {
    try {
      const expiringUsers = await User.findUsersWithExpiringCredentials(30);
      console.log('🧪 DRY RUN MODE - No emails will be sent');
      console.log(`📊 Found ${expiringUsers.length} users with expiring credentials:`);
      
      expiringUsers.forEach(user => {
        const daysUntilExpiry = Math.ceil((new Date(user.credential_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
        let status = daysUntilExpiry <= 0 ? '🔴 EXPIRED' : 
                    daysUntilExpiry <= 3 ? '🔴 CRITICAL' :
                    daysUntilExpiry <= 7 ? '🟠 URGENT' : '🟡 WARNING';
        console.log(`  ${status} ${user.email} (${daysUntilExpiry} days)`);
      });
    } catch (error) {
      console.error('💥 Dry run failed:', error);
    }
  }
  
  dryRun();
} else {
  // Run the actual notification process
  sendCredentialExpiryNotifications();
}