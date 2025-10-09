const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get credential status for current user
router.get('/status', protect, async (req, res, next) => {
  try {
    const credentialStatus = req.user.getCredentialStatus();
    
    res.json({
      success: true,
      data: {
        credentialStatus,
        expiresAt: req.user.credential_expires_at,
        isExpired: req.user.isCredentialExpired(),
        daysUntilExpiry: req.user.getDaysUntilExpiry()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Extend current user's credentials (admin only)
router.post('/extend', protect, async (req, res, next) => {
  try {
    // Only admin can extend credentials
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can extend credentials'
      });
    }

    const { userId } = req.body;
    
    // If no userId provided, extend own credentials
    const targetUserId = userId || req.user.id;
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newExpiryDate = await targetUser.extendCredentials();
    
    logger.info(`Credentials extended for user ${targetUser.email} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'Credentials extended successfully',
      data: {
        newExpiryDate,
        extendedUser: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Set specific expiry date for user (admin only)
router.post('/set-expiry', protect, async (req, res, next) => {
  try {
    // Only admin can set specific expiry dates
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can set credential expiry dates'
      });
    }

    const { userId, expiryDate } = req.body;
    
    if (!userId || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'userId and expiryDate are required'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate expiry date
    const newExpiryDate = new Date(expiryDate);
    if (isNaN(newExpiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date format'
      });
    }

    await targetUser.setCredentialExpiry(newExpiryDate);
    
    logger.info(`Credential expiry set to ${newExpiryDate} for user ${targetUser.email} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'Credential expiry date set successfully',
      data: {
        expiryDate: newExpiryDate,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get users with expiring credentials (admin only)
router.get('/expiring', protect, async (req, res, next) => {
  try {
    // Only admin can view expiring credentials report
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view credential expiry reports'
      });
    }

    const days = parseInt(req.query.days) || 30; // Default to 30 days
    
    const expiringUsers = await User.findUsersWithExpiringCredentials(days);
    
    // Get credential status for each user
    const usersWithStatus = expiringUsers.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      company_name: user.company_name,
      role: user.role,
      credential_expires_at: user.credential_expires_at,
      credentialStatus: user.getCredentialStatus(),
      isExpired: user.isCredentialExpired(),
      daysUntilExpiry: user.getDaysUntilExpiry()
    }));

    res.json({
      success: true,
      data: {
        users: usersWithStatus,
        totalCount: usersWithStatus.length,
        daysFilter: days
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get expired users (admin only)
router.get('/expired', protect, async (req, res, next) => {
  try {
    // Only admin can view expired credentials
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view expired credentials'
      });
    }

    const expiredUsers = await User.findExpiredUsers();
    
    // Get credential status for each user
    const usersWithStatus = expiredUsers.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      company_name: user.company_name,
      role: user.role,
      credential_expires_at: user.credential_expires_at,
      credentialStatus: user.getCredentialStatus(),
      isExpired: user.isCredentialExpired(),
      daysUntilExpiry: user.getDaysUntilExpiry()
    }));

    res.json({
      success: true,
      data: {
        users: usersWithStatus,
        totalCount: usersWithStatus.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Bulk extend credentials for multiple users (admin only)
router.post('/bulk-extend', protect, async (req, res, next) => {
  try {
    // Only admin can bulk extend credentials
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can bulk extend credentials'
      });
    }

    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and cannot be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (user) {
          const newExpiryDate = await user.extendCredentials();
          results.push({
            userId: user.id,
            email: user.email,
            newExpiryDate,
            success: true
          });
        } else {
          errors.push({
            userId,
            error: 'User not found'
          });
        }
      } catch (error) {
        errors.push({
          userId,
          error: error.message
        });
      }
    }

    logger.info(`Bulk credential extension completed by admin ${req.user.email}. Success: ${results.length}, Errors: ${errors.length}`);

    res.json({
      success: true,
      message: `Bulk credential extension completed. ${results.length} users updated.`,
      data: {
        successful: results,
        errors: errors,
        totalProcessed: userIds.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;