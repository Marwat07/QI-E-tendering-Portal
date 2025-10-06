const { Client } = require('pg');
const logger = require('../utils/logger');

async function removeNameColumns() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Bidding',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
  });

  try {
    await client.connect();
    logger.info('Connected to database for name columns removal migration');

    // Check if first_name column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('first_name', 'last_name')
    `);

    if (columnCheck.rows.length === 0) {
      logger.info('Name columns do not exist, skipping migration');
      return;
    }

    // First, let's see what columns exist
    const existingColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    logger.info('Current user table columns:', existingColumns.rows.map(r => r.column_name).join(', '));

    // Remove first_name column if it exists
    const firstNameExists = columnCheck.rows.some(row => row.column_name === 'first_name');
    if (firstNameExists) {
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS first_name`);
      logger.info('Successfully removed first_name column from users table');
    }

    // Remove last_name column if it exists
    const lastNameExists = columnCheck.rows.some(row => row.column_name === 'last_name');
    if (lastNameExists) {
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS last_name`);
      logger.info('Successfully removed last_name column from users table');
    }

    // Show updated table structure
    const updatedColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    logger.info('Updated user table columns:', updatedColumns.rows.map(r => r.column_name).join(', '));
    logger.info('Name columns removal migration completed successfully');

  } catch (error) {
    logger.error('Name columns removal migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  removeNameColumns()
    .then(() => {
      console.log('✅ Name columns removal migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Name columns removal migration failed:', error);
      process.exit(1);
    });
}

module.exports = removeNameColumns;
