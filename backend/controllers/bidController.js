const { validationResult } = require('express-validator');
const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const logger = require('../utils/logger');

// Get all bids
const getBids = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      tender_id,
      status
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      ...(tender_id && { tender_id: parseInt(tender_id) }),
      ...(status && { status })
    };

    // vendors/suppliers can only see their own bids
    if (req.user.role === 'vendor' || req.user.role === 'supplier') {
      filters.vendor_id = req.user.id;
    }

    // Buyers can only see bids for their tenders (handled in controller)
    if (req.user.role === 'buyer') {
      // Get user's tender IDs
      const userTenders = await Tender.findAll({ created_by: req.user.id });
      const tenderIds = userTenders.map(t => t.id);
      
      if (tenderIds.length === 0) {
        return res.json({
          success: true,
          data: {
            bids: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 }
          }
        });
      }

      // Filter bids by user's tenders
      filters.tender_ids = tenderIds;
    }

    const bids = await Bid.findAll(filters);

    res.json({
      success: true,
      data: {
        bids,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: bids.length
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

    // Check access permissions
    const canAccess = req.user.role === 'admin' || 
                     bid.vendor_id === req.user.id ||
                     (req.user.role === 'buyer' && await Tender.findById(bid.tender_id).then(t => t && t.created_by === req.user.id));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this bid'
      });
    }

    res.json({
      success: true,
      data: { bid }
    });
  } catch (error) {
    next(error);
  }
};

// Create bid (vendors only)
const createBid = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { tender_id } = req.body;

    // Check if tender exists and is open
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

    const bidData = {
      tender_id: req.body.tender_id,
      vendor_id: req.user.id,
      amount: req.body.amount,
      proposal: req.body.proposal,
      delivery_timeline: req.body.delivery_timeline,
      attachments: req.body.attachments || []
    };

    const bid = await Bid.create(bidData);
    
    logger.info(`New bid submitted: Tender ${tender_id} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      data: { bid }
    });
  } catch (error) {
    next(error);
  }
};

// Update bid (vendors only, before deadline)
const updateBid = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user owns the bid
    if (bid.vendor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this bid'
      });
    }

    // Check if bid can be modified
    if (bid.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify bid that has been processed'
      });
    }

    // Check tender deadline
    const tender = await Tender.findById(bid.tender_id);
    if (tender && new Date(tender.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify bid after tender deadline'
      });
    }

    const updatedBid = await bid.update(req.body);
    
    logger.info(`Bid updated: ID ${bid.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Bid updated successfully',
      data: { bid: updatedBid }
    });
  } catch (error) {
    next(error);
  }
};

// Delete bid (vendors only, before deadline)
const deleteBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user owns the bid
    if (bid.vendor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this bid'
      });
    }

    // Check if bid can be deleted
    if (bid.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bid that has been processed'
      });
    }

    // Check tender deadline
    const tender = await Tender.findById(bid.tender_id);
    if (tender && new Date(tender.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bid after tender deadline'
      });
    }

    await bid.delete();
    
    logger.info(`Bid deleted: ID ${bid.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Bid deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Accept bid (buyers/admins only)
const acceptBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user owns the tender
    const tender = await Tender.findById(bid.tender_id);
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Associated tender not found'
      });
    }

    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this bid'
      });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bid has already been processed'
      });
    }

    // Accept the bid (this also rejects other bids and closes the tender)
    const acceptedBid = await Bid.acceptBid(bid.id);
    
    logger.info(`Bid accepted: ID ${bid.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Bid accepted successfully',
      data: { bid: acceptedBid }
    });
  } catch (error) {
    next(error);
  }
};

// Reject bid (buyers/admins only)
const rejectBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user owns the tender
    const tender = await Tender.findById(bid.tender_id);
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Associated tender not found'
      });
    }

    if (req.user.role !== 'admin' && tender.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this bid'
      });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bid has already been processed'
      });
    }

    const updatedBid = await bid.update({ status: 'rejected' });
    
    logger.info(`Bid rejected: ID ${bid.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Bid rejected successfully',
      data: { bid: updatedBid }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBids,
  getBid,
  createBid,
  updateBid,
  deleteBid,
  acceptBid,
  rejectBid
};
