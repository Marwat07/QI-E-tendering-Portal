# Credential Expiry Feature

This document explains the credential expiry feature implemented for the e-tendering portal.

## Overview

The credential expiry feature ensures that user credentials expire after 1 year and provides visual warnings when credentials are approaching expiration. This enhances security by forcing periodic credential renewal.

## Features

- **Automatic Expiry**: All user credentials expire 1 year after account creation
- **Email Notifications**: Users receive email notifications with credential expiry dates
- **Expiry Reminders**: Automated email reminders before credentials expire
- **Visual Warnings**: Profile dropdown shows expiry status with color-coded indicators
- **Admin Management**: Administrators can extend or set specific expiry dates for users
- **API Endpoints**: RESTful endpoints for credential management
- **Middleware Protection**: Automatic logout for users with expired credentials

## Database Changes

### New Column
- `credential_expires_at` (TIMESTAMP) - Stores when user credentials expire

### New Database Objects
- **View**: `users_expiring_credentials` - Easy identification of users with expiring credentials
- **Functions**:
  - `extend_user_credentials(user_id)` - Extends credentials by 1 year
  - `is_user_credentials_expired(user_id)` - Check if credentials are expired

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
node run-credential-migration.js
```

### 2. Verify Migration
The migration script will verify that:
- `credential_expires_at` column is added
- Database view is created
- PostgreSQL functions are installed

### 3. Update Existing Users
Existing users will automatically have their credential expiry set to 1 year from their account creation date.

## API Endpoints

All credential endpoints are prefixed with `/api/credentials`:

### User Endpoints
- `GET /status` - Get current user's credential status
- `POST /extend` - Extend credentials (admin only)

### Admin Endpoints

#### User Management (`/api/admin/users`)
- User lists now include `credential_expires_at`, `days_until_expiry`, and `credential_status`
- Single user view includes full credential status information
- Dashboard shows credential expiry statistics (expired, critical, warning users)

#### Credential Management (`/api/admin/credentials`)
- `GET /expiring?days=30` - Get users with credentials expiring within specified days
- `POST /extend/:userId` - Extend specific user's credentials by 1 year
- `POST /bulk-extend` - Extend credentials for multiple users
- `POST /send-notifications` - Send expiry notifications to users (with dry-run option)

#### Legacy Credential API (`/api/credentials`)
- `GET /status` - Get current user's credential status
- `POST /extend` - Extend credentials (admin only)
- `GET /expired` - Get users with expired credentials
- `POST /set-expiry` - Set specific expiry date for a user
- `POST /bulk-extend` - Extended bulk operations

## Frontend Integration

### ProfileDropdown Component
The profile dropdown now shows credential status:
- 🔴 **Expired**: Credentials have expired
- 🟠 **Critical**: Expires within 7 days
- 🟡 **Warning**: Expires within 30 days
- 🟢 **Valid**: Shows days remaining (when < 90 days)

### Status Indicators
Visual indicators help users identify their credential status at a glance.

## Email Integration

### User Registration Emails
- **Welcome Email**: Includes credential expiry date information
- **Credential Email**: Shows expiry date when credentials are auto-generated
- **Visual Indicators**: Color-coded expiry information in emails

### Expiry Notification Emails
- **Automated Reminders**: Sent at configurable intervals before expiry
- **Urgency Levels**: 
  - 🔔 **Notice** (30 days): Blue notification with expiry information
  - ⚠️ **Urgent** (7 days): Orange warning with action required
  - 😨 **Critical** (3 days): Red alert with immediate action needed
- **Bulk Notifications**: Administrative script for mass notifications
- **Customizable Content**: Professional email templates with company branding

## User Experience

### For Regular Users
- See credential status in profile dropdown
- Get visual warnings when credentials are expiring
- Receive email notifications before expiry
- Automatic logout when credentials expire
- Contact administrator message for expired credentials

### For Administrators
- **Enhanced Dashboard**: View credential expiry statistics at a glance
- **User Management**: All user lists show credential status and expiry information
- **Bulk Operations**: Extend multiple user credentials simultaneously
- **Notification Management**: Send manual expiry notifications with dry-run testing
- **Advanced Filtering**: Find users by credential status (expired, critical, warning)
- **Audit Trail**: All credential extensions are logged with admin information

## Security Features

### Automatic Logout
- Users with expired credentials are automatically logged out
- Cannot access protected routes with expired credentials
- Clear error messages guide users to contact administrators

### Middleware Protection
- `requireValidCredentials` - Blocks expired users
- `checkCredentialsWithWarning` - Allows access but shows warnings
- `requireAdminWithValidCredentials` - Admin routes with credential check

## Configuration

### Expiry Period
Default: 1 year from creation/last extension

### Warning Periods
- **Critical**: 7 days before expiry
- **Warning**: 30 days before expiry
- **Info**: 90 days before expiry (for valid credentials)

## Development Notes

### User Model Extensions
New methods added to the User model:
- `isCredentialExpired()` - Check if credentials are expired
- `getDaysUntilExpiry()` - Get days until expiry
- `getCredentialStatus()` - Get status object with details
- `extendCredentials()` - Extend by 1 year
- `setCredentialExpiry(date)` - Set specific expiry date

### Authentication Updates
- Login checks for expired credentials
- Profile endpoint includes credential status
- Enhanced user objects include expiry information

## Testing

### Manual Testing
1. Create a new user - should have 1 year expiry
2. Update expiry to near future - should show warnings
3. Set expiry to past date - should block login
4. Admin should be able to extend credentials

### Database Testing
```sql
-- Check user credentials
SELECT email, credential_expires_at, 
  EXTRACT(DAYS FROM (credential_expires_at - CURRENT_TIMESTAMP)) AS days_until_expiry
FROM users;

-- View expiring credentials
SELECT * FROM users_expiring_credentials;

-- Test functions
SELECT extend_user_credentials(1);
SELECT is_user_credentials_expired(1);
```

## Troubleshooting

### Common Issues
1. **Migration fails**: Check database connection and permissions
2. **Frontend not showing status**: Verify API returns credential info
3. **Users not being logged out**: Check middleware implementation

### Logs
Check application logs for credential-related events:
- User login with expired credentials
- Credential extensions by admins
- Migration execution

## Automation

### Scheduled Notifications
Use the provided script to send automated expiry notifications:

```bash
# Send notifications to all users with expiring credentials
node scripts/send-expiry-notifications.js

# Dry run to see what would be sent
node scripts/send-expiry-notifications.js --dry-run

# Only send critical notifications (≤3 days)
node scripts/send-expiry-notifications.js --critical-only
```

### Cron Job Setup
For automated daily notifications, add to your cron job:

```bash
# Daily at 9 AM
0 9 * * * cd /path/to/backend && node scripts/send-expiry-notifications.js

# Twice daily for critical notifications
0 9,17 * * * cd /path/to/backend && node scripts/send-expiry-notifications.js --critical-only
```

### Windows Task Scheduler
For Windows servers, create a scheduled task:

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily/weekly)
4. Action: Start a program
5. Program: `node`
6. Arguments: `scripts/send-expiry-notifications.js`
7. Start in: `C:\path\to\backend`

## Future Enhancements

Potential future improvements:
- ~~Email notifications for expiring credentials~~ ✅ **Implemented**
- Configurable expiry periods per user role
- Credential renewal workflows
- Integration with external identity providers
- Audit logging for credential changes
- SMS notifications for critical expiry
- Integration with calendar systems

## Support

For issues related to the credential expiry feature:
1. Check application logs
2. Verify database migration completed
3. Test API endpoints directly
4. Check frontend console for errors

## API Examples

### Check Current User Status
```javascript
fetch('/api/credentials/status', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log(data.credentialStatus));
```

### Extend User Credentials (Admin)
```javascript
fetch('/api/credentials/extend', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userId: 123 })
})
.then(res => res.json());
```

### Get Expiring Users (Admin)
```javascript
// Using new admin endpoint
fetch('/api/admin/credentials/expiring?days=30', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
})
.then(res => res.json())
.then(data => console.log(`${data.totalCount} users expiring soon`));

// Legacy endpoint still available
fetch('/api/credentials/expiring?days=30', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
})
.then(res => res.json())
.then(data => console.log(`${data.totalCount} users expiring soon`));
```

### Extend Single User Credentials (Admin)
```javascript
fetch('/api/admin/credentials/extend/123', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
})
.then(res => res.json())
.then(data => console.log('Credentials extended until:', data.newExpiryDate));
```

### Bulk Extend Credentials (Admin)
```javascript
fetch('/api/admin/credentials/bulk-extend', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userIds: [123, 456, 789] })
})
.then(res => res.json())
.then(data => console.log(`${data.successCount} users extended successfully`));
```

### Send Expiry Notifications (Admin)
```javascript
// Dry run to preview notifications
fetch('/api/admin/credentials/send-notifications', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ days: 30, dryRun: true })
})
.then(res => res.json())
.then(data => console.log('Would notify:', data.totalUsers, 'users'));

// Send actual notifications
fetch('/api/admin/credentials/send-notifications', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ days: 30, dryRun: false })
})
.then(res => res.json())
.then(data => console.log(`${data.successCount} notifications sent`));
```

### Get Enhanced User List with Credential Info (Admin)
```javascript
fetch('/api/admin/users', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
})
.then(res => res.json())
.then(data => {
  data.users.forEach(user => {
    if (user.credentialStatus) {
      console.log(`${user.email}: ${user.credentialStatus.status} (${user.daysUntilExpiry} days)`);
    }
  });
});
```
