const { query } = require('../config/database');

class Bid {
  constructor(bidData) {
    this.id = bidData.id;
    this.tender_id = bidData.tender_id;
    this.vendor_id = bidData.supplier_id; // Map supplier_id to vendor_id for backward compatibility
    this.supplier_id = bidData.supplier_id; // Keep original column name
    this.amount = bidData.amount;
    this.proposal = bidData.proposal;
    this.delivery_timeline = bidData.delivery_timeline;
    this.attachments = bidData.attachments;
    this.status = bidData.status;
    this.submitted_at = bidData.submitted_at;
    this.updated_at = bidData.updated_at;
    // Additional fields from joins
    this.tender_title = bidData.tender_title;
    this.vendor_name = bidData.vendor_name;
    this.vendor_company = bidData.vendor_company;
  }

  // Create bid
  static async create(bidData) {
    const {
      tender_id,
      vendor_id,
      amount,
      proposal,
      delivery_timeline,
      attachments = []
    } = bidData;

    // Insert bid with current fields (without compliance_statement and additional_notes)
    try {
      const result = await query(
        `INSERT INTO bids (tender_id, supplier_id, amount, proposal, delivery_timeline, attachments)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tender_id, vendor_id, amount, proposal, delivery_timeline, JSON.stringify(attachments)]
      );
      return new Bid(result.rows[0]);
    } catch (error) {
      // If delivery_timeline column doesn't exist, fallback to basic insert
      console.log('Falling back to basic bid insert (delivery_timeline column may not exist):', error.message);
      const result = await query(
        `INSERT INTO bids (tender_id, supplier_id, amount, proposal, attachments)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tender_id, vendor_id, amount, proposal, JSON.stringify(attachments)]
      );
      return new Bid(result.rows[0]);
    }
  }

  // Find bid by ID
  static async findById(id) {
    const result = await query(
      `SELECT b.*, t.title as tender_title, COALESCE(u.company_name, u.username, u.email) as vendor_name,
              u.company_name as vendor_company
       FROM bids b
       LEFT JOIN tenders t ON b.tender_id = t.id
       LEFT JOIN users u ON b.supplier_id = u.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows.length > 0 ? new Bid(result.rows[0]) : null;
  }

  // Get all bids with filters
  static async findAll(filters = {}) {
    let queryText = `
      SELECT b.*, t.title as tender_title, COALESCE(u.company_name, u.username, u.email) as vendor_name,
             u.company_name as vendor_company
      FROM bids b
      LEFT JOIN tenders t ON b.tender_id = t.id
      LEFT JOIN users u ON b.supplier_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by tender
    if (filters.tender_id) {
      paramCount++;
      queryText += ` AND b.tender_id = $${paramCount}`;
      queryParams.push(filters.tender_id);
    }

    // Filter by vendor/supplier
    if (filters.vendor_id) {
      paramCount++;
      queryText += ` AND b.supplier_id = $${paramCount}`;
      queryParams.push(filters.vendor_id);
    }

    // Filter by status
    if (filters.status) {
      paramCount++;
      queryText += ` AND b.status = $${paramCount}`;
      queryParams.push(filters.status);
    }

    // Filter by amount range
    if (filters.amount_min) {
      paramCount++;
      queryText += ` AND b.amount >= $${paramCount}`;
      queryParams.push(filters.amount_min);
    }

    if (filters.amount_max) {
      paramCount++;
      queryText += ` AND b.amount <= $${paramCount}`;
      queryParams.push(filters.amount_max);
    }

    queryText += ' ORDER BY b.submitted_at DESC';

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
    return result.rows.map(row => new Bid(row));
  }

  // Update bid
  async update(updateData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'id') {
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
      `UPDATE bids SET ${fields.join(', ')} 
       WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Delete bid
  async delete() {
    await query('DELETE FROM bids WHERE id = $1', [this.id]);
  }

  // Check if vendor already has bid for tender
  static async findByTenderAndVendor(tender_id, vendor_id) {
    const result = await query(
      'SELECT * FROM bids WHERE tender_id = $1 AND supplier_id = $2',
      [tender_id, vendor_id]
    );
    return result.rows.length > 0 ? new Bid(result.rows[0]) : null;
  }

  // Get bid statistics for a tender
  static async getTenderBidStats(tender_id) {
    const result = await query(`
      SELECT 
        COUNT(*) as total_bids,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount,
        AVG(amount) as avg_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM bids 
      WHERE tender_id = $1
    `, [tender_id]);
    return result.rows[0];
  }

  // Get vendor bid statistics
  static async getVendorStats(vendor_id) {
    const result = await query(`
      SELECT 
        COUNT(*) as total_bids,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as won_bids,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as lost_bids,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bids,
        AVG(amount) as avg_bid_amount
      FROM bids 
      WHERE supplier_id = $1
    `, [vendor_id]);
    return result.rows[0];
  }

  // Get lowest bid for a tender
  static async getLowestBidForTender(tender_id) {
    const result = await query(
      `SELECT b.*, COALESCE(u.company_name, u.username, u.email) as vendor_name,
              u.company_name as vendor_company
       FROM bids b
       LEFT JOIN users u ON b.supplier_id = u.id
       WHERE b.tender_id = $1 AND b.status = 'pending'
       ORDER BY b.amount ASC
       LIMIT 1`,
      [tender_id]
    );
    return result.rows.length > 0 ? new Bid(result.rows[0]) : null;
  }

  // Accept bid (and reject others for the same tender)
  static async acceptBid(bid_id) {
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get the tender_id for this bid
      const bidResult = await client.query('SELECT tender_id FROM bids WHERE id = $1', [bid_id]);
      if (bidResult.rows.length === 0) {
        throw new Error('Bid not found');
      }
      
      const tender_id = bidResult.rows[0].tender_id;
      
      // Accept the selected bid
      await client.query('UPDATE bids SET status = $1 WHERE id = $2', ['accepted', bid_id]);
      
      // Reject all other bids for this tender
      await client.query(
        'UPDATE bids SET status = $1 WHERE tender_id = $2 AND id != $3',
        ['rejected', tender_id, bid_id]
      );
      
      // Update tender status to closed
      await client.query('UPDATE tenders SET status = $1 WHERE id = $2', ['closed', tender_id]);
      
      await client.query('COMMIT');
      
      // Return the accepted bid
      return await Bid.findById(bid_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Bid;
