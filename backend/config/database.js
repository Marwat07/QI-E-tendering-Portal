const { Client } = require('pg');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Console logger fallback
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
};

// Single database client connection
let client = null;

// Database client configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'Bidding',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123'),
  connectionTimeoutMillis: 5000, // Return error after 5 seconds if unable to connect
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Initialize database connection
const connectDB = async () => {
  try {
    // Create new client instance
    client = new Client(dbConfig);
    
    // Handle client errors
    client.on('error', (err) => {
      logger.error('Unexpected database client error:', err);
      // Attempt to reconnect
      reconnectDB();
    });
    
    client.on('end', () => {
      logger.info('Database client connection ended');
    });
    
    // Connect to database
    await client.connect();
    logger.info('PostgreSQL connected successfully');
    
    // Test basic query
    await client.query('SELECT 1');
    logger.info('Database query test successful');
    
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Reconnection logic
const reconnectDB = async () => {
  let retries = 3;
  const retryDelay = 2000;
  
  while (retries > 0) {
    try {
      logger.info(`Attempting to reconnect to database... (${4 - retries}/3)`);
      
      // Create new client if needed
      if (!client || client._ending) {
        client = new Client(dbConfig);
      }
      
      await client.connect();
      logger.info('Database reconnected successfully');
      return;
    } catch (error) {
      retries--;
      logger.error(`Reconnection attempt failed: ${error.message}`);
      
      if (retries > 0) {
        logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error('All reconnection attempts failed. Exiting...');
        process.exit(1);
      }
    }
  }
};

// Database query helper
const query = async (text, params) => {
  const start = Date.now();
  try {
    // Check if client is connected
    if (!client || client._ending) {
      throw new Error('Database client is not connected');
    }
    
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
    }
    return res;
  } catch (error) {
    logger.error('Database query error:', error.message);
    logger.error('Query:', text);
    throw error;
  }
};

// Get client for transactions (return the same client)
const getClient = async () => {
  try {
    // Check if client is connected
    if (!client || client._ending) {
      throw new Error('Database client is not connected');
    }
    
    // Return client with a no-op release function since we're using a single connection
    const clientWrapper = {
      query: client.query.bind(client), // Properly bind the query method
      release: () => {
        // No-op since we're not using a pool
        logger.debug('Client release called (no-op for single connection)');
      },
      // Add other methods that might be needed
      connect: client.connect.bind(client),
      end: client.end.bind(client),
      _ending: client._ending
    };
    
    return clientWrapper;
  } catch (error) {
    logger.error('Failed to get database client:', error.message);
    throw error;
  }
};

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('Gracefully shutting down database connection...');
  try {
    if (client && !client._ending) {
      await client.end();
      logger.info('Database connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error.message);
  }
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('exit', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown().then(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown().then(() => {
    process.exit(1);
  });
});

module.exports = {
  connectDB,
  query,
  getClient,
  client: () => client, // Export function to get client instance
  gracefulShutdown
};
