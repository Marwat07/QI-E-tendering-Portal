const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');


// Register user
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      email,
      password,
      first_name,
      last_name,
      company_name,
      phone,
      address,
      role,
      username: providedUsername,
      categories: providedCategories = [],
      category: singleCategory,
      tax_number,
      registration_number
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Determine credentials (auto-generate if missing)
    let username = providedUsername || null;
    let finalPassword = password || null;
    let generatedCredentials = false;

    if (!username || !finalPassword) {
      const creds = emailService.generateCredentials(email);
      username = username || creds.username;
      finalPassword = finalPassword || creds.password;
      generatedCredentials = true;
    }

    // Normalize categories input
    const categories = Array.isArray(providedCategories) && providedCategories.length > 0
      ? providedCategories
      : (singleCategory ? [singleCategory] : []);

    // Create user with categories (keeps first category in main users table for backward compat)
    const user = await User.createWithCategories({
      email,
      username,
      password: finalPassword,
      first_name,
      last_name,
      company_name,
      phone,
      address,
      role: role || 'supplier',
      category: categories[0] || singleCategory || null,
      tax_number: tax_number || null,
      registration_number: registration_number || null
    }, categories);

    logger.info(`New user registered: ${email}`);

    // Optionally send credentials if we generated them
    if (generatedCredentials) {
      try {
        await emailService.sendUserCredentials(email, { role: role || 'supplier' }, { username, password: finalPassword }, user.credential_expires_at);
      } catch (emailErr) {
        logger.warn(`Failed to send credentials email to ${email}: ${emailErr.message}`);
        // Do not fail registration if email sending fails
      }
    } else {
      // Send welcome email when user supplied their own password
      try {
        await emailService.sendWelcomeEmail(email, user.credential_expires_at);
      } catch (emailErr) {
        logger.warn(`Failed to send welcome email to ${email}: ${emailErr.message}`);
      }
    }

    // Generate token
    const token = user.generateToken();

    // Ensure we serialize the full user object (toJSON is async)
    const safeUser = await user.toJSON();

    res.status(201).json({
      success: true,
      message: generatedCredentials
        ? 'Registration successful! Your login credentials have been sent to your email.'
        : 'User registered successfully',
      data: {
        token,
        user: safeUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Use stored user.role as the single source of truth; do not infer role from email.

    // Note: is_active check removed as column doesn't exist in current schema

    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if credentials are expired
    if (user.isCredentialExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Your credentials have expired. Please contact an administrator to renew your access.',
        expired: true
      });
    }

    logger.info(`User logged in: ${email}`);

    // Generate token
    const token = user.generateToken();

    // Ensure we include full user fields with credential status; toJSON is async
    const safeUser = await user.toJSONWithCredentialStatus();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: safeUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const safeUser = await req.user.toJSONWithCredentialStatus();

    res.json({
      success: true,
      data: {
        user: safeUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { first_name, last_name, company_name, phone, address } = req.body;

    // Update user
    const updatedUser = await req.user.update({
      first_name,
      last_name,
      company_name,
      phone,
      address
    });

    logger.info(`User profile updated: ${req.user.email}`);

    const safeUser = await updatedUser.toJSON();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: safeUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { current_password, new_password } = req.body;

    // Check current password
    const isCurrentPasswordMatch = await req.user.matchPassword(current_password);
    if (!isCurrentPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password and update
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await req.user.update({ password: hashedPassword });

    logger.info(`Password changed for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
const forgotPassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // For now, just return a success message
    // TODO: Implement actual password reset functionality
    logger.info(`Password reset requested for email: ${email}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
const resetPassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // For now, just return an error message
    // TODO: Implement actual password reset functionality
    logger.info(`Password reset attempted with token: ${token}`);

    res.status(400).json({
      success: false,
      message: 'Password reset functionality is not implemented yet.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};
