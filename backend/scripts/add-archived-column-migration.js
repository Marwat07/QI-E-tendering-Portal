#!/usr/bin/env node

require('dotenv').config();
const { query, getClient } = require('../config/database');
const logger = require('../utils/logger');

async function addArchivedColumnMigration() {
  const client = await getClient();
  
  try {
    logger.info('Connected to database for archived column migration');
    
    // Check if is_archived column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_archived'
    `;
    
    const columnCheck = await client.query(checkColumnQuery);
    
    if (columnCheck.rows.length > 0) {
      logger.info('is_archived column already exists, skipping migration');
      return;
    }
    
    logger.info('Adding is_archived column to users table...');
    
    // Add is_archived column with default false
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN is_archived BOOLEAN DEFAULT FALSE NOT NULL
    `);
    
    logger.info('Successfully added is_archived column to users table');
    
    // Update any existing users to have is_archived = false (just to be explicit)
    const updateResult = await client.query(`
      UPDATE users 
      SET is_archived = FALSE 
      WHERE is_archived IS NULL
    `);
    
    logger.info(`Updated ${updateResult.rowCount} existing users with is_archived = FALSE`);
    
    // Create index on is_archived for better query performance
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_archived 
      ON users(is_archived)
    `);
    
    logger.info('Created index on is_archived column');
    
    logger.info('Archived column migration completed successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
if (require.main === module) {
  addArchivedColumnMigration()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = addArchivedColumnMigration;
