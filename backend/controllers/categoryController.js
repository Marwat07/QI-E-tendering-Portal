const { query } = require('../config/database');
const logger = require('../utils/logger');

// Get all categories
const getCategories = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY name'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    next(error);
  }
};

module.exports = {
  getCategories
};