const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Determine whether to use real SMTP (production or forced in dev)
      const useSmtp = process.env.NODE_ENV === 'production' || process.env.FORCE_SMTP === 'true';

      // Create transporter based on environment or override
      if (useSmtp) {
        // Validate email configuration only when using real SMTP
        if (!this.validateEmailConfig()) {
          throw new Error('Email configuration is incomplete or invalid');
        }

        // Production/forced email configuration (using actual SMTP)
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // Development/testing configuration (using Ethereal Email)
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        logger.info('Email service initialized with test account:', {
          user: testAccount.user,
          pass: testAccount.pass
        });
        logger.warn('📧 DEVELOPMENT MODE: Using test email service. Real emails will NOT be delivered!');
        logger.warn('💡 To send real emails in development, set FORCE_SMTP=true in .env');
      }

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service connected successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      
      // Enhanced error handling for Gmail authentication
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        logger.error('Gmail Authentication Failed! Please check:');
        logger.error('1. You are using Gmail App Password (not regular password)');
        logger.error('2. 2-Factor Authentication is enabled on Gmail');
        logger.error('3. App Password is 16 characters long');
        logger.error('4. Run: node scripts/setup-gmail.js for setup help');
      }
      
      // Fallback: create a basic transporter that will log emails instead
      this.transporter = {
        sendMail: async (mailOptions) => {
          logger.warn('Email service unavailable. Email content:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.text,
            html: mailOptions.html
          });
          return { messageId: 'logged-' + Date.now() };
        }
      };
    }
  }

  // Validate email configuration
  validateEmailConfig() {
    const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
    const missingVars = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName] || process.env[varName].includes('your_') || process.env[varName].includes('password')) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      logger.error(`Missing or invalid email configuration variables: ${missingVars.join(', ')}`);
      logger.error('Please run: node scripts/setup-gmail.js to configure Gmail SMTP');
      return false;
    }
    
    // Validate Gmail App Password format (should be 16 characters)
    if (process.env.SMTP_HOST === 'smtp.gmail.com' && process.env.SMTP_PASS.length !== 16) {
      logger.error('Gmail App Password should be exactly 16 characters long');
      logger.error('Please run: node scripts/setup-gmail.js to configure Gmail SMTP');
      return false;
    }
    
    return true;
  }

  async sendPasswordResetEmail(email, resetToken, frontendUrl = 'http://localhost:5173') {
    try {
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@etendering.com',
        to: email,
        subject: 'Password Reset Request - E-Tendering Portal',
        text: `
You requested a password reset for your E-Tendering Portal account.

Click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Best regards,
E-Tendering Portal Team
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; text-align: center; margin: 0;">E-Tendering Portal</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                You requested a password reset for your E-Tendering Portal account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                          font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                This link will expire in <strong>1 hour</strong> for security reasons.
              </p>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you did not request this password reset, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Best regards,<br>
                E-Tendering Portal Team
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      const previewUrl = nodemailer.getTestMessageUrl(result);
      
      logger.info(`Password reset email sent to ${email}`, {
        messageId: result.messageId,
        ...(process.env.NODE_ENV === 'development' && { 
          previewUrl 
        })
      });

      return {
        success: true,
        messageId: result.messageId,
        ...(process.env.NODE_ENV === 'development' && { 
          previewUrl 
        })
      };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email, credentialExpiryDate = null) {
    try {
      // Format expiry date for display
      const expiryDateStr = credentialExpiryDate ? 
        new Date(credentialExpiryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : null;

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'scm@qaswaindustries.com',
        to: email,
        subject: 'Welcome to E-Tendering Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; text-align: center; margin: 0;">Welcome to E-Tendering Portal</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333;">Hello!</h2>
              
              <p style="color: #666; line-height: 1.6;">
                Welcome to the E-Tendering Portal. Your account has been successfully created.
              </p>
              
              <p style="color: #666; line-height: 1.6;">
                You can now log in and start participating in tenders or manage your tendering process.
              </p>
              
              ${expiryDateStr ? `
                <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #1565c0; font-size: 14px;">
                    <strong>🔐 Account Security:</strong> Your credentials will expire on <strong>${expiryDateStr}</strong> (1 year from creation). 
                    You will receive notifications before expiry, and administrators can extend your access when needed.
                  </p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                          font-weight: 600; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Best regards,<br>
                Qaswa Industries SCM Team
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Welcome email sent to ${email}`, {
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw here as this is not critical for registration
      return { success: false, error: error.message };
    }
  }

  // Generate username and password for new user
  generateCredentials(email) {
    const prefix = process.env.USERNAME_PREFIX || 'ETU';
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 random characters
    
    // Generate username: PREFIX + Random + Timestamp
    const username = `${prefix}${randomSuffix}${timestamp}`;
    
    // Generate secure password
    const passwordLength = parseInt(process.env.PASSWORD_LENGTH) || 12;
    const password = this.generateSecurePassword(passwordLength);
    
    return { username, password };
  }

  // Generate secure password with mixed case, numbers, and special characters
  generateSecurePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '@#$%&*!?';
    const allChars = lowercase + uppercase + numbers + specialChars;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Send user credentials via email
  async sendUserCredentials(email, userDetails, credentials, credentialExpiryDate = null) {
    try {
      const { role } = userDetails;
      const { username, password } = credentials;
      
      // Format expiry date for display
      const expiryDateStr = credentialExpiryDate ? 
        new Date(credentialExpiryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : null;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'scm@qaswaindustries.com',
        to: email,
        subject: 'Your E-Tendering Portal Account Credentials',
        text: `
Your E-Tendering Portal Account Has Been Created

Dear User,

Your account for the E-Tendering Portal has been successfully created. Below are your login credentials:

Email: ${email}
Username: ${username}
Temporary Password: ${password}
Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
${expiryDateStr ? `
IMPORTANT - CREDENTIAL EXPIRY:
Your credentials will expire on ${expiryDateStr} (1 year from creation).
You will receive notifications before expiry, and administrators can extend your access when needed.
` : ''}
For security reasons, we strongly recommend changing your password after your first login.

Login URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login

If you have any questions, please contact our support team.

Best regards,
Qaswa Industries SCM Team
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; text-align: center; margin: 0;">Account Created Successfully</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Dear User,</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Your account for the E-Tendering Portal has been successfully created. Below are your login credentials:
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🔐 Your Login Credentials</h3>
                <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 8px 0; color: #555;"><strong>Username:</strong> <span style="font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${username}</span></p>
                <p style="margin: 8px 0; color: #555;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${password}</span></p>
                <p style="margin: 8px 0; color: #555;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                ${expiryDateStr ? `<p style="margin: 8px 0; color: #555;"><strong>Credentials Expire:</strong> <span style="color: #d73527; font-weight: 600;">${expiryDateStr}</span></p>` : ''}
              </div>
              
              ${expiryDateStr ? `
                <div style="background: #fff8e1; border: 1px solid #ffcc02; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #ff8f00; font-size: 14px;">
                    <strong>⏰ Important - Credential Expiry:</strong> Your credentials will expire on <strong>${expiryDateStr}</strong> (1 year from creation). 
                    You will receive notifications before expiry, and administrators can extend your access when needed.
                  </p>
                </div>
              ` : ''}
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>🔔 Important:</strong> For security reasons, we strongly recommend changing your password after your first login.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                          font-weight: 600; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you have any questions, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Best regards,<br>
                Qaswa Industries SCM Team
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`User credentials email sent to ${email}`, {
        messageId: result.messageId,
        username: username
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send user credentials email:', error);
      throw new Error('Failed to send user credentials email');
    }
  }

  // Send account approval notification
  async sendAccountApprovalEmail(email, userDetails, approved = true) {
    try {
      const subject = approved ? 'Account Approved - E-Tendering Portal' : 'Account Status Update - E-Tendering Portal';
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'scm@qaswaindustries.com',
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${approved ? '#28a745' : '#dc3545'} 0%, ${approved ? '#20c997' : '#e74c3c'} 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; text-align: center; margin: 0;">${approved ? '✅ Account Approved' : '❌ Account Status Update'}</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Dear User,</h2>
              
              ${approved ? `
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  Great news! Your E-Tendering Portal account has been <strong style="color: #28a745;">approved</strong> and is now active.
                </p>
                
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #155724; font-size: 14px;">
                    <strong>🎉 Welcome aboard!</strong> You can now access all features of the E-Tendering Portal.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                     style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                            color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                            font-weight: 600; font-size: 16px;">
                    Access Your Account
                  </a>
                </div>
              ` : `
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  We wanted to update you on the status of your E-Tendering Portal account application.
                </p>
                
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #721c24; font-size: 14px;">
                    <strong>Account Status:</strong> Your account requires additional review. Please contact our support team for more information.
                  </p>
                </div>
              `}
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you have any questions, please don't hesitate to contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Best regards,<br>
                Qaswa Industries SCM Team
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Account ${approved ? 'approval' : 'status'} email sent to ${email}`, {
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error(`Failed to send account ${approved ? 'approval' : 'status'} email:`, error);
      throw new Error(`Failed to send account ${approved ? 'approval' : 'status'} email`);
    }
  }

  // Send credential expiry notification
  async sendCredentialExpiryNotification(email, userDetails, daysUntilExpiry) {
    try {
      const { username, company_name } = userDetails;
      const isUrgent = daysUntilExpiry <= 7;
      const isCritical = daysUntilExpiry <= 3;
      
      let urgencyColor, urgencyIcon, urgencyText;
      if (isCritical) {
        urgencyColor = '#d73527';
        urgencyIcon = '😨';
        urgencyText = 'URGENT';
      } else if (isUrgent) {
        urgencyColor = '#ff8f00';
        urgencyIcon = '⚠️';
        urgencyText = 'URGENT';
      } else {
        urgencyColor = '#1976d2';
        urgencyIcon = '🔔';
        urgencyText = 'NOTICE';
      }
      
      const subject = `${urgencyText}: Your E-Tendering Portal Credentials Expire in ${daysUntilExpiry} Day${daysUntilExpiry === 1 ? '' : 's'}`;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'scm@qaswaindustries.com',
        to: email,
        subject: subject,
        text: `
Credential Expiry Notification - E-Tendering Portal

Dear User,

This is an ${urgencyText} notification that your E-Tendering Portal credentials will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.

Account Details:
Email: ${email}
${username ? `Username: ${username}\n` : ''}${company_name ? `Company: ${company_name}\n` : ''}
Days Until Expiry: ${daysUntilExpiry}

IMPORTANT:
- Your access will be automatically disabled when credentials expire
- Contact your system administrator to extend your credentials
- You will receive ${isCritical ? 'final' : isUrgent ? 'additional' : 'more'} notifications as the expiry date approaches

To avoid service interruption, please contact your administrator immediately.

If you have already contacted administration or believe this is an error, please disregard this message.

Best regards,
Qaswa Industries SCM Team
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; text-align: center; margin: 0;">${urgencyIcon} Credential Expiry ${urgencyText}</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Dear User,</h2>
              
              <div style="background: ${isCritical ? '#ffebee' : isUrgent ? '#fff8e1' : '#e3f2fd'}; border: 1px solid ${isCritical ? '#f44336' : isUrgent ? '#ffcc02' : '#2196f3'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: ${urgencyColor}; margin-top: 0; margin-bottom: 10px;">${urgencyIcon} Credentials Expiring Soon!</h3>
                <p style="margin: 0; color: ${isCritical ? '#c62828' : isUrgent ? '#e65100' : '#1565c0'}; font-size: 16px; font-weight: 600;">
                  Your E-Tendering Portal credentials will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}</strong>.
                </p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📝 Account Details</h3>
                <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${email}</p>
                ${username ? `<p style="margin: 8px 0; color: #555;"><strong>Username:</strong> ${username}</p>` : ''}
                ${company_name ? `<p style="margin: 8px 0; color: #555;"><strong>Company:</strong> ${company_name}</p>` : ''}
                <p style="margin: 8px 0; color: #555;"><strong>Days Until Expiry:</strong> <span style="color: ${urgencyColor}; font-weight: 600;">${daysUntilExpiry}</span></p>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #856404; margin-top: 0; margin-bottom: 10px;">⚠️ Important Actions Required:</h4>
                <ul style="color: #856404; margin: 0; padding-left: 20px;">
                  <li>Your access will be <strong>automatically disabled</strong> when credentials expire</li>
                  <li><strong>Contact your system administrator</strong> to extend your credentials</li>
                  <li>You will receive ${isCritical ? 'final' : isUrgent ? 'additional' : 'more'} notifications as the expiry date approaches</li>
                </ul>
              </div>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #155724; font-size: 14px;">
                  <strong>📞 To avoid service interruption:</strong> Please contact your administrator immediately to extend your credentials.
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you have already contacted administration or believe this is an error, please disregard this message.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated notification. Please do not reply to this email.<br>
                Best regards,<br>
                Qaswa Industries SCM Team
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Credential expiry notification sent to ${email} (${daysUntilExpiry} days remaining)`, {
        messageId: result.messageId,
        urgency: urgencyText
      });

      return {
        success: true,
        messageId: result.messageId,
        urgency: urgencyText
      };
    } catch (error) {
      logger.error('Failed to send credential expiry notification:', error);
      throw new Error('Failed to send credential expiry notification');
    }
  }

  // Send bulk credential expiry notifications
  async sendBulkCredentialExpiryNotifications(users) {
    const results = [];
    const errors = [];
    
    for (const user of users) {
      try {
        const daysUntilExpiry = Math.ceil((new Date(user.credential_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry > 0) {
          const result = await this.sendCredentialExpiryNotification(
            user.email, 
            {
              username: user.username,
              company_name: user.company_name
            },
            daysUntilExpiry
          );
          
          results.push({
            email: user.email,
            daysUntilExpiry,
            messageId: result.messageId,
            urgency: result.urgency,
            success: true
          });
        }
      } catch (error) {
        errors.push({
          email: user.email,
          error: error.message
        });
      }
    }
    
    logger.info(`Bulk credential expiry notifications completed. Success: ${results.length}, Errors: ${errors.length}`);
    
    return {
      successful: results,
      errors: errors,
      totalProcessed: users.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
