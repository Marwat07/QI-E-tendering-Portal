const express = require('express');
const { body } = require('express-validator');
const {
  getBids,
  getBid,
  createBid,
  updateBid,
  deleteBid,
  acceptBid,
  rejectBid
} = require('../controllers/bidController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createBidValidation = [
  body('tender_id')
    .isInt({ min: 1 })
    .withMessage('Valid tender ID is required'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('proposal')
    .notEmpty()
    .trim()
    .withMessage('Proposal is required'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

const updateBidValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('proposal')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Proposal cannot be empty'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

// Routes
router.use(protect); // All routes require authentication

// GET /api/bids - Get all bids
router.get('/', getBids);

// POST /api/bids - Create new bid (vendors/suppliers only)
router.post('/', authorize('vendor', 'supplier'), createBidValidation, createBid);

// GET /api/bids/:id - Get single bid
router.get('/:id', getBid);

// PUT /api/bids/:id - Update bid (vendors/suppliers only)
router.put('/:id', authorize('vendor', 'supplier'), updateBidValidation, updateBid);

// DELETE /api/bids/:id - Delete bid (vendors/suppliers only)
router.delete('/:id', authorize('vendor', 'supplier'), deleteBid);

// POST /api/bids/:id/accept - Accept bid (buyers/admins only)
router.post('/:id/accept', authorize('buyer', 'admin'), acceptBid);

// POST /api/bids/:id/reject - Reject bid (buyers/admins only)
router.post('/:id/reject', authorize('buyer', 'admin'), rejectBid);

module.exports = router;
