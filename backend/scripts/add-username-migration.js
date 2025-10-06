const { Client } = require('pg');
const logger = require('../utils/logger');

async function addUsernameColumn() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Bidding',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
  });

  try {
    await client.connect();
    logger.info('Connected to database for username migration');

    // Check if username column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'username'
    `);

    if (columnCheck.rows.length > 0) {
      logger.info('Username column already exists, skipping migration');
      return;
    }

    // Add username column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN username VARCHAR(50) UNIQUE
    `);

    logger.info('Successfully added username column to users table');

    // Create index on username for better performance
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username 
      ON users (username)
    `);

    logger.info('Successfully created index on username column');

    // Optionally generate usernames for existing users
    const existingUsers = await client.query(`
      SELECT id, email 
      FROM users 
      WHERE username IS NULL
    `);

    if (existingUsers.rows.length > 0) {
      logger.info(`Found ${existingUsers.rows.length} users without usernames. Generating...`);
      
      const emailService = require('../services/emailService');
      
      for (const user of existingUsers.rows) {
        try {
          const credentials = emailService.generateCredentials(user.email);
          
          await client.query(`
            UPDATE users 
            SET username = $1 
            WHERE id = $2
          `, [credentials.username, user.id]);
          
          logger.info(`Generated username for user ID ${user.id}: ${credentials.username}`);
        } catch (error) {
          logger.error(`Failed to generate username for user ID ${user.id}:`, error);
        }
      }
    }

    logger.info('Username migration completed successfully');

  } catch (error) {
    logger.error('Username migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  addUsernameColumn()
    .then(() => {
      console.log('✅ Username migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Username migration failed:', error);
      process.exit(1);
    });
}

module.exports = addUsernameColumn;
