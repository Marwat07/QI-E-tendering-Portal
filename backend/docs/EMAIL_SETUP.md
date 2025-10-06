# 📧 Gmail SMTP Configuration Guide

This guide will help you set up Gmail SMTP for the E-Tendering Portal to send emails to users.

## 🚨 Important: Gmail App Password Required

**You CANNOT use your regular Gmail password for SMTP!** Gmail requires an App Password for third-party applications.

## 📋 Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
npm run setup:gmail
```

This interactive script will guide you through the entire process.

### Option 2: Manual Setup

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click "2-Step Verification"
3. Follow the setup process to enable 2FA

#### Step 2: Create Gmail App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app type
3. Copy the 16-character password generated
4. **Keep this password safe - you won't see it again**

#### Step 3: Update .env File
```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_16_character_app_password
FROM_EMAIL=your_gmail_address@gmail.com
```

## 🧪 Testing Email Configuration

### Test Email Sending
```bash
npm run test:email
```

This will send a test email to verify your configuration is working.

### Check Server Logs
Monitor your server logs for email-related errors:
```bash
tail -f logs/combined.log | grep -i email
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. "Gmail Authentication Failed" (Error 535)
**Cause**: Wrong password or App Password not created
**Solution**:
- Ensure you're using Gmail App Password (16 characters)
- Run `npm run setup:gmail` for guided setup

#### 2. "2-Factor Authentication Required"
**Cause**: Gmail account doesn't have 2FA enabled
**Solution**:
- Enable 2FA in [Google Account Security](https://myaccount.google.com/security)
- Then create App Password

#### 3. "Connection Timeout" or "ECONNECTION"
**Cause**: Network/Firewall issues
**Solution**:
- Check firewall settings allow SMTP (port 587)
- Verify internet connectivity
- Try different network if behind corporate firewall

#### 4. "Less Secure Apps" Message
**Cause**: Using regular password instead of App Password
**Solution**:
- Create and use Gmail App Password
- **Do NOT** enable "Less secure app access"

### Configuration Validation

The email service automatically validates:
- ✅ All required environment variables are set
- ✅ No placeholder values remain
- ✅ Gmail App Password is 16 characters
- ✅ SMTP connection works

## 🔄 Environment-Specific Behavior

### Development Mode (`NODE_ENV=development`)
- Uses Ethereal Email test accounts
- Logs preview URLs for testing
- Emails don't actually get delivered

### Production Mode (`NODE_ENV=production`)
- Uses Gmail SMTP with your configuration
- Sends real emails to recipients
- Requires valid Gmail App Password

## 📧 Email Types Supported

The system sends these types of emails:

1. **Password Reset Emails**
   - Triggered when users request password reset
   - Contains secure reset link
   - Expires in 1 hour

2. **Welcome Emails**
   - Sent after successful registration
   - Contains login link

3. **User Credentials**
   - For admin-created accounts
   - Contains username and temporary password
   - Encourages password change on first login

4. **Account Approval Notifications**
   - Notifies users when account is approved/rejected
   - Contains next steps

## 🔐 Security Best Practices

1. **Use App Passwords**: Never use regular Gmail password
2. **Enable 2FA**: Required for App Password creation
3. **Secure .env**: Never commit .env file to version control
4. **Rotate Passwords**: Periodically update App Passwords
5. **Monitor Logs**: Watch for authentication failures

## 📝 Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | Gmail SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port number | `587` |
| `SMTP_SECURE` | Use SSL/TLS | `false` (for port 587) |
| `SMTP_USER` | Your Gmail address | `scm@qaswaindustries.com` |
| `SMTP_PASS` | Gmail App Password | `abcdefghijklmnop` |
| `FROM_EMAIL` | Sender email address | `scm@qaswaindustries.com` |

## 🆘 Getting Help

If you're still having issues:

1. **Run the setup script**: `npm run setup:gmail`
2. **Test configuration**: `npm run test:email`
3. **Check logs**: Look for specific error messages
4. **Verify Gmail settings**: Ensure 2FA and App Password are correctly configured

## 📚 Additional Resources

- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [2-Step Verification Help](https://support.google.com/accounts/answer/185839)
- [Nodemailer Gmail Guide](https://nodemailer.com/usage/using-gmail/)

---

**Need immediate help?** Run: `npm run setup:gmail`
