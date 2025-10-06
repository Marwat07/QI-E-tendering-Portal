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

  async sendWelcomeEmail(email) {
    try {
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
  async sendUserCredentials(email, userDetails, credentials) {
    try {
      const { role } = userDetails;
      const { username, password } = credentials;
      
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
              </div>
              
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
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
