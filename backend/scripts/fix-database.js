const { Client } = require('pg');
require('dotenv').config();

async function fixDatabase() {
  console.log('🔧 Fixing database connection and setup...');
  
  // Database configuration with explicit user override
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || '123'),
    connectionTimeoutMillis: 5000,
  };

  console.log(`🔍 Attempting connection with config:`, {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
  });

  let adminClient = null;

  try {
    // Test connection to PostgreSQL
    adminClient = new Client(dbConfig);
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL successfully');

    // Check if our target database exists
    const dbName = process.env.DB_NAME || 'Bidding';
    const dbResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbResult.rows.length === 0) {
      console.log(`🔨 Creating database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }

    await adminClient.end();

    // Now connect to our target database
    const targetConfig = { ...dbConfig, database: dbName };
    const targetClient = new Client(targetConfig);
    
    await targetClient.connect();
    console.log('✅ Connected to target database successfully');

    // Check existing tables
    const tablesResult = await targetClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const existingTables = tablesResult.rows.map(r => r.table_name);
    console.log('📋 Existing tables:', existingTables);

    // Create basic tables if they don't exist
    const requiredTables = ['users', 'categories', 'tenders', 'bids'];
    
    for (const table of requiredTables) {
      if (!existingTables.includes(table)) {
        console.log(`🔨 Creating table: ${table}`);
        await createTable(targetClient, table);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }

    await targetClient.end();
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 PostgreSQL server is not running. Please start PostgreSQL service.');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Please check DB_USER and DB_PASSWORD in .env file.');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist and could not be created.');
    }
    
    console.error('🔍 Debug info:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      error_code: error.code
    });
  } finally {
    if (adminClient && !adminClient._ending) {
      await adminClient.end().catch(() => {});
    }
  }
}

async function createTable(client, tableName) {
  let sql = '';
  
  switch (tableName) {
    case 'users':
      sql = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          company_name VARCHAR(255),
          phone VARCHAR(20),
          role VARCHAR(20) DEFAULT 'vendor' CHECK (role IN ('admin', 'buyer', 'vendor', 'supplier')),
          is_active BOOLEAN DEFAULT true,
          is_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      break;
      
    case 'categories':
      sql = `
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      break;
      
    case 'tenders':
      sql = `
        CREATE TABLE tenders (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          created_by INTEGER REFERENCES users(id),
          budget_min DECIMAL(15,2),
          budget_max DECIMAL(15,2),
          deadline TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'awarded')),
          requirements TEXT,
          evaluation_criteria TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      break;
      
    case 'bids':
      sql = `
        CREATE TABLE bids (
          id SERIAL PRIMARY KEY,
          tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE,
          supplier_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15,2) NOT NULL,
          proposal TEXT NOT NULL,
          delivery_timeline VARCHAR(255),
          attachments JSONB DEFAULT '[]',
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tender_id, supplier_id)
        )
      `;
      break;
  }

  if (sql) {
    await client.query(sql);
    console.log(`✅ Created table: ${tableName}`);
  }
}

if (require.main === module) {
  fixDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDatabase };