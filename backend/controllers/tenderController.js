const { validationResult } = require('express-validator');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const logger = require('../utils/logger');

// Get all tenders
const getTenders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category_id,
      budget_min,
      budget_max,
      search,
      active_only,
      sort_by = 'created_at',
      sort_direction = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      sort_by,
      sort_direction,
      ...(status && { status }),
      ...(category_id && { category_id: parseInt(category_id) }),
      ...(budget_min && { budget_min: parseFloat(budget_min) }),
      ...(budget_max && { budget_max: parseFloat(budget_max) }),
      ...(search && { search }),
      ...(active_only === 'true' && { active_only: true })
    };

    // If user is not admin/buyer, only show open tenders
    if (req.user && (req.user.role === 'vendor' || req.user.role === 'supplier')) {
      filters.status = 'open';
      filters.active_only = true;
    }

    // If user is buyer, show only their own tenders
    if (req.user && req.user.role === 'buyer') {
      filters.created_by = req.user.id;
    }

    const tenders = await Tender.findAll(filters);
    const total = await Tender.getCount(filters);
    
    // Add recent activity flags
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const tendersWithActivity = tenders.map(tender => {
      const createdAt = new Date(tender.created_at);
      const updatedAt = new Date(tender.updated_at || tender.created_at);
      
      return {
        ...tender,
        is_new: createdAt > oneDayAgo,
        is_recent: createdAt > threeDaysAgo,
        is_recently_updated: updatedAt > createdAt && updatedAt > oneDayAgo,
        activity_status: createdAt > oneDayAgo ? 'new' : 
                        (updatedAt > createdAt && updatedAt > oneDayAgo) ? 'updated' : 
                        createdAt > oneWeekAgo ? 'recent' : 'normal'
      };
    });

    res.json({
      success: true,
      data: {
        tenders: tendersWithActivity,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        },
        activity_summary: {
          new_tenders: tendersWithActivity.filter(t => t.is_new).length,
          recent_tenders: tendersWithActivity.filter(t => t.is_recent).length,
          updated_tenders: tendersWithActivity.filter(t => t.is_recently_updated).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single tender
const getTender = async (req, res, next) => {
  try {
    console.log('Regular tender endpoint - fetching tender with ID:', req.params.id);
    
    const tender = await Tender.findWithBidsCount(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }
    
    // Debug log the tender details including categories
    console.log('Regular tender endpoint - fetched tender details:', {
      id: tender.id,
      title: tender.title,
      categories: tender.categories,
      display_category: tender.display_category,
      category_name: tender.category_name,
      category_id: tender.category_id,
      user_role: req.user?.role
    });

    // If user is vendor/supplier, check if tender is accessible
    if (req.user.role === 'vendor' || req.user.role === 'supplier') {
      if (tender.status !== 'open' || new Date(tender.deadline) < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Tender is not available for bidding'
        });
      }
    }

    res.json({
      success: true,
      data: { tender }
    });
  } catch (error) {
    next(error);
  }
};

// Create tender (buyers only)
const createTender = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tenderData = {
      ...req.body,
      created_by: req.user.id
    };

    // Handle category mapping from frontend strings to backend format
    if (req.body.category && !req.body.category_id && !req.body.categories) {
      // Map UI-friendly labels to both enum value and canonical display name used in categories table
      const categoryMapping = {
        // Map UI labels to both enum (legacy multi-category) and to actual DB category names
        'Construction & Infrastructure': { enum: 'construction', name: 'Construction & Infrastructure' },
        'Information Technology': { enum: 'electronics', name: 'IT & Software Services' },
        'Healthcare & Medical': { enum: 'pharmaceuticals', name: 'Pharmaceuticals' },
        'Transportation & Logistics': { enum: 'automotive', name: 'Transportation & Logistics' },
        'Professional Services': { enum: 'electronics', name: 'Professional Services' },
        'Supplies & Equipment': { enum: 'machinery', name: 'Office Supplies & Equipment' },
        'Energy & Utilities': { enum: 'chemicals', name: 'Chemicals' },
        'Education & Training': { enum: 'electronics', name: 'Consulting' },
        'Other': { enum: 'other', name: 'Other' },
        'IT Services': { enum: 'electronics', name: 'IT Services' },
        'Construction': { enum: 'construction', name: 'Construction' },
        'Consulting': { enum: 'electronics', name: 'Consulting' },
        'Equipment': { enum: 'machinery', name: 'Equipment' },
        'Maintenance': { enum: 'machinery', name: 'Maintenance' },
        'Supplies': { enum: 'machinery', name: 'Supplies' }
      };
      
      const mapped = categoryMapping[req.body.category];
      const mappedEnum = mapped?.enum || 'electronics';
      const mappedDisplayName = mapped?.name || req.body.category;
      
      tenderData.categories = [mappedEnum];
      
      // Also try to find matching category_id from categories table using the mapped display name
      const { query } = require('../config/database');
      try {
        const categoryResult = await query(
          'SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1',
          [mappedDisplayName]
        );
        if (categoryResult.rows.length > 0) {
          tenderData.category_id = categoryResult.rows[0].id;
        }
      } catch (dbError) {
        console.log('Could not find matching category_id:', dbError.message);
      }
    }

    const tender = await Tender.create(tenderData);
    
    logger.info(`New tender created: ${tender.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Tender created successfully',
      data: { tender }
    });
  } catch (error) {
    next(error);
  }
};

// Update tender
const updateTender = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check if user owns the tender or is admin
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tender'
      });
    }

    // Don't allow updates if tender has bids (except status changes)
    const bids = await Bid.findAll({ tender_id: tender.id });
    if (bids.length > 0 && req.body.status === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify tender that has received bids'
      });
    }

    const updatedTender = await tender.update(req.body);
    
    logger.info(`Tender updated: ${tender.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Tender updated successfully',
      data: { tender: updatedTender }
    });
  } catch (error) {
    next(error);
  }
};

// Delete tender
const deleteTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check if user owns the tender or is admin
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tender'
      });
    }

    // Don't allow deletion if tender has bids
    const bids = await Bid.findAll({ tender_id: tender.id });
    if (bids.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tender that has received bids'
      });
    }

    await tender.delete();
    
    logger.info(`Tender deleted: ${tender.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Tender deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get tender bids (tender owner only)
const getTenderBids = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check if user owns the tender or is admin
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view tender bids'
      });
    }

    const bids = await Bid.findAll({ tender_id: tender.id });
    const stats = await Bid.getTenderBidStats(tender.id);

    res.json({
      success: true,
      data: {
        bids,
        stats,
        tender_title: tender.title
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tender statistics
const getTenderStats = async (req, res, next) => {
  try {
    const stats = await Tender.getStats();
    
    // Add user-specific stats
    let userStats = {};
    if (req.user.role === 'buyer') {
      const userTenders = await Tender.findAll({ created_by: req.user.id });
      userStats.my_tenders = userTenders.length;
    } else if (req.user.role === 'vendor' || req.user.role === 'supplier') {
      const vendorBidStats = await Bid.getVendorStats(req.user.id);
      userStats = vendorBidStats;
    }

    res.json({
      success: true,
      data: {
        overall_stats: stats,
        user_stats: userStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTenders,
  getTender,
  createTender,
  updateTender,
  deleteTender,
  getTenderBids,
  getTenderStats
};
