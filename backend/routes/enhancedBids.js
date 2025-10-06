const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/enhancedBidController');

const { protect, authorize } = require('../middleware/auth');
const { handleFileUpload } = require('../services/fileUploadService');
const { 
  validate, 
  validateQuery, 
  validateParams,
  bidSchemas,
  paramSchemas 
} = require('../validators/schemas');

// Apply authentication to all routes
router.use(protect);

// GET /api/bids/my - Get my bids (vendor only)
router.get(
  '/my',
  authorize('vendor', 'supplier'),
  getMyBids
);

// GET /api/bids - Get bids with filtering and pagination
router.get(
  '/',
  validateQuery(bidSchemas.query),
  getBids
);

// GET /api/bids/stats - Get bid statistics (vendors/suppliers only)
router.get(
  '/stats',
  authorize('vendor', 'supplier', 'admin'),
  getBidStats
);

// GET /api/bids/:id - Get single bid details
router.get(
  '/:id',
  validateParams(paramSchemas.id),
  getBid
);

// POST /api/bids - Submit new bid (vendors/suppliers only)
router.post(
  '/',
  authorize('vendor', 'supplier'),
  handleFileUpload({
    fieldName: 'documents',
    maxCount: 10,
    destination: 'bids',
    entityType: 'bid'
  }),
  validate(bidSchemas.create),
  submitBid
);

// PUT /api/bids/:id - Update existing bid (vendors/suppliers only, before deadline)
router.put(
  '/:id',
  authorize('vendor', 'supplier'),
  validateParams(paramSchemas.id),
  handleFileUpload({
    fieldName: 'documents',
    maxCount: 10,
    destination: 'bids',
    entityType: 'bid'
  }),
  validate(bidSchemas.update),
  updateBid
);

// POST /api/bids/:id/withdraw - Withdraw bid (vendors/suppliers only)
router.post(
  '/:id/withdraw',
  authorize('vendor', 'supplier'),
  validateParams(paramSchemas.id),
  validate(require('joi').object({
    reason: require('joi').string().max(500).optional()
  })),
  withdrawBid
);

// PUT /api/bids/:id/evaluate - Evaluate bid (buyers/admin only)
router.put(
  '/:id/evaluate',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  validate(bidSchemas.evaluate),
  evaluateBid
);

// POST /api/bids/:id/award - Award bid (buyers/admin only)
router.post(
  '/:id/award',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  awardBid
);

// GET /api/bids/eligibility/:tenderId - Check if vendor can bid on tender
router.get(
  '/eligibility/:tenderId',
  authorize('vendor', 'supplier'),
  validateParams(require('joi').object({
    tenderId: require('joi').number().integer().positive().required()
  })),
  checkBidEligibility
);

module.exports = router;
