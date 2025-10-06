const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { decryptTenderData, encryptTenderData } = require('../utils/encryption');
const { fileUploadService } = require('../services/fileUploadService');

// Get all tenders with enhanced filtering and sorting
const getTenders = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      status,
      category_id,
      search,
      budget_min,
      budget_max,
      active_only,
      featured_only,
      created_by,
      sort_by,
      sort_order
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      ...(status && { status }),
      ...(category_id && { category_id: parseInt(category_id) }),
      ...(budget_min && { budget_min: parseFloat(budget_min) }),
      ...(budget_max && { budget_max: parseFloat(budget_max) }),
      ...(search && { search }),
      ...(active_only && { active_only: active_only === 'true' }),
      ...(featured_only && { featured_only: featured_only === 'true' }),
      ...(created_by && { created_by: parseInt(created_by) }),
      sort_by,
      sort_order
    };

    // Role-based access control
    if (req.user.role === 'vendor') {
      filters.status = 'open';
      filters.active_only = true;
    } else if (req.user.role === 'buyer') {
      filters.created_by = req.user.id;
    }

    // Get tenders with total count for pagination
    let tenders = await Tender.findAll(filters);
    
    // Decrypt sensitive data for authorized users
    if (req.user.role === 'admin' || req.user.role === 'buyer') {
      tenders = decryptTenderData(tenders);
    }

    // Get total count for pagination
    const countFilters = { ...filters };
    delete countFilters.limit;
    delete countFilters.offset;
    const totalTenders = await Tender.findAll(countFilters);

    res.json({
      success: true,
      data: {
        tenders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalTenders.length,
          totalPages: Math.ceil(totalTenders.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single tender with view tracking
const getTender = async (req, res, next) => {
  try {
    const tender = await Tender.findWithBidsCount(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Role-based access control
    if (req.user.role === 'vendor') {
      if (tender.status !== 'open' || new Date(tender.deadline) < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Tender is not available for bidding'
        });
      }
    } else if (req.user.role === 'buyer' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this tender'
      });
    }

    // Track view
    await trackTenderView(req.params.id, req.user.id, req.ip, req.get('User-Agent'));

    // Decrypt sensitive data for authorized users
    let decryptedTender = tender;
    if (req.user.role === 'admin' || req.user.role === 'buyer' || 
        (req.user.role === 'vendor' && tender.status === 'open')) {
      decryptedTender = decryptTenderData(tender);
    }

    // Get tender documents
    const documents = await fileUploadService.getFilesByEntity('tender', tender.id);

    // Check if current user can bid (for vendors)
    let canBid = false;
    let existingBid = null;
    if (req.user.role === 'vendor') {
      canBid = tender.status === 'open' && new Date(tender.deadline) > new Date();
      existingBid = await Bid.findByTenderAndVendor(tender.id, req.user.id);
    }

    res.json({
      success: true,
      data: {
        tender: decryptedTender,
        documents,
        canBid,
        existingBid: existingBid ? existingBid.id : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create tender with document upload support
const createTender = async (req, res, next) => {
  try {
    const tenderData = {
      ...req.body,
      created_by: req.user.id,
      updated_by: req.user.id
    };

    // Create tender
    const tender = await Tender.create(tenderData);

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      const documentPromises = req.files.map(file =>
        fileUploadService.saveFileInfo(file, req.user.id, 'tender', tender.id)
      );
      await Promise.all(documentPromises);
    }

    // Create notification for relevant users
    if (tender.status === 'open') {
      await createTenderNotifications(tender.id, 'new_tender');
    }

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

// Update tender with enhanced validation
const updateTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tender'
      });
    }

    // Check if tender has bids - restrict certain updates
    const bids = await Bid.findAll({ tender_id: tender.id });
    const hasBids = bids.length > 0;
    
    if (hasBids) {
      const restrictedFields = ['budget_min', 'budget_max', 'estimated_value', 'deadline', 'requirements'];
      const hasRestrictedChanges = restrictedFields.some(field => req.body[field] !== undefined);
      
      if (hasRestrictedChanges && req.user.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify critical tender details after receiving bids'
        });
      }
    }

    // Update tender
    const updateData = {
      ...req.body,
      updated_by: req.user.id
    };

    const updatedTender = await tender.update(updateData);

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      const documentPromises = req.files.map(file =>
        fileUploadService.saveFileInfo(file, req.user.id, 'tender', tender.id)
      );
      await Promise.all(documentPromises);
    }

    // Create notifications for status changes
    if (req.body.status && req.body.status !== tender.status) {
      await createTenderNotifications(tender.id, 'tender_status_changed', {
        old_status: tender.status,
        new_status: req.body.status
      });
    }

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

// Publish tender (change status from draft to open)
const publishTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this tender'
      });
    }

    if (tender.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft tenders can be published'
      });
    }

    // Validate required fields for publishing
    if (!tender.deadline || new Date(tender.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Valid deadline is required for publishing'
      });
    }

    const updatedTender = await tender.update({
      status: 'open',
      published_at: new Date(),
      updated_by: req.user.id
    });

    // Notify vendors about new tender
    await createTenderNotifications(tender.id, 'tender_published');

    logger.info(`Tender published: ${tender.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Tender published successfully',
      data: { tender: updatedTender }
    });
  } catch (error) {
    next(error);
  }
};

// Close tender manually
const closeTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this tender'
      });
    }

    if (tender.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Only open tenders can be closed'
      });
    }

    const updatedTender = await tender.update({
      status: 'closed',
      closing_date: new Date(),
      updated_by: req.user.id
    });

    // Notify bidders
    await createTenderNotifications(tender.id, 'tender_closed');

    logger.info(`Tender closed: ${tender.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Tender closed successfully',
      data: { tender: updatedTender }
    });
  } catch (error) {
    next(error);
  }
};

// Get tender bids with enhanced filtering
const getTenderBids = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view tender bids'
      });
    }

    const { status, sort_by = 'submitted_at', sort_order = 'desc' } = req.query;
    
    const filters = {
      tender_id: tender.id,
      ...(status && { status }),
      sort_by,
      sort_order
    };

    const bids = await Bid.findAll(filters);
    const stats = await Bid.getTenderBidStats(tender.id);

    res.json({
      success: true,
      data: {
        bids,
        stats,
        tender_title: tender.title,
        tender_status: tender.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// Award tender to a specific bid
const awardTender = async (req, res, next) => {
  try {
    const { bidId } = req.body;
    
    const tender = await Tender.findById(req.params.id);
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to award this tender'
      });
    }

    if (tender.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Only closed tenders can be awarded'
      });
    }

    // Award the bid (this also updates tender status to 'awarded')
    const awardedBid = await Bid.acceptBid(bidId);

    // Create notifications
    await createBidNotifications(bidId, 'bid_awarded');

    logger.info(`Tender awarded: ${tender.title} to bid ${bidId} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Tender awarded successfully',
      data: { bid: awardedBid }
    });
  } catch (error) {
    next(error);
  }
};

// Get comprehensive tender statistics
const getTenderStats = async (req, res, next) => {
  try {
    const stats = await Tender.getStats();
    
    // Add user-specific stats
    let userStats = {};
    if (req.user.role === 'buyer') {
      const userTendersResult = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
          COUNT(CASE WHEN status = 'awarded' THEN 1 END) as awarded,
          AVG(view_count) as avg_views
         FROM tenders 
         WHERE created_by = $1`,
        [req.user.id]
      );
      userStats = userTendersResult.rows[0];
    } else if (req.user.role === 'vendor') {
      userStats = await Bid.getVendorStats(req.user.id);
    }

    // Get category statistics
    const categoryStatsResult = await query(`
      SELECT c.name, COUNT(t.id) as tender_count
      FROM categories c
      LEFT JOIN tenders t ON c.id = t.category_id
      GROUP BY c.id, c.name
      ORDER BY tender_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        overall_stats: stats,
        user_stats: userStats,
        category_stats: categoryStatsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tender analytics for buyers
const getTenderAnalytics = async (req, res, next) => {
  try {
    const { tenderId } = req.params;
    
    const tender = await Tender.findById(tenderId);
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view tender analytics'
      });
    }

    // Get view analytics
    const viewAnalyticsResult = await query(`
      SELECT 
        DATE(viewed_at) as view_date,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_viewers
      FROM tender_views 
      WHERE tender_id = $1
      GROUP BY DATE(viewed_at)
      ORDER BY view_date DESC
      LIMIT 30
    `, [tenderId]);

    // Get bid analytics
    const bidAnalyticsResult = await query(`
      SELECT 
        DATE(submitted_at) as bid_date,
        COUNT(*) as bids_submitted,
        MIN(amount) as min_bid,
        MAX(amount) as max_bid,
        AVG(amount) as avg_bid
      FROM bids 
      WHERE tender_id = $1
      GROUP BY DATE(submitted_at)
      ORDER BY bid_date DESC
    `, [tenderId]);

    // Get vendor interest (unique viewers who are vendors)
    const vendorInterestResult = await query(`
      SELECT COUNT(DISTINCT tv.user_id) as interested_vendors
      FROM tender_views tv
      JOIN users u ON tv.user_id = u.id
      WHERE tv.tender_id = $1 AND u.role = 'vendor'
    `, [tenderId]);

    res.json({
      success: true,
      data: {
        tender_id: tenderId,
        tender_title: tender.title,
        view_analytics: viewAnalyticsResult.rows,
        bid_analytics: bidAnalyticsResult.rows,
        vendor_interest: vendorInterestResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to track tender views
const trackTenderView = async (tenderId, userId, ipAddress, userAgent) => {
  try {
    await query(
      'INSERT INTO tender_views (tender_id, user_id, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
      [tenderId, userId, ipAddress, userAgent]
    );
    
    // Update tender view count
    await query(
      'UPDATE tenders SET view_count = view_count + 1 WHERE id = $1',
      [tenderId]
    );
  } catch (error) {
    console.error('Error tracking tender view:', error);
  }
};

// Helper function to create tender-related notifications
const createTenderNotifications = async (tenderId, type, additionalData = {}) => {
  try {
    const tender = await Tender.findById(tenderId);
    if (!tender) return;

    let notifications = [];

    switch (type) {
      case 'tender_published':
      case 'new_tender':
        // Notify all vendors
        const vendorsResult = await query(
          "SELECT id FROM users WHERE role = 'vendor' AND is_active = true"
        );
        
        notifications = vendorsResult.rows.map(vendor => ({
          user_id: vendor.id,
          type: 'new_tender',
          title: 'New Tender Available',
          message: `A new tender "${tender.title}" is now available for bidding`,
          data: { tender_id: tenderId, tender_title: tender.title }
        }));
        break;

      case 'tender_status_changed':
        // Notify all bidders
        const biddersResult = await query(
          'SELECT DISTINCT vendor_id FROM bids WHERE tender_id = $1',
          [tenderId]
        );
        
        notifications = biddersResult.rows.map(bidder => ({
          user_id: bidder.vendor_id,
          type: 'tender_status_changed',
          title: 'Tender Status Updated',
          message: `Tender "${tender.title}" status changed from ${additionalData.old_status} to ${additionalData.new_status}`,
          data: { tender_id: tenderId, ...additionalData }
        }));
        break;

      case 'tender_closed':
        // Notify all bidders
        const closedBiddersResult = await query(
          'SELECT DISTINCT vendor_id FROM bids WHERE tender_id = $1',
          [tenderId]
        );
        
        notifications = closedBiddersResult.rows.map(bidder => ({
          user_id: bidder.vendor_id,
          type: 'tender_closed',
          title: 'Tender Closed',
          message: `Tender "${tender.title}" has been closed for bidding`,
          data: { tender_id: tenderId, tender_title: tender.title }
        }));
        break;
    }

    // Insert notifications
    for (const notification of notifications) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5)',
        [notification.user_id, notification.type, notification.title, notification.message, JSON.stringify(notification.data)]
      );
    }
  } catch (error) {
    console.error('Error creating tender notifications:', error);
  }
};

// Helper function to create bid-related notifications
const createBidNotifications = async (bidId, type) => {
  try {
    const bid = await Bid.findById(bidId);
    if (!bid) return;

    const notifications = [{
      user_id: bid.vendor_id,
      type: type,
      title: type === 'bid_awarded' ? 'Congratulations! Bid Awarded' : 'Bid Status Update',
      message: type === 'bid_awarded' 
        ? `Your bid for "${bid.tender_title}" has been awarded!`
        : `Your bid status has been updated for "${bid.tender_title}"`,
      data: { bid_id: bidId, tender_id: bid.tender_id, tender_title: bid.tender_title }
    }];

    // Insert notification
    for (const notification of notifications) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5)',
        [notification.user_id, notification.type, notification.title, notification.message, JSON.stringify(notification.data)]
      );
    }
  } catch (error) {
    console.error('Error creating bid notifications:', error);
  }
};

module.exports = {
  getTenders,
  getTender,
  createTender,
  updateTender,
  publishTender,
  closeTender,
  getTenderBids,
  awardTender,
  getTenderStats,
  getTenderAnalytics
};
