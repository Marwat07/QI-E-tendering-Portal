const { query, getClient } = require('../config/database');

const enhancedMigration = async () => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    console.log('Starting enhanced database migration...');

    // Create users table with enhanced fields
    await client.query(`
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
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        profile_picture VARCHAR(500),
        tax_number VARCHAR(50),
        registration_number VARCHAR(50),
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');

    // Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id INTEGER REFERENCES categories(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table created/verified');

    // Create enhanced tenders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        budget_min DECIMAL(15,2),
        budget_max DECIMAL(15,2),
        estimated_value DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'USD',
        deadline TIMESTAMP NOT NULL,
        opening_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closing_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'cancelled', 'awarded')),
        tender_type VARCHAR(20) DEFAULT 'open' CHECK (tender_type IN ('open', 'restricted', 'negotiated')),
        requirements TEXT,
        terms_conditions TEXT,
        payment_terms TEXT,
        delivery_timeline TEXT,
        evaluation_criteria TEXT,
        attachments JSONB DEFAULT '[]'::jsonb,
        documents JSONB DEFAULT '[]'::jsonb,
        location VARCHAR(255),
        contact_person VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        created_by INTEGER NOT NULL REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        published_at TIMESTAMP,
        view_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        encrypted_fields JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Enhanced tenders table created/verified');

    // Create enhanced bids table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        tender_id INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
        supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        proposal TEXT,
        technical_proposal TEXT,
        commercial_proposal TEXT,
        delivery_timeline TEXT,
        warranty_terms TEXT,
        attachments JSONB DEFAULT '[]'::jsonb,
        documents JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
        rejection_reason TEXT,
        evaluation_score DECIMAL(5,2),
        evaluation_notes TEXT,
        is_compliant BOOLEAN DEFAULT true,
        compliance_notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        evaluated_at TIMESTAMP,
        evaluated_by INTEGER REFERENCES users(id),
        encrypted_fields JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tender_id, supplier_id)
      )
    `);
    console.log('✅ Enhanced bids table created/verified');

    // Create tender_views table for tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS tender_views (
        id SERIAL PRIMARY KEY,
        tender_id INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tender views table created/verified');

    // Create bid_history table for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS bid_history (
        id SERIAL PRIMARY KEY,
        bid_id INTEGER NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        performed_by INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bid history table created/verified');

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Notifications table created/verified');

    // Create file_uploads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(500) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        entity_type VARCHAR(50), -- 'tender', 'bid', 'user', etc.
        entity_id INTEGER,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ File uploads table created/verified');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
      CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(category_id);
      CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON tenders(deadline);
      CREATE INDEX IF NOT EXISTS idx_tenders_created_by ON tenders(created_by);
      CREATE INDEX IF NOT EXISTS idx_tenders_published ON tenders(published_at);
      CREATE INDEX IF NOT EXISTS idx_tenders_featured ON tenders(is_featured);
      
      CREATE INDEX IF NOT EXISTS idx_bids_tender ON bids(tender_id);
      CREATE INDEX IF NOT EXISTS idx_bids_supplier ON bids(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
      CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount);
      CREATE INDEX IF NOT EXISTS idx_bids_submitted ON bids(submitted_at);
      
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_tender_views_tender ON tender_views(tender_id);
      CREATE INDEX IF NOT EXISTS idx_tender_views_user ON tender_views(user_id);
      CREATE INDEX IF NOT EXISTS idx_tender_views_date ON tender_views(viewed_at);
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(uploaded_by);
    `);
    console.log('✅ Database indexes created/verified');

    // Insert default categories
    await client.query(`
      INSERT INTO categories (name, description) VALUES 
      ('Information Technology', 'IT services, software development, hardware procurement'),
      ('Construction', 'Building construction, civil works, infrastructure'),
      ('Consulting', 'Management consulting, advisory services'),
      ('Healthcare', 'Medical services, equipment, pharmaceuticals'),
      ('Education', 'Educational services, training programs'),
      ('Transportation', 'Vehicle procurement, logistics services'),
      ('Marketing & Advertising', 'Marketing campaigns, branding services'),
      ('Legal Services', 'Legal advisory, compliance services'),
      ('Financial Services', 'Banking, insurance, financial advisory'),
      ('Utilities', 'Electricity, water, telecommunications'),
      ('Food & Catering', 'Food services, catering, supplies'),
      ('Security Services', 'Security systems, guard services'),
      ('Maintenance & Repair', 'Equipment maintenance, facility management'),
      ('Office Supplies', 'Stationery, furniture, office equipment'),
      ('Other', 'Miscellaneous services and products')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default categories inserted');

    // Create an admin user if it doesn't exist
    const adminExists = await client.query("SELECT id FROM users WHERE email = 'admin@etendering.com'");
    
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['admin@etendering.com', hashedPassword, 'System', 'Administrator', 'admin', true, true]);
      console.log('✅ Default admin user created');
    }

    // Create triggers for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    const tables = ['users', 'categories', 'tenders', 'bids', 'notifications', 'file_uploads'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('✅ Updated_at triggers created');

    await client.query('COMMIT');
    console.log('🎉 Enhanced database migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  enhancedMigration()
    .then(() => {
      console.log('Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = enhancedMigration;
