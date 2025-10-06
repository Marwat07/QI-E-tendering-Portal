const { query } = require('../config/database');

class Tender {
  constructor(tenderData) {
    this.id = tenderData.id;
    this.title = tenderData.title;
    this.description = tenderData.description;
    this.category_id = tenderData.category_id;
    this.category_name = tenderData.category_name;
    this.display_category = tenderData.display_category || tenderData.category_name || null;
    this.categories = tenderData.categories || null;
    this.budget_min = tenderData.budget_min;
    this.budget_max = tenderData.budget_max;
    this.deadline = tenderData.deadline;
    this.status = tenderData.status;
    this.requirements = tenderData.requirements;
    this.attachments = tenderData.attachments;
    this.created_by = tenderData.created_by;
    this.created_by_name = tenderData.created_by_name;
    this.created_at = tenderData.created_at;
    this.updated_at = tenderData.updated_at;
  }

  // Create tender
  static async create(tenderData) {
    const {
      title,
      description,
      category_id: initial_category_id,
      category,
      categories,
      budget_min,
      budget_max,
      deadline,
      requirements,
      attachments = [],
      created_by
    } = tenderData;

    // Map UI labels to actual category names from the database
    // Based on actual categories table: Chemicals, Construction, Construction & Infrastructure, 
    // Consulting, Electronic, Equipment, Food & Beverages, Furniture, IT & Software Services, 
    // IT Services, Maintenance, Office Supplies & Equipment, Other, Pharmaceuticals, 
    // Professional Services, Supplies, Textiles, Transportation & Logistics
    const categorySynonyms = {
      // Map TenderForm categories to actual DB category names
      'Construction & Infrastructure': 'Construction & Infrastructure',
      'Information Technology': 'IT & Software Services',
      'Healthcare & Medical': 'Pharmaceuticals',
      'Transportation & Logistics': 'Transportation & Logistics',
      'Professional Services': 'Professional Services',
      'Supplies & Equipment': 'Office Supplies & Equipment',
      'Energy & Utilities': 'Chemicals',
      'Education & Training': 'Consulting',
      'Other': 'Other',
      
      // Also handle existing DB category names directly
      'IT Services': 'IT Services',
      'IT & Software Services': 'IT & Software Services',
      'Construction': 'Construction',
      'Consulting': 'Consulting',
      'Equipment': 'Equipment',
      'Maintenance': 'Maintenance',
      'Supplies': 'Supplies',
      'Electronic': 'Electronic',
      'Textiles': 'Textiles',
      'Pharmaceuticals': 'Pharmaceuticals',
      'Food & Beverages': 'Food & Beverages',
      'Chemicals': 'Chemicals',
      'Furniture': 'Furniture',
      'Office Supplies & Equipment': 'Office Supplies & Equipment',
      
      // Handle common variations and synonyms
      'Automotive': 'Transportation & Logistics',
      'Machinery': 'Equipment',
      'Medical': 'Pharmaceuticals',
      'IT': 'IT Services',
      'Technology': 'IT Services',
      'Food': 'Food & Beverages'
    };

    // Resolve category_id from provided name(s) if not explicitly set
    let resolvedCategoryId = initial_category_id || null;
    if (!resolvedCategoryId) {
      let categoryName = null;
      if (typeof category === 'string' && category.trim() !== '') {
        categoryName = category.trim();
      } else if (Array.isArray(categories) && categories.length > 0) {
        categoryName = String(categories[0]).trim();
      }
      if (categoryName) {
        // Normalize through synonyms so DB lookup succeeds
        const normalizedName = categorySynonyms[categoryName] || categoryName;
        try {
          const lookup = await query(
            'SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1',
            [normalizedName]
          );
          if (lookup.rows.length > 0) {
            resolvedCategoryId = lookup.rows[0].id;
          }
        } catch (e) {
          // ignore lookup errors, proceed without category
        }
      }
    }

    const result = await query(
      `INSERT INTO tenders (title, description, category_id, budget_min, budget_max, deadline, requirements, attachments, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, resolvedCategoryId, budget_min, budget_max, deadline, requirements, JSON.stringify(attachments), created_by]
    );

    return new Tender(result.rows[0]);
  }

  // Find tender by ID with category and creator info
  static async findById(id) {
    const result = await query(
      `SELECT t.*, 
              c.name as category_name,
              c.name as display_category,
              COALESCE(u.company_name, u.username, u.email) as created_by_name
       FROM tenders t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows.length > 0 ? new Tender(result.rows[0]) : null;
  }

  // Get all tenders with filters
  static async findAll(filters = {}) {
    let queryText = `
      SELECT t.*, 
             c.name as category_name,
             c.name as display_category,
             COALESCE(u.company_name, u.username, u.email) as created_by_name
      FROM tenders t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by status
    if (filters.status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      queryParams.push(filters.status);
    }

    // Filter by category
    if (filters.category_id) {
      paramCount++;
      queryText += ` AND t.category_id = $${paramCount}`;
      queryParams.push(filters.category_id);
    }

    // Filter by creator
    if (filters.created_by) {
      paramCount++;
      queryText += ` AND t.created_by = $${paramCount}`;
      queryParams.push(filters.created_by);
    }

    // Filter by budget range
    if (filters.budget_min) {
      paramCount++;
      queryText += ` AND t.budget_max >= $${paramCount}`;
      queryParams.push(filters.budget_min);
    }

    if (filters.budget_max) {
      paramCount++;
      queryText += ` AND t.budget_min <= $${paramCount}`;
      queryParams.push(filters.budget_max);
    }

    // Search in title and description
    if (filters.search) {
      paramCount++;
      queryText += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      queryParams.push(`%${filters.search}%`);
    }

    // Filter by deadline
    if (filters.active_only) {
      queryText += ` AND t.deadline > CURRENT_TIMESTAMP AND t.status = 'open'`;
    }

    queryText += ' ORDER BY t.created_at DESC';

    // Pagination
    if (filters.limit) {
      paramCount++;
      queryText += ` LIMIT $${paramCount}`;
      queryParams.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      queryText += ` OFFSET $${paramCount}`;
      queryParams.push(filters.offset);
    }

    const result = await query(queryText, queryParams);
    return result.rows.map(row => new Tender(row));
  }

  // Update tender
  async update(updateData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    // If a category name is provided without category_id, try to resolve it
    if (!updateData.category_id && typeof updateData.category === 'string' && updateData.category.trim() !== '') {
      try {
        const lookup = await query('SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1', [updateData.category.trim()]);
        if (lookup.rows.length > 0) {
          updateData.category_id = lookup.rows[0].id;
        }
      } catch (e) {
        // ignore errors and proceed
      }
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'id' && key !== 'category') {
        // Skip 'category' field as it doesn't exist in tenders table - only category_id exists
        paramCount++;
        if (key === 'attachments') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) return this;

    paramCount++;
    values.push(this.id);

    const result = await query(
      `UPDATE tenders SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Delete tender
  async delete() {
    await query('DELETE FROM tenders WHERE id = $1', [this.id]);
  }

  // Get total count with filters
  static async getCount(filters = {}) {
    let queryText = 'SELECT COUNT(*)::int as total FROM tenders t WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      queryParams.push(filters.status);
    }

    if (filters.category_id) {
      paramCount++;
      queryText += ` AND t.category_id = $${paramCount}`;
      queryParams.push(filters.category_id);
    }

    if (filters.created_by) {
      paramCount++;
      queryText += ` AND t.created_by = $${paramCount}`;
      queryParams.push(filters.created_by);
    }

    if (filters.budget_min) {
      paramCount++;
      queryText += ` AND t.budget_max >= $${paramCount}`;
      queryParams.push(filters.budget_min);
    }

    if (filters.budget_max) {
      paramCount++;
      queryText += ` AND t.budget_min <= $${paramCount}`;
      queryParams.push(filters.budget_max);
    }

    if (filters.search) {
      paramCount++;
      queryText += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      queryParams.push(`%${filters.search}%`);
    }

    if (filters.active_only) {
      queryText += ` AND t.deadline > CURRENT_TIMESTAMP AND t.status = 'open'`;
    }

    const result = await query(queryText, queryParams);
    return result.rows[0].total || 0;
  }

  // Get tender statistics
  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN deadline > CURRENT_TIMESTAMP AND status = 'open' THEN 1 END) as active
      FROM tenders
    `);
    return result.rows[0];
  }

  // Check if deadline is passed
  isExpired() {
    return new Date(this.deadline) < new Date();
  }

  // Get tender with bids count
  static async findWithBidsCount(id) {
    const result = await query(
      `SELECT t.*, 
              c.name as category_name,
              c.name as display_category,
              COALESCE(u.company_name, u.username, u.email) as created_by_name,
              COUNT(b.id) as bids_count
       FROM tenders t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN bids b ON t.id = b.tender_id
       WHERE t.id = $1
       GROUP BY t.id, c.name, u.company_name, u.username, u.email`,
      [id]
    );
    return result.rows.length > 0 ? new Tender(result.rows[0]) : null;
  }

  // Find tenders by user categories (for vendor filtering)
  static async findByUserCategories(userCategories, filters = {}) {
    if (!userCategories || userCategories.length === 0) {
      return [];
    }

    // Map UI category names to database category names using the same synonyms as create method
    const categorySynonyms = {
      'Construction & Infrastructure': 'Construction & Infrastructure',
      'Information Technology': 'IT & Software Services',
      'Healthcare & Medical': 'Pharmaceuticals',
      'Transportation & Logistics': 'Transportation & Logistics',
      'Professional Services': 'Professional Services',
      'Supplies & Equipment': 'Office Supplies & Equipment',
      'Energy & Utilities': 'Chemicals',
      'Education & Training': 'Consulting',
      'Other': 'Other',
      
      // Also handle existing DB category names directly
      'IT Services': 'IT Services',
      'IT & Software Services': 'IT & Software Services',
      'Construction': 'Construction',
      'Consulting': 'Consulting',
      'Equipment': 'Equipment',
      'Maintenance': 'Maintenance',
      'Supplies': 'Supplies',
      'Electronic': 'Electronic',
      'Textiles': 'Textiles',
      'Pharmaceuticals': 'Pharmaceuticals',
      'Food & Beverages': 'Food & Beverages',
      'Chemicals': 'Chemicals',
      'Furniture': 'Furniture',
      'Office Supplies & Equipment': 'Office Supplies & Equipment',
      
      // Handle common variations and synonyms
      'Automotive': 'Transportation & Logistics',
      'Machinery': 'Equipment',
      'Medical': 'Pharmaceuticals',
      'IT': 'IT Services',
      'Technology': 'IT Services',
      'Food': 'Food & Beverages'
    };

    // Normalize user categories
    const normalizedCategories = userCategories.map(cat => {
      const categoryName = String(cat).trim();
      return categorySynonyms[categoryName] || categoryName;
    }).filter(cat => cat); // Remove empty categories

    if (normalizedCategories.length === 0) {
      return [];
    }

    // First, get category IDs for the user's categories
    const categoryPlaceholders = normalizedCategories.map((_, i) => `$${i + 1}`).join(', ');
    const categoryLookup = await query(
      `SELECT id, name FROM categories WHERE name IN (${categoryPlaceholders})`,
      normalizedCategories
    );

    const categoryIds = categoryLookup.rows.map(row => row.id);
    
    if (categoryIds.length === 0) {
      // No matching categories found in database
      return [];
    }

    // Build the main query
    let queryText = `
      SELECT t.*, 
             c.name as category_name,
             c.name as display_category,
             COALESCE(u.company_name, u.username, u.email) as created_by_name
      FROM tenders t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Filter by user's categories
    const categoryPlaceholdersForTenders = categoryIds.map(() => {
      paramCount++;
      return `$${paramCount}`;
    }).join(', ');
    
    queryText += ` AND t.category_id IN (${categoryPlaceholdersForTenders})`;
    queryParams.push(...categoryIds);

    // Apply additional filters similar to findAll method
    if (filters.status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      queryParams.push(filters.status);
    }

    // Filter by budget range
    if (filters.budget_min) {
      paramCount++;
      queryText += ` AND t.budget_max >= $${paramCount}`;
      queryParams.push(filters.budget_min);
    }

    if (filters.budget_max) {
      paramCount++;
      queryText += ` AND t.budget_min <= $${paramCount}`;
      queryParams.push(filters.budget_max);
    }

    // Search in title and description
    if (filters.search) {
      paramCount++;
      queryText += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      queryParams.push(`%${filters.search}%`);
    }

    // Filter by deadline - only show active tenders
    if (filters.active_only) {
      queryText += ` AND t.deadline > CURRENT_TIMESTAMP AND t.status = 'open'`;
    }

    queryText += ' ORDER BY t.created_at DESC';

    // Pagination
    if (filters.limit) {
      paramCount++;
      queryText += ` LIMIT $${paramCount}`;
      queryParams.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      queryText += ` OFFSET $${paramCount}`;
      queryParams.push(filters.offset);
    }

    const result = await query(queryText, queryParams);
    return result.rows.map(row => new Tender(row));
  }
}

module.exports = Tender;
