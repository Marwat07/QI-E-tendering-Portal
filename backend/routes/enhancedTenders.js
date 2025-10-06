const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/enhancedTenderController');

const { protect, authorize } = require('../middleware/auth');
const { handleFileUpload } = require('../services/fileUploadService');
const { 
  validate, 
  validateQuery, 
  validateParams,
  tenderSchemas,
  paramSchemas 
} = require('../validators/schemas');

// Apply authentication to all routes
router.use(protect);

// GET /api/tenders - Get tenders with filtering, sorting, and pagination
router.get(
  '/',
  validateQuery(tenderSchemas.query),
  getTenders
);

// GET /api/tenders/stats - Get tender statistics
router.get('/stats', getTenderStats);

// GET /api/tenders/:id - Get single tender details
router.get(
  '/:id',
  validateParams(paramSchemas.id),
  getTender
);

// POST /api/tenders - Create new tender (buyers and admins only)
router.post(
  '/',
  authorize('buyer', 'admin'),
  handleFileUpload({
    fieldName: 'documents',
    maxCount: 10,
    destination: 'tenders',
    entityType: 'tender'
  }),
  validate(tenderSchemas.create),
  createTender
);

// PUT /api/tenders/:id - Update tender
router.put(
  '/:id',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  handleFileUpload({
    fieldName: 'documents',
    maxCount: 10,
    destination: 'tenders',
    entityType: 'tender'
  }),
  validate(tenderSchemas.update),
  updateTender
);

// POST /api/tenders/:id/publish - Publish tender (change status from draft to open)
router.post(
  '/:id/publish',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  publishTender
);

// POST /api/tenders/:id/close - Close tender manually
router.post(
  '/:id/close',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  closeTender
);

// GET /api/tenders/:id/bids - Get bids for a tender (tender owner only)
router.get(
  '/:id/bids',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  getTenderBids
);

// POST /api/tenders/:id/award - Award tender to a specific bid
router.post(
  '/:id/award',
  authorize('buyer', 'admin'),
  validateParams(paramSchemas.id),
  validate(require('joi').object({
    bidId: require('joi').number().integer().positive().required()
  })),
  awardTender
);

// GET /api/tenders/:tenderId/analytics - Get tender analytics (buyers/admin only)
router.get(
  '/:tenderId/analytics',
  authorize('buyer', 'admin'),
  validateParams(require('joi').object({
    tenderId: require('joi').number().integer().positive().required()
  })),
  getTenderAnalytics
);

module.exports = router;
