const { query } = require('../config/database');
const logger = require('../utils/logger');

const createTables = async () => {
  try {
    logger.info('Starting database migration...');

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        role VARCHAR(20) DEFAULT 'supplier' CHECK (role IN ('admin', 'buyer', 'supplier')),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tenders table
    await query(`
      CREATE TABLE IF NOT EXISTS tenders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        budget_min DECIMAL(15,2),
        budget_max DECIMAL(15,2),
        deadline TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
        requirements TEXT,
        attachments JSONB DEFAULT '[]',
        created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bids table
    await query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE,
        supplier_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        proposal TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tender_id, supplier_id)
      )
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON tenders(deadline);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(category_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_created_by ON tenders(created_by);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_bids_tender ON bids(tender_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_bids_supplier ON bids(supplier_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
    `);

    // Create triggers to update updated_at automatically
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
      CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_tenders_updated_at ON tenders;
      CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON tenders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_bids_updated_at ON bids;
      CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    logger.info('Database migration completed successfully!');
    console.log('✅ Database migration completed successfully!');
    
  } catch (error) {
    logger.error('Database migration failed:', error);
    console.error('❌ Database migration failed:', error.message);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables().then(() => {
    process.exit(0);
  });
}

module.exports = createTables;
