const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const { query } = require('../config/database');
const dbHealthCheck = require('../utils/dbHealthCheck');
const databaseMiddleware = require('../middleware/database');
const emailService = require('../services/emailService');

// Apply admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    console.log('Fetching dashboard statistics...');
    
    // Get user statistics with credential expiry info
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'vendor' THEN 1 END) as vendors,
        COUNT(CASE WHEN role = 'buyer' THEN 1 END) as buyers,
        COUNT(*) as active_users,
        COUNT(CASE WHEN credential_expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_users,
        COUNT(CASE WHEN credential_expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' AND credential_expires_at > CURRENT_TIMESTAMP THEN 1 END) as critical_expiry,
        COUNT(CASE WHEN credential_expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND credential_expires_at > CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 1 END) as warning_expiry
      FROM users
    `);
    console.log('User stats:', userStats.rows[0]);

    // Get tender statistics
    const tenderStats = await query(`
      SELECT 
        COUNT(*) as total_tenders,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tenders,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tenders,
        COUNT(CASE WHEN deadline > CURRENT_TIMESTAMP AND (status = 'open' OR status IS NULL) THEN 1 END) as active_tenders
      FROM tenders
    `);
    console.log('Tender stats:', tenderStats.rows[0]);

    // Get bid statistics (using supplier_id instead of vendor_id)
    const bidStats = await query(`
      SELECT 
        COUNT(*) as total_bids,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bids,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_bids,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_bids,
        COALESCE(SUM(CASE WHEN status = 'accepted' THEN amount ELSE 0 END), 0) as total_value
      FROM bids
    `);
    console.log('Bid stats:', bidStats.rows[0]);

    // Get recent activities
    const recentTenders = await query(`
      SELECT t.id, t.title, t.description, t.status, t.created_at, c.name as category_name
      FROM tenders t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);
    console.log('Recent tenders count:', recentTenders.rows.length);

    const recentBids = await query(`
      SELECT b.id, b.amount, b.status, b.submitted_at, 
             t.title as tender_title, 
             COALESCE(u.company_name, u.username, u.email) as vendor_name
      FROM bids b
      LEFT JOIN tenders t ON b.tender_id = t.id
      LEFT JOIN users u ON b.supplier_id = u.id
      ORDER BY b.submitted_at DESC
      LIMIT 5
    `);
    console.log('Recent bids count:', recentBids.rows.length);

    const responseData = {
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(userStats.rows[0].total_users) || 0,
          vendors: parseInt(userStats.rows[0].vendors) || 0,
          buyers: parseInt(userStats.rows[0].buyers) || 0,
          activeUsers: parseInt(userStats.rows[0].active_users) || 0,
          expiredUsers: parseInt(userStats.rows[0].expired_users) || 0,
          criticalExpiryUsers: parseInt(userStats.rows[0].critical_expiry) || 0,
          warningExpiryUsers: parseInt(userStats.rows[0].warning_expiry) || 0,
          totalTenders: parseInt(tenderStats.rows[0].total_tenders) || 0,
          openTenders: parseInt(tenderStats.rows[0].open_tenders) || 0,
          closedTenders: parseInt(tenderStats.rows[0].closed_tenders) || 0,
          activeTenders: parseInt(tenderStats.rows[0].active_tenders) || 0,
          totalBids: parseInt(bidStats.rows[0].total_bids) || 0,
          pendingBids: parseInt(bidStats.rows[0].pending_bids) || 0,
          acceptedBids: parseInt(bidStats.rows[0].accepted_bids) || 0,
          rejectedBids: parseInt(bidStats.rows[0].rejected_bids) || 0,
          platformValue: parseFloat(bidStats.rows[0].total_value) || 0
        },
        recentTenders: recentTenders.rows,
        recentBids: recentBids.rows
      }
    };
    
    console.log('Dashboard response prepared successfully');
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/categories - List categories (admin-only)
router.get('/categories', async (req, res) => {
  try {
    const result = await query('SELECT id, name, description, is_active, created_at FROM categories ORDER BY name');
    res.json({ success: true, data: { categories: result.rows } });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// POST /api/admin/categories - Create a new category (admin-only)
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const trimmed = String(name).trim();

    // Check for duplicate (case-insensitive)
    const existing = await query('SELECT id, is_active FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1', [trimmed]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const insert = await query(
      'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, true) RETURNING id, name, description, is_active, created_at',
      [trimmed, description || null]
    );

  res.status(201).json({ success: true, message: 'Category created successfully', data: insert.rows[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// DELETE /api/admin/categories/:id - Delete a category (admin-only)
router.delete('/categories/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    // Check if category exists
    const existing = await query('SELECT id, name FROM categories WHERE id = $1', [categoryId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const categoryName = existing.rows[0].name;

    // Check if category is in use by tenders
    const tendersUsingCategory = await query('SELECT COUNT(*) as count FROM tenders WHERE category_id = $1', [categoryId]);
    const tenderCount = parseInt(tendersUsingCategory.rows[0].count);

    // Check if category is in use by users
    const usersUsingCategory = await query('SELECT COUNT(*) as count FROM user_categories WHERE category = $1', [categoryName]);
    const userCount = parseInt(usersUsingCategory.rows[0].count);

    if (tenderCount > 0 || userCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete category "${categoryName}". It is currently used by ${tenderCount} tender(s) and ${userCount} user(s).` 
      });
    }

    // Delete the category
    await query('DELETE FROM categories WHERE id = $1', [categoryId]);

    res.json({ success: true, message: `Category "${categoryName}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Query to get all user data with categories and credential expiry info
    let queryText = `
      SELECT u.id, u.email, u.username, u.company_name, u.phone, u.role, u.category, u.address,
             u.is_active, u.is_verified, u.is_archived, u.created_at, u.updated_at,
             u.credential_expires_at,
             EXTRACT(DAYS FROM (u.credential_expires_at - CURRENT_TIMESTAMP)) AS days_until_expiry,
             CASE 
               WHEN u.credential_expires_at IS NULL THEN 'no_expiry'
               WHEN u.credential_expires_at <= CURRENT_TIMESTAMP THEN 'expired'
               WHEN u.credential_expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'critical'
               WHEN u.credential_expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'warning'
               ELSE 'valid'
             END AS credential_status,
             COALESCE(
               array_agg(uc.category ORDER BY uc.category) FILTER (WHERE uc.category IS NOT NULL), 
               ARRAY[]::varchar[]
             ) as categories
      FROM users u
      LEFT JOIN user_categories uc ON u.id = uc.user_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      queryText += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    // Optional filter for archived users: status=archived or status=active (default active)
    if (status === 'archived') {
      queryText += ' AND u.is_archived = TRUE';
    } else if (status === 'active') {
      queryText += ' AND u.is_archived = FALSE';
    }

    queryText += ` GROUP BY u.id, u.email, u.username, u.company_name, u.phone, u.role, u.category, u.address, u.is_active, u.is_verified, u.is_archived, u.created_at, u.updated_at, u.credential_expires_at`;
    queryText += ` ORDER BY u.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);
    
    res.json({
      success: true,
      data: {
        users: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users' 
    });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const {
      email,
      company_name,
      phone,
      address,
      role = 'vendor',
      category = 'Other',
      categories = [],
      tax_number,
      registration_number,
      auto_generate_credentials = process.env.AUTO_GENERATE_CREDENTIALS === 'true'
    } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Validate role
    if (!['admin', 'buyer', 'vendor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, buyer, or vendor'
      });
    }
    
// Validate categories dynamically against categories table
    let finalCategories = [];
    // Fetch active category names from DB
    const catsResult = await query("SELECT name FROM categories WHERE is_active = true");
    const validCategoryNames = new Set(catsResult.rows.map(r => r.name));

    if (categories && Array.isArray(categories) && categories.length > 0) {
      for (const cat of categories) {
        if (!validCategoryNames.has(cat)) {
          return res.status(400).json({
            success: false,
            message: `Invalid category '${cat}'. Please add it in Categories Management first.`
          });
        }
      }
      finalCategories = categories;
    } else {
      if (!validCategoryNames.has(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category '${category}'. Please add it in Categories Management first.`
        });
      }
      finalCategories = [category];
    }
    
    // Generate credentials automatically
    let finalPassword;
    let username = null;
    
    if (auto_generate_credentials) {
      const credentials = emailService.generateCredentials(email);
      username = credentials.username;
      finalPassword = credentials.password;
    } else {
      // Auto-generation is now the default, no manual password entry
      const credentials = emailService.generateCredentials(email);
      username = credentials.username;
      finalPassword = credentials.password;
    }
    
    // Check if user already exists by email
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Check if username already exists (if auto-generated)
    if (username) {
      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        // If username exists, regenerate with a different timestamp
        const newCredentials = emailService.generateCredentials(email);
        username = newCredentials.username;
        finalPassword = newCredentials.password;
      }
    }
    
    // Create user with categories
    const user = await User.createWithCategories({
      email,
      username,
      password: finalPassword,
      company_name: company_name || null,
      phone: phone || null,
      address: address || null,
      role,
      category: finalCategories[0], // Keep first category for backward compatibility
      tax_number: tax_number || null,
      registration_number: registration_number || null
    }, finalCategories);
    
    console.log(`New user created by admin: ${email}`);
    
    // Send credentials via email
    if (username && finalPassword) {
      try {
        await emailService.sendUserCredentials(
          email,
          {
            role: role
          },
          {
            username: username,
            password: finalPassword
          },
          user.credential_expires_at  // Include credential expiry date
        );
        console.log(`Credentials email sent to: ${email} with expiry date`);
      } catch (emailError) {
        console.error('Failed to send credentials email:', emailError);
        // Don't fail the user creation if email fails
      }
    }
    
    const responseData = await user.toJSON();
    // Remove password from response
    delete responseData.password;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully and credentials sent via email',
      data: responseData,
      ...(process.env.NODE_ENV === 'development' && {
        debug_credentials: { username, password: finalPassword }
      })
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/users/:id - Get specific user details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Include credential status in response
    const userWithCredentialStatus = await user.toJSONWithCredentialStatus();
    
    res.json({
      success: true,
      data: userWithCredentialStatus
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user' 
    });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    console.log('Admin user update request:', {
      userId: req.params.id,
      updateData: req.body
    });
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Allow updating all user fields except sensitive ones like password and id
    const allowedUpdates = [
      'email', 
      'username',
      'company_name', 
      'phone', 
      'address', 
      'role', 
      'category',
      'categories',
      'is_active', 
      'is_verified',
      'tax_number',
      'registration_number',
      'website'
    ];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        // Handle empty strings for optional fields
        if (typeof req.body[key] === 'string' && req.body[key].trim() === '' && 
            ['company_name', 'phone', 'address', 'tax_number', 'registration_number', 'website'].includes(key)) {
          updates[key] = null;
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    // Validate email format if email is being updated
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      
      // Check if email is already taken by another user
      const existingUser = await User.findByEmail(updates.email);
      if (existingUser && existingUser.id !== parseInt(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
    }

    // Validate role if being updated
    if (updates.role && !['admin', 'buyer', 'vendor'].includes(updates.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, buyer, or vendor'
      });
    }
    
// Validate categories dynamically against categories table
    let finalCategories = null;
    if (updates.categories && Array.isArray(updates.categories)) {
      const catsResult = await query("SELECT name FROM categories WHERE is_active = true");
      const validCategoryNames = new Set(catsResult.rows.map(r => r.name));
      for (const cat of updates.categories) {
        if (!validCategoryNames.has(cat)) {
          return res.status(400).json({
            success: false,
            message: `Invalid category '${cat}'. Please add it in Categories Management first.`
          });
        }
      }
      finalCategories = updates.categories;
      updates.category = updates.categories[0];
      delete updates.categories;
    } else if (updates.category) {
      const catsResult = await query("SELECT name FROM categories WHERE is_active = true");
      const validCategoryNames = new Set(catsResult.rows.map(r => r.name));
      if (!validCategoryNames.has(updates.category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category '${updates.category}'. Please add it in Categories Management first.`
        });
      }
      finalCategories = [updates.category];
    }

    // Validate boolean fields
    if (updates.is_active !== undefined && typeof updates.is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value'
      });
    }
    
    if (updates.is_verified !== undefined && typeof updates.is_verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_verified must be a boolean value'
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    console.log('Applying updates:', updates);
    const updatedUser = await user.update(updates);
    
    // Update categories if provided
    if (finalCategories !== null) {
      await updatedUser.setCategories(finalCategories);
      console.log('Updated categories for user:', finalCategories);
    }
    
    console.log('User update successful for user:', user.email);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: await updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }
    
    if (error.code === '23514') { // Check constraint violation
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, buyer, or vendor'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/users/:id/status - Toggle user status
router.put('/users/:id/status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const { is_active } = req.body;
    await user.update({ is_active });
    
    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user status' 
    });
  }
});

// PATCH /api/admin/users/:id/archive - Archive/Unarchive user
router.patch('/users/:id/archive', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const { archived } = req.body;
    
    if (typeof archived !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'archived field must be a boolean value'
      });
    }

    // Prevent archiving admin users (optional security measure)
    if (archived && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot archive admin users'
      });
    }

    await user.update({ is_archived: archived });
    
    const action = archived ? 'archived' : 'unarchived';
    
    res.json({
      success: true,
      message: `User ${action} successfully`,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Error archiving/unarchiving user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user archive status' 
    });
  }
});

// DELETE /api/admin/users/:id - Delete user permanently
router.delete('/users/:id', async (req, res) => {
  const { getClient } = require('../config/database');
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Prevent deleting admin users (security measure)
    if (user.role === 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }
    
    // Check if user has active bids or tenders
    const bidCountResult = await client.query('SELECT COUNT(*) as count FROM bids WHERE supplier_id = $1', [req.params.id]);
    const tenderCountResult = await client.query('SELECT COUNT(*) as count FROM tenders WHERE created_by = $1', [req.params.id]);
    
    const bidCount = parseInt(bidCountResult.rows[0].count);
    const tenderCount = parseInt(tenderCountResult.rows[0].count);
    
    let deletedRelatedItems = [];
    
    // Delete user's bids
    if (bidCount > 0) {
      await client.query('DELETE FROM bids WHERE supplier_id = $1', [req.params.id]);
      deletedRelatedItems.push(`${bidCount} bid${bidCount > 1 ? 's' : ''}`);
    }
    
    // Archive user's tenders instead of deleting them (preserve tender history)
    if (tenderCount > 0) {
      await client.query('UPDATE tenders SET status = $1 WHERE created_by = $2', ['archived', req.params.id]);
      deletedRelatedItems.push(`${tenderCount} tender${tenderCount > 1 ? 's archived' : ' archived'}`);
    }
    
    // Delete the user
    await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    
    await client.query('COMMIT');
    
    let message = 'User deleted successfully';
    if (deletedRelatedItems.length > 0) {
      message += ` (${deletedRelatedItems.join(', ')})`;
    }
    
    res.json({
      success: true,
      message: message,
      deletedBidsCount: bidCount,
      archivedTendersCount: tenderCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user' 
    });
  } finally {
    client.release();
  }
});

// GET /api/admin/tenders - Get all tenders
router.get('/tenders', async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category_id = category;
    
    filters.limit = parseInt(limit);
    filters.offset = (page - 1) * limit;

    const tenders = await Tender.findAll(filters);
    const totalTenders = await Tender.getCount(filters);
    
    // Debug log to see the categories in retrieved tenders
    console.log('Admin fetched tenders with categories:', 
      tenders.slice(0, 3).map(t => ({ 
        id: t.id, 
        title: t.title, 
        categories: t.categories, 
        display_category: t.display_category,
        category_name: t.category_name
      }))
    );

    res.json({
      success: true,
      data: {
        tenders: tenders,
        total: totalTenders,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tenders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tenders' 
    });
  }
});

// POST /api/admin/tenders - Create new tender
router.post('/tenders', async (req, res) => {
  try {
    console.log('Admin creating tender with data:', req.body);
    
    const tenderData = {
      ...req.body,
      status: req.body.status || 'open', // Default to 'open' status for active tenders
      created_by: req.user.id // Admin user creates the tender
    };
    
    // Handle multiple categories from checkboxes - use the first one as primary category
    if (tenderData.categories && Array.isArray(tenderData.categories) && tenderData.categories.length > 0) {
      console.log('Multiple categories selected:', tenderData.categories);
      // Use the first category as the primary category
      tenderData.category = tenderData.categories[0];
      console.log('Using primary category:', tenderData.category);
    }

    const tender = await Tender.create(tenderData);
    
    // Log the created tender for debugging
    console.log('Created tender:', tender);
    
    res.status(201).json({
      success: true,
      message: 'Tender created successfully',
      data: tender
    });
  } catch (error) {
    console.error('Error creating tender:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create tender',
      error: error.message
    });
  }
});

// GET /api/admin/tenders/:id - Get specific tender
router.get('/tenders/:id', async (req, res) => {
  try {
    console.log('Admin fetching single tender with ID:', req.params.id);
    
    const tender = await Tender.findWithBidsCount(req.params.id);
    if (!tender) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tender not found' 
      });
    }
    
    // Debug log the tender details including categories
    console.log('Admin fetched single tender details:', {
      id: tender.id,
      title: tender.title,
      categories: tender.categories,
      display_category: tender.display_category,
      category_name: tender.category_name,
      category_id: tender.category_id
    });

    // Get bids for this tender
    const bids = await Bid.findAll({ tender_id: req.params.id });
    
    res.json({
      success: true,
      data: {
        tender,
        bids
      }
    });
  } catch (error) {
    console.error('Error fetching tender:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tender' 
    });
  }
});

// PUT /api/admin/tenders/:id - Update tender
router.put('/tenders/:id', async (req, res) => {
  try {
    console.log('Admin updating tender with ID:', req.params.id);
    console.log('Update data:', req.body);
    
    const tender = await Tender.findById(req.params.id);
    if (!tender) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tender not found' 
      });
    }

    // Handle category update - log for debugging
    if (req.body.category) {
      console.log('Category in update request:', req.body.category);
    }

    const updatedTender = await tender.update(req.body);
    console.log('Tender updated successfully:', updatedTender.id);
    
    res.json({
      success: true,
      message: 'Tender updated successfully',
      data: updatedTender
    });
  } catch (error) {
    console.error('Error updating tender:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update tender',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/tenders/:id/archive - Archive tender (safer alternative to deletion)
router.put('/tenders/:id/archive', async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tender not found' 
      });
    }

    // Get count of existing bids for this tender
    const bids = await Bid.findAll({ tender_id: req.params.id });
    const bidCount = bids.length;

    // Archive the tender by setting status to 'archived'
    await tender.update({ 
      status: 'archived'
    });

    const message = bidCount > 0 
      ? `Tender archived successfully (${bidCount} bid${bidCount > 1 ? 's' : ''} preserved)`
      : 'Tender archived successfully';

    res.json({
      success: true,
      message: message,
      archivedBidsCount: bidCount
    });
  } catch (error) {
    console.error('Error archiving tender:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to archive tender' 
    });
  }
});

// PUT /api/admin/tenders/:id/unarchive - Unarchive a previously archived tender
router.put('/tenders/:id/unarchive', async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tender not found' 
      });
    }

    if (tender.status !== 'archived') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only archived tenders can be unarchived' 
      });
    }

    // Get count of existing bids for this tender
    const bids = await Bid.findAll({ tender_id: req.params.id });
    const bidCount = bids.length;

    // Unarchive the tender by setting status back to 'open'
    await tender.update({ 
      status: 'open'
    });

    const message = bidCount > 0 
      ? `Tender unarchived successfully (${bidCount} bid${bidCount > 1 ? 's' : ''} restored to active view)`
      : 'Tender unarchived successfully';

    res.json({
      success: true,
      message: message,
      restoredBidsCount: bidCount
    });
  } catch (error) {
    console.error('Error unarchiving tender:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unarchive tender' 
    });
  }
});

// DELETE /api/admin/tenders/:id - Delete tender (with cascade delete for bids)
router.delete('/tenders/:id', async (req, res) => {
  const { query, getClient } = require('../config/database');
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if tender exists
    const tenderResult = await client.query('SELECT * FROM tenders WHERE id = $1', [req.params.id]);
    if (tenderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Tender not found' 
      });
    }

    const tender = tenderResult.rows[0];

    // Get count of existing bids for this tender
    const bidCountResult = await client.query('SELECT COUNT(*) as count FROM bids WHERE tender_id = $1', [req.params.id]);
    const bidCount = parseInt(bidCountResult.rows[0].count);

    let message = 'Tender deleted successfully';
    
    // Delete all bids for this tender first (cascade delete)
    if (bidCount > 0) {
      await client.query('DELETE FROM bids WHERE tender_id = $1', [req.params.id]);
      message = `Tender deleted successfully along with ${bidCount} associated bid${bidCount > 1 ? 's' : ''}`;
    }

    // Delete the tender
    await client.query('DELETE FROM tenders WHERE id = $1', [req.params.id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: message,
      deletedBidsCount: bidCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting tender:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete tender' 
    });
  } finally {
    client.release();
  }
});

// GET /api/admin/bids - Get all bids with filters
router.get('/bids', async (req, res) => {
  try {
    const { status, tender_id, vendor_id, page = 1, limit = 50 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (tender_id) filters.tender_id = tender_id;
    if (vendor_id) filters.vendor_id = vendor_id;
    
    filters.limit = parseInt(limit);
    filters.offset = (page - 1) * limit;

    let bids = await Bid.findAll(filters);
    
    // Enrich bids with attachment information from file_uploads table
    const { fileUploadService } = require('../services/fileUploadService');
    
    for (let bid of bids) {
      try {
        const documents = await fileUploadService.getFilesByEntity('bid', bid.id);
        const fileUploadAttachments = documents.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          originalName: doc.original_name,
          name: doc.original_name,
          size: doc.size,
          type: doc.mimetype,
          url: `/api/upload/view/${doc.filename}`,
          downloadUrl: `/api/upload/download/${doc.filename}`,
          uploadedAt: doc.created_at
        }));
        
        // Merge with existing attachments
        const bidAttachments = Array.isArray(bid.attachments) ? bid.attachments : [];
        const allAttachmentsMap = new Map();
        
        bidAttachments.forEach(att => {
          if (att.filename) {
            allAttachmentsMap.set(att.filename, att);
          }
        });
        
        fileUploadAttachments.forEach(att => {
          allAttachmentsMap.set(att.filename, att);
        });
        
        bid.attachments = Array.from(allAttachmentsMap.values());
        
        // Debug logging for attachment structure
        if (bid.attachments.length > 0) {
          console.log(`=== Bid ${bid.id} Attachments Debug ===`);
          console.log('Total attachments:', bid.attachments.length);
          bid.attachments.forEach((att, index) => {
            console.log(`Attachment ${index + 1}:`, {
              filename: att.filename,
              originalName: att.originalName,
              name: att.name,
              url: att.url,
              downloadUrl: att.downloadUrl,
              size: att.size,
              type: att.type
            });
          });
        }
        
      } catch (error) {
        console.error(`Error loading attachments for bid ${bid.id}:`, error);
        // Keep existing attachments if error occurs
        if (!Array.isArray(bid.attachments)) {
          bid.attachments = [];
        }
      }
    }
    
    res.json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bids' 
    });
  }
});

// GET /api/admin/bids/:id - Get specific bid details
router.get('/bids/:id', async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bid not found' 
      });
    }
    
    // Enrich bid with attachment information from file_uploads table
    const { fileUploadService } = require('../services/fileUploadService');
    
    try {
      const documents = await fileUploadService.getFilesByEntity('bid', bid.id);
      const fileUploadAttachments = documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        originalName: doc.original_name,
        name: doc.original_name,
        size: doc.size,
        type: doc.mimetype,
        url: `/api/upload/view/${doc.filename}`,
        downloadUrl: `/api/upload/download/${doc.filename}`,
        uploadedAt: doc.created_at
      }));
      
      // Merge with existing attachments
      const bidAttachments = Array.isArray(bid.attachments) ? bid.attachments : [];
      const allAttachmentsMap = new Map();
      
      bidAttachments.forEach(att => {
        if (att.filename) {
          allAttachmentsMap.set(att.filename, att);
        }
      });
      
      fileUploadAttachments.forEach(att => {
        allAttachmentsMap.set(att.filename, att);
      });
      
      bid.attachments = Array.from(allAttachmentsMap.values());
    } catch (error) {
      console.error(`Error loading attachments for bid ${bid.id}:`, error);
      // Keep existing attachments if error occurs
      if (!Array.isArray(bid.attachments)) {
        bid.attachments = [];
      }
    }
    
    res.json(bid);
  } catch (error) {
    console.error('Error fetching bid:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bid' 
    });
  }
});

// POST /api/admin/bids/:id/accept - Accept a bid
router.post('/bids/:id/accept', async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bid not found' 
      });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending bids can be accepted' 
      });
    }

    const acceptedBid = await Bid.acceptBid(req.params.id);
    res.json({
      success: true,
      message: 'Bid accepted successfully',
      data: acceptedBid
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to accept bid' 
    });
  }
});

// POST /api/admin/bids/:id/reject - Reject a bid
router.post('/bids/:id/reject', async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bid not found' 
      });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending bids can be rejected' 
      });
    }

    await bid.update({ 
      status: 'rejected',
      rejection_reason: req.body.reason || 'Rejected by admin'
    });

    res.json({
      success: true,
      message: 'Bid rejected successfully',
      data: bid
    });
  } catch (error) {
    console.error('Error rejecting bid:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject bid' 
    });
  }
});

// GET /api/admin/analytics - Get platform analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const daysAgo = parseInt(period);

    // Get user registration trends
    const userTrends = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${daysAgo} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Get tender creation trends
    const tenderTrends = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as tenders,
        SUM(budget_max) as total_value
      FROM tenders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${daysAgo} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Get bidding activity
    const bidTrends = await query(`
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as bids,
        AVG(amount) as avg_bid,
        SUM(amount) as total_value
      FROM bids 
      WHERE submitted_at >= CURRENT_DATE - INTERVAL '${daysAgo} days'
      GROUP BY DATE(submitted_at)
      ORDER BY date
    `);

    // Category performance
    const categoryStats = await query(`
      SELECT 
        c.name as category,
        COUNT(t.id) as tender_count,
        COUNT(b.id) as bid_count,
        AVG(b.amount) as avg_bid
      FROM categories c
      LEFT JOIN tenders t ON c.id = t.category_id
      LEFT JOIN bids b ON t.id = b.tender_id
      WHERE t.created_at >= CURRENT_DATE - INTERVAL '${daysAgo} days'
      GROUP BY c.id, c.name
      ORDER BY tender_count DESC
    `);

    res.json({
      period: daysAgo,
      userTrends: userTrends.rows,
      tenderTrends: tenderTrends.rows,
      bidTrends: bidTrends.rows,
      categoryStats: categoryStats.rows
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics' 
    });
  }
});

// POST /api/admin/system/backup - Create system backup
router.post('/system/backup', async (req, res) => {
  try {
    // This is a placeholder for backup functionality
    // In a real implementation, you would create database backups here
    res.json({
      success: true,
      message: 'Backup initiated',
      backup_id: `backup_${Date.now()}`
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create backup' 
    });
  }
});

// GET /api/admin/system/logs - Get system logs (placeholder)
router.get('/system/logs', async (req, res) => {
  try {
    // This is a placeholder for system logs
    const logs = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'System running normally',
        source: 'system'
      },
      {
        timestamp: new Date(Date.now() - 3600000),
        level: 'info',
        message: 'New tender created',
        source: 'tender'
      },
      {
        timestamp: new Date(Date.now() - 7200000),
        level: 'warning',
        message: 'High bid activity detected',
        source: 'bid'
      }
    ];
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch system logs' 
    });
  }
});

// GET /api/admin/health/pool - Get detailed pool health information
router.get('/health/pool', async (req, res) => {
  try {
    const testResult = await dbHealthCheck.testConnection();
    const poolHealth = dbHealthCheck.isPoolHealthy();
    const poolStatus = dbHealthCheck.getPoolStatus();
    
    res.json({
      success: true,
      data: {
        connection: testResult,
        pool: {
          healthy: poolHealth.healthy,
          status: poolStatus,
          utilization: poolHealth.utilizationRate,
          warnings: poolHealth.warnings
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking pool health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check pool health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/health/pool/cleanup - Force pool cleanup
router.post('/health/pool/cleanup', async (req, res) => {
  try {
    const statusBefore = dbHealthCheck.getPoolStatus();
    await dbHealthCheck.forceCleanup();
    const statusAfter = dbHealthCheck.getPoolStatus();
    
    res.json({
      success: true,
      message: 'Pool cleanup completed successfully',
      data: {
        before: statusBefore,
        after: statusAfter,
        connectionsReleased: statusBefore.totalCount - statusAfter.totalCount
      }
    });
  } catch (error) {
    console.error('Error during pool cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Pool cleanup failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/health/monitor - Start/stop pool monitoring
router.post('/health/monitor', async (req, res) => {
  try {
    const { action, interval = 30000 } = req.body;
    
    if (action === 'start') {
      dbHealthCheck.startMonitoring(interval);
      res.json({
        success: true,
        message: `Pool monitoring started with ${interval}ms interval`
      });
    } else if (action === 'stop') {
      dbHealthCheck.stopMonitoring();
      res.json({
        success: true,
        message: 'Pool monitoring stopped'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid action. Use "start" or "stop"'
      });
    }
  } catch (error) {
    console.error('Error managing pool monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage pool monitoring',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/health/database - Comprehensive database health check
router.get('/health/database', databaseMiddleware.healthCheck);

// GET /api/admin/credentials/expiring - Get users with expiring credentials
router.get('/credentials/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const expiringUsers = await User.findUsersWithExpiringCredentials(parseInt(days));
    
    // Add credential status to each user
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
        daysFilter: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Error fetching users with expiring credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users with expiring credentials'
    });
  }
});

// POST /api/admin/credentials/extend/:userId - Extend user credentials
router.post('/credentials/extend/:userId', async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newExpiryDate = await targetUser.extendCredentials();
    
    console.log(`Credentials extended for user ${targetUser.email} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'Credentials extended successfully',
      data: {
        newExpiryDate,
        extendedUser: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username,
          credentialStatus: targetUser.getCredentialStatus()
        }
      }
    });
  } catch (error) {
    console.error('Error extending user credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend user credentials'
    });
  }
});

// POST /api/admin/credentials/bulk-extend - Bulk extend credentials
router.post('/credentials/bulk-extend', async (req, res) => {
  try {
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

    console.log(`Bulk credential extension completed by admin ${req.user.email}. Success: ${results.length}, Errors: ${errors.length}`);

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
    console.error('Error in bulk credential extension:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk credential extension'
    });
  }
});

// POST /api/admin/credentials/send-notifications - Send expiry notifications
router.post('/credentials/send-notifications', async (req, res) => {
  try {
    const { days = 30, dryRun = false } = req.body;
    
    const expiringUsers = await User.findUsersWithExpiringCredentials(parseInt(days));
    
    if (expiringUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No users with expiring credentials found',
        data: {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0
        }
      });
    }
    
    if (dryRun) {
      const usersPreview = expiringUsers.map(user => ({
        email: user.email,
        daysUntilExpiry: user.getDaysUntilExpiry(),
        status: user.getCredentialStatus().status
      }));
      
      return res.json({
        success: true,
        message: `Dry run: Found ${expiringUsers.length} users with expiring credentials`,
        data: {
          preview: usersPreview,
          totalUsers: expiringUsers.length
        }
      });
    }
    
    // Send actual notifications
    const emailService = require('../services/emailService');
    const results = await emailService.sendBulkCredentialExpiryNotifications(expiringUsers);
    
    console.log(`Credential expiry notifications sent by admin ${req.user.email}. Success: ${results.successCount}, Errors: ${results.errorCount}`);
    
    res.json({
      success: true,
      message: `Notification process completed. ${results.successCount} notifications sent.`,
      data: results
    });
  } catch (error) {
    console.error('Error sending credential expiry notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send credential expiry notifications'
    });
  }
});

module.exports = router;
