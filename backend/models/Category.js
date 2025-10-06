const { query } = require('../config/database');

class Category {
  constructor(categoryData) {
    this.id = categoryData.id;
    this.name = categoryData.name;
    this.description = categoryData.description;
    this.is_active = categoryData.is_active;
    this.created_at = categoryData.created_at;
    this.updated_at = categoryData.updated_at;
  }

  // Get all active categories
  static async findAll() {
    const result = await query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY name'
    );
    return result.rows.map(row => new Category(row));
  }

  // Find category by ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    return new Category(result.rows[0]);
  }
}

module.exports = Category;