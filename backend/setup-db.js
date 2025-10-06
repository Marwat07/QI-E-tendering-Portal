const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // First connect to postgres default database
  const adminClient = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD)
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL successfully');

    // Check if database exists
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );

    if (result.rows.length === 0) {
      console.log(`Creating database: ${process.env.DB_NAME}`);
      await adminClient.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }

    await adminClient.end();

    // Now test connection to our target database
    const targetClient = new Client({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD)
    });

    await targetClient.connect();
    console.log('✅ Connected to target database successfully');
    
    // List existing tables
    const tables = await targetClient.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('Existing tables:', tables.rows.map(r => r.table_name));
    
    await targetClient.end();

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
  }
}

setupDatabase();
