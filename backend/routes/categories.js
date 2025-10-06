const express = require('express');
const { protect } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// Get all categories (for tender creation/filtering)
router.get('/', categoryController.getCategories);

module.exports = router;