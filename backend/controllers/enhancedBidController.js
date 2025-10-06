const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { decryptBidData, encryptBidData } = require('../utils/encryption');
const { fileUploadService } = require('../services/fileUploadService');

// Get my bids (vendor specific)
const getMyBids = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      sort_by = 'submitted_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      vendor_id: req.user.id,
      limit: parseInt(limit),
      offset,
      ...(status && { status }),
      sort_by,
      sort_order
    };

    let bids = await Bid.findAll(filters);

    // Decrypt sensitive data
    bids = decryptBidData(bids);

    // Get total count for pagination
    const countFilters = { vendor_id: req.user.id, ...(status && { status }) };
    const totalBids = await Bid.findAll(countFilters);

    res.json({
      success: true,
      data: {
        bids,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBids.length,
          totalPages: Math.ceil(totalBids.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get bids (vendors see their own, buyers/admin see tender-specific)
const getBids = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      tender_id,
      vendor_id,
      status,
      amount_min,
      amount_max,
      sort_by,
      sort_order
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      ...(tender_id && { tender_id: parseInt(tender_id) }),
      ...(vendor_id && { vendor_id: parseInt(vendor_id) }),
      ...(status && { status }),
      ...(amount_min && { amount_min: parseFloat(amount_min) }),
      ...(amount_max && { amount_max: parseFloat(amount_max) }),
      sort_by,
      sort_order
    };

    // Role-based access control
    if (req.user.role === 'vendor' || req.user.role === 'supplier') {
      filters.vendor_id = req.user.id;
    } else if (req.user.role === 'buyer') {
      // Buyers can only see bids for their own tenders
      if (!tender_id) {
        return res.status(400).json({
          success: false,
          message: 'Tender ID is required for buyers'
        });
      }
      
      const tender = await Tender.findById(tender_id);
      if (!tender || tender.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these bids'
        });
      }
    }

    let bids = await Bid.findAll(filters);

    // Decrypt sensitive data for authorized users
    if (req.user.role === 'admin' || req.user.role === 'buyer' || req.user.role === 'vendor') {
      bids = decryptBidData(bids);
    }

    // For admin users, enrich bids with attachment information
    if (req.user.role === 'admin') {
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
        } catch (error) {
          console.error(`Error loading attachments for bid ${bid.id}:`, error);
          // Keep existing attachments if error occurs
        }
      }
    }

    // Get total count for pagination
    const countFilters = { ...filters };
    delete countFilters.limit;
    delete countFilters.offset;
    const totalBids = await Bid.findAll(countFilters);

    res.json({
      success: true,
      data: {
        bids,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBids.length,
          totalPages: Math.ceil(totalBids.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single bid
const getBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization
    if ((req.user.role === 'vendor' || req.user.role === 'supplier') && bid.vendor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this bid'
      });
    } else if (req.user.role === 'buyer') {
      const tender = await Tender.findById(bid.tender_id);
      if (!tender || tender.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this bid'
        });
      }
    }

    // Decrypt sensitive data
    const decryptedBid = decryptBidData(bid);

    // Get bid documents from file_uploads table
    const documents = await fileUploadService.getFilesByEntity('bid', bid.id);

    // Merge attachments from bid.attachments field and file_uploads table
    const bidAttachments = Array.isArray(decryptedBid.attachments) ? decryptedBid.attachments : [];
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

    // Merge and deduplicate attachments (prefer file_uploads table data)
    const allAttachmentsMap = new Map();
    
    // Add bid.attachments first
    bidAttachments.forEach(att => {
      if (att.filename) {
        allAttachmentsMap.set(att.filename, att);
      }
    });
    
    // Add/overwrite with file_uploads data (more reliable)
    fileUploadAttachments.forEach(att => {
      allAttachmentsMap.set(att.filename, att);
    });
    
    const mergedAttachments = Array.from(allAttachmentsMap.values());
    
    // Update the bid object with merged attachments
    decryptedBid.attachments = mergedAttachments;

    // Get bid history for audit trail
    const historyResult = await query(
      'SELECT * FROM bid_history WHERE bid_id = $1 ORDER BY created_at DESC',
      [bid.id]
    );

    res.json({
      success: true,
      data: {
        bid: decryptedBid,
        documents,
        history: historyResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// Submit new bid
const submitBid = async (req, res, next) => {
  try {
    const { tender_id } = req.body;

    // Check if tender exists and is open for bidding
    const tender = await Tender.findById(tender_id);
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    if (tender.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Tender is not open for bidding'
      });
    }

    if (new Date(tender.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Tender deadline has passed'
      });
    }

    // Check if vendor already has a bid for this tender
    const existingBid = await Bid.findByTenderAndVendor(tender_id, req.user.id);
    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a bid for this tender'
      });
    }

    // Validate bid amount against tender budget
    if (tender.budget_max && req.body.amount > tender.budget_max) {
      return res.status(400).json({
        success: false,
        message: 'Bid amount exceeds tender maximum budget'
      });
    }

    if (tender.budget_min && req.body.amount < tender.budget_min) {
      return res.status(400).json({
        success: false,
        message: 'Bid amount is below tender minimum budget'
      });
    }

    // Process attachments if they come as JSON string
    let attachments = req.body.attachments;
    if (typeof attachments === 'string') {
      try {
        attachments = JSON.parse(attachments);
      } catch (error) {
        attachments = [];
      }
    }

    // Create bid
    const bidData = {
      ...req.body,
      attachments,
      vendor_id: req.user.id
    };

    const bid = await Bid.create(bidData);

    // Handle file uploads if present
    let uploadedFileInfo = [];
    if (req.files && req.files.length > 0) {
      const documentPromises = req.files.map(file =>
        fileUploadService.saveFileInfo(file, req.user.id, 'bid', bid.id)
      );
      uploadedFileInfo = await Promise.all(documentPromises);
    }

    // Update bid attachments with uploaded file information
    if (uploadedFileInfo.length > 0) {
      const allAttachments = [...(attachments || []), ...uploadedFileInfo.map(fileInfo => ({
        id: fileInfo.id,
        filename: fileInfo.filename,
        originalName: fileInfo.original_name,
        name: fileInfo.original_name,
        size: fileInfo.size,
        type: fileInfo.mimetype,
        url: `/api/upload/view/${fileInfo.filename}`,
        downloadUrl: `/api/upload/download/${fileInfo.filename}`
      }))];
      
      // Update the bid with complete attachment information
      await bid.update({ attachments: allAttachments });
    }

    // Create audit trail
    await createBidHistory(bid.id, 'submitted', {}, bid, req.user.id);

    // Notify tender owner
    await createBidNotifications(bid.id, tender.created_by, 'new_bid');

    logger.info(`New bid submitted: Tender ${tender_id} by vendor ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      data: { bid }
    });
  } catch (error) {
    logger.error('Bid submission error:', {
      error: error.message,
      stack: error.stack,
      user_id: req.user?.id,
      tender_id: req.body?.tender_id
    });

    // Provide specific error messages based on error type
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please try again later.',
        error_code: 'DB_CONNECTION_ERROR'
      });
    } else if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a bid for this tender.',
        error_code: 'DUPLICATE_BID_ERROR'
      });
    } else if (error.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        message: 'Invalid tender ID or user reference.',
        error_code: 'REFERENCE_ERROR'
      });
    } else if (error.code === '22P02') { // Invalid input syntax
      return res.status(400).json({
        success: false,
        message: 'Invalid data format in bid submission.',
        error_code: 'DATA_FORMAT_ERROR'
      });
    }

    next(error);
  }
};

// Update existing bid (before deadline)
const updateBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization
    if (bid.vendor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this bid'
      });
    }

    // Check if bid can be updated
    if (bid.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update bid that has been processed'
      });
    }

    // Check tender status and deadline
    const tender = await Tender.findById(bid.tender_id);
    if (tender.status !== 'open' || new Date(tender.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update bid after tender deadline or closure'
      });
    }

    // Process attachments if they come as JSON string
    let attachments = req.body.attachments;
    if (typeof attachments === 'string') {
      try {
        attachments = JSON.parse(attachments);
      } catch (error) {
        attachments = bid.attachments; // Keep existing attachments if parsing fails
      }
    }

    // Store old values for audit trail
    const oldBid = { ...bid };

    // Update bid
    const updateData = {
      ...req.body,
      attachments
    };
    const updatedBid = await bid.update(updateData);

    // Handle file uploads if present
    let uploadedFileInfo = [];
    if (req.files && req.files.length > 0) {
      const documentPromises = req.files.map(file =>
        fileUploadService.saveFileInfo(file, req.user.id, 'bid', bid.id)
      );
      uploadedFileInfo = await Promise.all(documentPromises);
    }

    // Update bid attachments with new uploaded file information
    if (uploadedFileInfo.length > 0) {
      const allAttachments = [...(attachments || []), ...uploadedFileInfo.map(fileInfo => ({
        id: fileInfo.id,
        filename: fileInfo.filename,
        originalName: fileInfo.original_name,
        name: fileInfo.original_name,
        size: fileInfo.size,
        type: fileInfo.mimetype,
        url: `/api/upload/view/${fileInfo.filename}`,
        downloadUrl: `/api/upload/download/${fileInfo.filename}`
      }))];
      
      // Update the bid with complete attachment information
      await updatedBid.update({ attachments: allAttachments });
    }

    // Create audit trail
    await createBidHistory(bid.id, 'updated', oldBid, updatedBid, req.user.id);

    logger.info(`Bid updated: ID ${bid.id} by vendor ${req.user.id}`);

    res.json({
      success: true,
      message: 'Bid updated successfully',
      data: { bid: updatedBid }
    });
  } catch (error) {
    next(error);
  }
};

// Withdraw bid
const withdrawBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization
    if (bid.vendor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this bid'
      });
    }

    // Check if bid can be withdrawn
    if (bid.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw bid that has been processed'
      });
    }

    // Check tender status
    const tender = await Tender.findById(bid.tender_id);
    if (tender.status === 'closed' || tender.status === 'awarded') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw bid from closed or awarded tender'
      });
    }

    // Update bid status to withdrawn
    const withdrawnBid = await bid.update({
      status: 'withdrawn'
    });

    // Create audit trail
    await createBidHistory(bid.id, 'withdrawn', bid, withdrawnBid, req.user.id, req.body.reason);

    logger.info(`Bid withdrawn: ID ${bid.id} by vendor ${req.user.id}`);

    res.json({
      success: true,
      message: 'Bid withdrawn successfully',
      data: { bid: withdrawnBid }
    });
  } catch (error) {
    next(error);
  }
};

// Evaluate bid (buyers/admin only)
const evaluateBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      const tender = await Tender.findById(bid.tender_id);
      if (!tender || tender.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to evaluate this bid'
        });
      }
    }

    // Store old values for audit trail
    const oldBid = { ...bid };

    // Update bid evaluation
    const evaluationData = {
      ...req.body,
      evaluated_at: new Date(),
      evaluated_by: req.user.id
    };

    const evaluatedBid = await bid.update(evaluationData);

    // Create audit trail
    await createBidHistory(
      bid.id, 
      'evaluated', 
      oldBid, 
      evaluatedBid, 
      req.user.id,
      `Bid ${req.body.status}: ${req.body.evaluation_notes || req.body.rejection_reason || 'No notes provided'}`
    );

    // Notify vendor
    await createBidNotifications(bid.id, bid.vendor_id, 'bid_evaluated');

    logger.info(`Bid evaluated: ID ${bid.id} - Status: ${req.body.status} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Bid evaluated successfully',
      data: { bid: evaluatedBid }
    });
  } catch (error) {
    next(error);
  }
};

// Award bid (buyers/admin only) - same as acceptBid but with additional checks
const awardBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      const tender = await Tender.findById(bid.tender_id);
      if (!tender || tender.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to award this bid'
        });
      }
    }

    // Check tender status
    const tender = await Tender.findById(bid.tender_id);
    if (tender.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Only closed tenders can have bids awarded'
      });
    }

    // Award the bid (this also updates other bids to rejected and tender to awarded)
    const awardedBid = await Bid.acceptBid(bid.id);

    // Create audit trail for this bid
    await createBidHistory(bid.id, 'awarded', bid, awardedBid, req.user.id, 'Bid awarded');

    // Notify all relevant parties
    await createTenderAwardNotifications(tender.id, bid.id);

    logger.info(`Bid awarded: ID ${bid.id} for tender ${tender.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Bid awarded successfully',
      data: { bid: awardedBid }
    });
  } catch (error) {
    next(error);
  }
};

// Get bid statistics for vendors
const getBidStats = async (req, res, next) => {
  try {
    let vendorId = req.user.id;
    
    // Admin can view stats for any vendor
    if (req.user.role === 'admin' && req.query.vendor_id) {
      vendorId = parseInt(req.query.vendor_id);
    } else if (req.user.role !== 'vendor' && req.user.role !== 'supplier') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors/suppliers can view bid statistics'
      });
    }

    const stats = await Bid.getVendorStats(vendorId);

    // Get monthly bid performance
    const monthlyStatsResult = await query(`
      SELECT 
        DATE_TRUNC('month', submitted_at) as month,
        COUNT(*) as total_bids,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as won_bids,
        AVG(amount) as avg_bid_amount
      FROM bids 
      WHERE vendor_id = $1
      GROUP BY DATE_TRUNC('month', submitted_at)
      ORDER BY month DESC
      LIMIT 12
    `, [vendorId]);

    // Get category performance
    const categoryStatsResult = await query(`
      SELECT 
        c.name as category,
        COUNT(b.id) as bid_count,
        COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as won_count,
        AVG(b.amount) as avg_amount
      FROM bids b
      JOIN tenders t ON b.tender_id = t.id
      JOIN categories c ON t.category_id = c.id
      WHERE b.vendor_id = $1
      GROUP BY c.id, c.name
      ORDER BY bid_count DESC
    `, [vendorId]);

    res.json({
      success: true,
      data: {
        overall_stats: stats,
        monthly_performance: monthlyStatsResult.rows,
        category_performance: categoryStatsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// Check if vendor can bid on tender
const checkBidEligibility = async (req, res, next) => {
  try {
    const { tenderId } = req.params;
    
    const tender = await Tender.findById(tenderId);
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Basic eligibility checks
    const isOpen = tender.status === 'open';
    const isActive = new Date(tender.deadline) > new Date();
    const existingBid = await Bid.findByTenderAndVendor(tenderId, req.user.id);
    
    // Additional checks could include:
    // - vendor qualifications
    // - Blacklist status
    // - Category restrictions
    // - Geographic restrictions

    const eligibility = {
      canBid: isOpen && isActive && !existingBid,
      reasons: [],
      tender_status: tender.status,
      deadline: tender.deadline,
      has_existing_bid: !!existingBid,
      existing_bid_id: existingBid ? existingBid.id : null
    };

    if (!isOpen) {
      eligibility.reasons.push('Tender is not open for bidding');
    }
    
    if (!isActive) {
      eligibility.reasons.push('Tender deadline has passed');
    }
    
    if (existingBid) {
      eligibility.reasons.push('You have already submitted a bid for this tender');
    }

    res.json({
      success: true,
      data: eligibility
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create bid history entries
const createBidHistory = async (bidId, action, oldValues, newValues, performedBy, notes = null) => {
  try {
    await query(
      'INSERT INTO bid_history (bid_id, action, old_values, new_values, performed_by, notes) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        bidId,
        action,
        JSON.stringify(oldValues),
        JSON.stringify(newValues),
        performedBy,
        notes
      ]
    );
  } catch (error) {
    console.error('Error creating bid history:', error);
  }
};

// Helper function to create bid notifications
const createBidNotifications = async (bidId, userId, type) => {
  try {
    const bid = await Bid.findById(bidId);
    if (!bid) return;

    let title, message;
    
    switch (type) {
      case 'new_bid':
        title = 'New Bid Received';
        message = `A new bid has been submitted for your tender "${bid.tender_title}"`;
        break;
      case 'bid_evaluated':
        title = 'Bid Evaluated';
        message = `Your bid for "${bid.tender_title}" has been evaluated`;
        break;
      case 'bid_awarded':
        title = 'Congratulations! Bid Awarded';
        message = `Your bid for "${bid.tender_title}" has been awarded!`;
        break;
      default:
        return;
    }

    await query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5)',
      [
        userId,
        type,
        title,
        message,
        JSON.stringify({
          bid_id: bidId,
          tender_id: bid.tender_id,
          tender_title: bid.tender_title
        })
      ]
    );
  } catch (error) {
    console.error('Error creating bid notifications:', error);
  }
};

// Helper function to create tender award notifications
const createTenderAwardNotifications = async (tenderId, awardedBidId) => {
  try {
    const tender = await Tender.findById(tenderId);
    const awardedBid = await Bid.findById(awardedBidId);
    
    if (!tender || !awardedBid) return;

    // Get all bidders for this tender
    const biddersResult = await query(
      'SELECT id, vendor_id FROM bids WHERE tender_id = $1',
      [tenderId]
    );

    for (const bidder of biddersResult.rows) {
      const isWinner = bidder.id === awardedBidId;
      
      await query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5)',
        [
          bidder.vendor_id,
          isWinner ? 'bid_awarded' : 'bid_not_selected',
          isWinner ? 'Congratulations! Your bid was selected' : 'Tender Award Notification',
          isWinner 
            ? `Your bid for "${tender.title}" has been awarded!`
            : `The tender "${tender.title}" has been awarded to another bidder`,
          JSON.stringify({
            bid_id: bidder.id,
            tender_id: tenderId,
            tender_title: tender.title,
            awarded: isWinner
          })
        ]
      );
    }
  } catch (error) {
    console.error('Error creating tender award notifications:', error);
  }
};

module.exports = {
  getBids,
  getMyBids,
  getBid,
  submitBid,
  updateBid,
  withdrawBid,
  evaluateBid,
  awardBid,
  getBidStats,
  checkBidEligibility
};
