const express = require('express');
const { body } = require('express-validator');
const {
  getTenders,
  getTender,
  createTender,
  updateTender,
  deleteTender,
  getTenderBids,
  getTenderStats
} = require('../controllers/tenderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
// GET /api/tenders/public - Get public active tenders
router.get('/public', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category_id,
      budget_min,
      budget_max,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      status: 'open', // Only show open tenders publicly
      ...(category_id && { category_id: parseInt(category_id) }),
      ...(budget_min && { budget_min: parseFloat(budget_min) }),
      ...(budget_max && { budget_max: parseFloat(budget_max) }),
      ...(search && { search })
    };

    const Tender = require('../models/Tender');
    const tenders = await Tender.findAll(filters);
    const totalCount = await Tender.getCount(filters);
    
    // Filter out expired tenders from results
    const now = new Date();
    const activeTenders = tenders.filter(tender => {
      // Show tender if no deadline is set, or if deadline is in the future
      return !tender.deadline || new Date(tender.deadline) > now;
    });

    res.json({
      success: true,
      data: {
        tenders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tenders/public/:id - Get single public tender
router.get('/public/:id', async (req, res, next) => {
  try {
    const Tender = require('../models/Tender');
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Only show if tender is open and active
    if (tender.status !== 'open' || new Date(tender.deadline) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Tender is not publicly available'
      });
    }

    res.json({
      success: true,
      data: { tender }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tenders/:id/files - Get tender files (public access for active tenders)
router.get('/:id/files', async (req, res, next) => {
  try {
    const tenderId = req.params.id;
    const Tender = require('../models/Tender');
    const tender = await Tender.findById(tenderId);
    
    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // For public access, only show files for active tenders
    if (tender.status !== 'open' || new Date(tender.deadline) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Tender files are not publicly available'
      });
    }

    // Transform attachments to include necessary metadata
    const files = tender.attachments.map((attachment, index) => {
      // Handle complex attachment structure
      let filename, name, size;
      
      if (attachment.data && attachment.data.filename) {
        filename = attachment.data.filename;
        name = attachment.data.originalName || attachment.name || attachment.data.filename;
        size = attachment.data.size || attachment.size || 0;
      } else {
        filename = attachment.filename || attachment.name || attachment;
        name = attachment.name || attachment.filename || attachment;
        size = attachment.size || 0;
      }
      
      return {
        id: `${tenderId}_${index}`, // Create a pseudo ID using tender ID and index
        filename,
        name,
        size,
        created_at: tender.created_at // Use tender creation date as fallback
      };
    });

    res.json({
      success: true,
      files
    });
  } catch (error) {
    next(error);
  }
});

// Validation rules
const createTenderValidation = [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .notEmpty()
    .trim()
    .withMessage('Description is required'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('budget_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget minimum must be a positive number'),
  body('budget_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget maximum must be a positive number')
    .custom((value, { req }) => {
      if (req.body.budget_min && value < req.body.budget_min) {
        throw new Error('Budget maximum must be greater than minimum');
      }
      return true;
    }),
  body('deadline')
    .isISO8601()
    .withMessage('Valid deadline date is required')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),
  body('requirements')
    .optional()
    .isString()
    .trim(),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

const updateTenderValidation = [
  body('title')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Description cannot be empty'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('budget_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget minimum must be a positive number'),
  body('budget_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget maximum must be a positive number'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Valid deadline date is required')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['draft', 'open', 'closed', 'cancelled'])
    .withMessage('Invalid status'),
  body('requirements')
    .optional()
    .isString()
    .trim(),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

// GET /api/tenders/my-category - Get tenders filtered by user's categories (multi-category support)
router.get('/my-category', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      limit: parseInt(limit),
      offset,
      active_only: true, // Only show active tenders
      ...(search && { search })
    };

    const Tender = require('../models/Tender');

    // Resolve all categories for the current user
    let categories = [];
    try {
      if (typeof req.user.getCategories === 'function') {
        categories = await req.user.getCategories();
      }
    } catch (_) {
      // ignore and fallback below
    }
    if ((!categories || categories.length === 0) && req.user.category) {
      categories = [req.user.category];
    }

    if (!categories || categories.length === 0) {
      return res.json({ success: true, data: { tenders: [], userCategories: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 } } });
    }

    // Fetch tenders matching any of the user's categories
    const tenders = await Tender.findByUserCategories(categories, filters);

    res.json({
      success: true,
      data: {
        tenders,
        userCategories: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tenders.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Routes
router.use(protect); // All routes require authentication

// GET /api/tenders/stats - Get tender statistics
router.get('/stats', getTenderStats);

// GET /api/tenders/my - Get current user's tenders
router.get('/my', getTenders);

// GET /api/tenders - Get all tenders
router.get('/', getTenders);

// POST /api/tenders - Create new tender (buyers and admins only)
router.post('/', authorize('buyer', 'admin'), createTenderValidation, createTender);

// GET /api/tenders/:id - Get single tender
router.get('/:id', getTender);

// PUT /api/tenders/:id - Update tender
router.put('/:id', authorize('buyer', 'admin'), updateTenderValidation, updateTender);

// DELETE /api/tenders/:id - Delete tender
router.delete('/:id', authorize('buyer', 'admin'), deleteTender);

// GET /api/tenders/:id/bids - Get tender bids (tender owner only)
router.get('/:id/bids', authorize('buyer', 'admin'), getTenderBids);

module.exports = router;
