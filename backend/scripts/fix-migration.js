const { query, getClient } = require('../config/database');

const fixMigration = async () => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    console.log('Starting database fix migration...');

    // Add missing columns to tenders table
    console.log('Adding missing columns to tenders table...');
    
    const addColumnIfNotExists = async (table, column, definition) => {
      try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
        console.log(`✅ Added column ${column} to ${table} table`);
      } catch (error) {
        if (error.code === '42701') { // duplicate column error
          console.log(`ℹ️  Column ${column} already exists in ${table} table`);
        } else {
          throw error;
        }
      }
    };

    // Add missing columns to tenders table
    await addColumnIfNotExists('tenders', 'estimated_value', 'DECIMAL(15,2)');
    await addColumnIfNotExists('tenders', 'currency', 'VARCHAR(3) DEFAULT \'USD\'');
    await addColumnIfNotExists('tenders', 'opening_date', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfNotExists('tenders', 'closing_date', 'TIMESTAMP');
    await addColumnIfNotExists('tenders', 'tender_type', 'VARCHAR(20) DEFAULT \'open\' CHECK (tender_type IN (\'open\', \'restricted\', \'negotiated\'))');
    await addColumnIfNotExists('tenders', 'terms_conditions', 'TEXT');
    await addColumnIfNotExists('tenders', 'payment_terms', 'TEXT');
    await addColumnIfNotExists('tenders', 'delivery_timeline', 'TEXT');
    await addColumnIfNotExists('tenders', 'evaluation_criteria', 'TEXT');
    await addColumnIfNotExists('tenders', 'documents', 'JSONB DEFAULT \'[]\'::jsonb');
    await addColumnIfNotExists('tenders', 'location', 'VARCHAR(255)');
    await addColumnIfNotExists('tenders', 'contact_person', 'VARCHAR(255)');
    await addColumnIfNotExists('tenders', 'contact_email', 'VARCHAR(255)');
    await addColumnIfNotExists('tenders', 'contact_phone', 'VARCHAR(20)');
    await addColumnIfNotExists('tenders', 'updated_by', 'INTEGER REFERENCES users(id)');
    await addColumnIfNotExists('tenders', 'published_at', 'TIMESTAMP');
    await addColumnIfNotExists('tenders', 'view_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists('tenders', 'is_featured', 'BOOLEAN DEFAULT false');
    await addColumnIfNotExists('tenders', 'encrypted_fields', 'JSONB DEFAULT \'{}\'::jsonb');

    // Add missing columns to bids table
    await addColumnIfNotExists('bids', 'currency', 'VARCHAR(3) DEFAULT \'USD\'');
    await addColumnIfNotExists('bids', 'technical_proposal', 'TEXT');
    await addColumnIfNotExists('bids', 'commercial_proposal', 'TEXT');
    await addColumnIfNotExists('bids', 'warranty_terms', 'TEXT');
    await addColumnIfNotExists('bids', 'documents', 'JSONB DEFAULT \'[]\'::jsonb');
    await addColumnIfNotExists('bids', 'evaluation_score', 'DECIMAL(5,2)');
    await addColumnIfNotExists('bids', 'evaluation_notes', 'TEXT');
    await addColumnIfNotExists('bids', 'is_compliant', 'BOOLEAN DEFAULT true');
    await addColumnIfNotExists('bids', 'compliance_notes', 'TEXT');
    await addColumnIfNotExists('bids', 'evaluated_at', 'TIMESTAMP');
    await addColumnIfNotExists('bids', 'evaluated_by', 'INTEGER REFERENCES users(id)');
    await addColumnIfNotExists('bids', 'encrypted_fields', 'JSONB DEFAULT \'{}\'::jsonb');

    // Add missing columns to users table
    await addColumnIfNotExists('users', 'profile_picture', 'VARCHAR(500)');
    await addColumnIfNotExists('users', 'tax_number', 'VARCHAR(50)');
    await addColumnIfNotExists('users', 'registration_number', 'VARCHAR(50)');
    await addColumnIfNotExists('users', 'website', 'VARCHAR(255)');

    // Update status check constraints for tenders
    try {
      await client.query(`
        ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_status_check;
        ALTER TABLE tenders ADD CONSTRAINT tenders_status_check 
        CHECK (status IN ('draft', 'open', 'closed', 'cancelled', 'awarded'))
      `);
      console.log('✅ Updated tenders status constraint');
    } catch (error) {
      console.log('ℹ️  Status constraint update skipped or failed');
    }

    // Update status check constraints for bids
    try {
      await client.query(`
        ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
        ALTER TABLE bids ADD CONSTRAINT bids_status_check 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'))
      `);
      console.log('✅ Updated bids status constraint');
    } catch (error) {
      console.log('ℹ️  Bids status constraint update skipped or failed');
    }

    // Now create the indexes safely
    console.log('Creating database indexes...');
    
    const createIndexSafely = async (indexQuery, indexName) => {
      try {
        await client.query(indexQuery);
        console.log(`✅ Created index: ${indexName}`);
      } catch (error) {
        if (error.code === '42P07') { // duplicate object error
          console.log(`ℹ️  Index ${indexName} already exists`);
        } else {
          console.error(`❌ Failed to create index ${indexName}:`, error.message);
        }
      }
    };

    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status)', 'idx_tenders_status');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(category_id)', 'idx_tenders_category');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON tenders(deadline)', 'idx_tenders_deadline');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_tenders_created_by ON tenders(created_by)', 'idx_tenders_created_by');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_tenders_published ON tenders(published_at)', 'idx_tenders_published');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_tenders_featured ON tenders(is_featured)', 'idx_tenders_featured');
    
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_bids_tender ON bids(tender_id)', 'idx_bids_tender');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_bids_supplier ON bids(supplier_id)', 'idx_bids_supplier');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status)', 'idx_bids_status');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount)', 'idx_bids_amount');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_bids_submitted ON bids(submitted_at)', 'idx_bids_submitted');
    
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)', 'idx_users_role');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', 'idx_users_email');
    await createIndexSafely('CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)', 'idx_users_active');

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
    console.log('✅ Updated_at function created');

    const tables = ['users', 'categories', 'tenders', 'bids'];
    for (const table of tables) {
      try {
        await client.query(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
          CREATE TRIGGER update_${table}_updated_at
              BEFORE UPDATE ON ${table}
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log(`✅ Updated_at trigger created for ${table}`);
      } catch (error) {
        console.log(`ℹ️  Trigger creation for ${table} skipped:`, error.message);
      }
    }

    await client.query('COMMIT');
    console.log('🎉 Database fix migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  fixMigration()
    .then(() => {
      console.log('Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = fixMigration;
