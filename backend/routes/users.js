const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all users (admin only)
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, is_active, search } = req.query;
    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      ...(role && { role }),
      ...(is_active !== undefined && { is_active: is_active === 'true' })
    };

    const users = await User.findAll(filters);

    // Get users with credential status for admin
    const usersWithCredentialStatus = await Promise.all(
      users.map(async (user) => {
        try {
          return await user.toJSONWithCredentialStatus();
        } catch (error) {
          console.error('Error getting credential status for user:', user.id, error);
          // Fallback to regular toJSON if credential status fails
          return user.toJSON();
        }
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithCredentialStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: users.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single user (admin only)
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Include credential status for admin viewing
    const userWithCredentialStatus = await user.toJSONWithCredentialStatus();
    
    res.json({
      success: true,
      data: { user: userWithCredentialStatus }
    });
  } catch (error) {
    next(error);
  }
};

// Update user (admin only)
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for email conflicts if email is being updated
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updatedUser = await user.update(req.body);
    
    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    // Return user with credential status after update
    const userWithCredentialStatus = await updatedUser.toJSONWithCredentialStatus();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: userWithCredentialStatus }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.delete();
    
    logger.info(`User deleted: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['admin', 'buyer', 'vendor'])
    .withMessage('Invalid role'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('is_verified')
    .optional()
    .isBoolean()
    .withMessage('is_verified must be a boolean')
];

// All routes require authentication and admin role
router.use(protect, authorize('admin'));

// Routes
router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
