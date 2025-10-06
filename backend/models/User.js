const { query, getClient } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.email = userData.email;
    this.username = userData.username;
    this.password = userData.password;
    this.company_name = userData.company_name;
    this.phone = userData.phone;
    this.address = userData.address;
    this.role = userData.role;
    this.category = userData.category;
    this.is_verified = userData.is_verified;
    this.is_active = userData.is_active;
    this.is_archived = userData.is_archived;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
    this.tax_number = userData.tax_number;
    this.registration_number = userData.registration_number;
    this.website = userData.website;
    this.reset_token = userData.reset_token;
    this.reset_token_expires = userData.reset_token_expires;
  }

  // Create user
  static async create(userData) {
    const { email, username, password, company_name, phone, address, role = 'vendor', category = 'electronics' } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (email, username, password, company_name, phone, address, role, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [email, username, hashedPassword, company_name, phone, address, role, category]
    );

    return new User(result.rows[0]);
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by email or username
  static async findByEmailOrUsername(emailOrUsername) {
    const result = await query('SELECT * FROM users WHERE email = $1 OR username = $1', [emailOrUsername]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by ID
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Get all users
  static async findAll(filters = {}) {
    let queryText = 'SELECT * FROM users WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (filters.role) {
      paramCount++;
      queryText += ` AND role = $${paramCount}`;
      queryParams.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      queryText += ` AND is_active = $${paramCount}`;
      queryParams.push(filters.is_active);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, queryParams);
    return result.rows.map(row => new User(row));
  }

  // Update user
  async update(updateData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'id') {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return this;

    paramCount++;
    values.push(this.id);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Delete user
  async delete() {
    await query('DELETE FROM users WHERE id = $1', [this.id]);
  }

  // Verify password
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Generate JWT token
  generateToken() {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
  }

  // Get user categories
  async getCategories() {
    const result = await query(
      'SELECT category FROM user_categories WHERE user_id = $1 ORDER BY category',
      [this.id]
    );
    return result.rows.map(row => row.category);
  }

  // Set user categories (replaces existing ones)
  async setCategories(categories) {
    if (!Array.isArray(categories)) {
      throw new Error('Categories must be an array');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Remove existing categories
      await client.query('DELETE FROM user_categories WHERE user_id = $1', [this.id]);
      
      // Add new categories
      for (const category of categories) {
        if (category && category.trim()) {
          await client.query(
            'INSERT INTO user_categories (user_id, category) VALUES ($1, $2)',
            [this.id, category.trim()]
          );
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user without password and include categories
  async toJSON() {
    const { password, ...userWithoutPassword } = this;
    try {
      userWithoutPassword.categories = await this.getCategories();
    } catch (error) {
      console.error('Error fetching user categories:', error);
      userWithoutPassword.categories = [];
    }
    return userWithoutPassword;
  }

  // Get user without password (sync version for backward compatibility)
  toJSONSync() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Static method to create user with categories
  static async createWithCategories(userData, categories = []) {
    const user = await User.create(userData);
    if (categories.length > 0) {
      await user.setCategories(categories);
    }
    return user;
  }

  // Static method to find all users with their categories
  static async findAllWithCategories(filters = {}) {
    const users = await User.findAll(filters);
    const usersWithCategories = [];
    
    for (const user of users) {
      const userWithCategories = await user.toJSON();
      usersWithCategories.push(userWithCategories);
    }
    
    return usersWithCategories;
  }
}

module.exports = User;
