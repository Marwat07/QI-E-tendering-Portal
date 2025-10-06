const { client, query, getClient } = require('../config/database');

/**
 * Middleware to handle database connection cleanup and error handling
 */
const databaseMiddleware = {
  /**
   * Ensure proper cleanup of database connections in case of errors
   */
  cleanupOnError: (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Track if response has been sent
    let responseSent = false;

    // Override send methods to track response
    res.send = function(...args) {
      responseSent = true;
      return originalSend.apply(this, args);
    };

    res.json = function(...args) {
      responseSent = true;
      return originalJson.apply(this, args);
    };

    res.end = function(...args) {
      responseSent = true;
      return originalEnd.apply(this, args);
    };

    // Handle response finish
    res.on('finish', () => {
      if (req.dbClient && !req.dbClient._destroyed) {
        console.warn('[DB Middleware] Response finished but client not released - forcing release');
        try {
          req.dbClient.release();
        } catch (error) {
          console.error('[DB Middleware] Error releasing client on finish:', error);
        }
      }
    });

    // Handle response close (connection closed unexpectedly)
    res.on('close', () => {
      if (req.dbClient && !req.dbClient._destroyed) {
        console.warn('[DB Middleware] Connection closed unexpectedly - forcing client release');
        try {
          req.dbClient.release();
        } catch (error) {
          console.error('[DB Middleware] Error releasing client on close:', error);
        }
      }
    });

    next();
  },

  /**
   * Monitor database connection status and log warnings
   */
  monitorConnection: (req, res, next) => {
    try {
      const dbClient = client();
      const isConnected = dbClient && !dbClient._ending;
      
      if (!isConnected) {
        console.warn('[DB Middleware] Database connection warning detected:', {
          path: req.path,
          method: req.method,
          connected: false
        });
      }

      // Add connection status to request context for debugging
      if (process.env.NODE_ENV === 'development') {
        req.dbStatus = {
          connected: isConnected,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn('[DB Middleware] Error checking connection status:', error.message);
    }

    next();
  },

  /**
   * Provide transaction helper using single connection
   */
  withTransaction: (callback) => {
    return async (req, res, next) => {
      const dbClient = await getClient();
      req.dbClient = dbClient;

      try {
        await dbClient.query('BEGIN');
        
        const result = await callback(req, res, dbClient);
        
        await dbClient.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await dbClient.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[DB Middleware] Error during rollback:', rollbackError);
        }
        throw error;
      } finally {
        // Call release (which is a no-op for single connection)
        if (dbClient && dbClient.release) {
          dbClient.release();
        }
        req.dbClient = null;
      }
    };
  },

  /**
   * Health check endpoint
   */
  healthCheck: async (req, res) => {
    try {
      const start = Date.now();
      const dbClient = client();
      
      // Test basic query to check connection
      await query('SELECT 1');
      const latency = Date.now() - start;
      
      const isConnected = dbClient && !dbClient._ending;
      
      res.json({
        success: true,
        data: {
          connection: {
            success: true,
            latency: latency,
            connected: isConnected
          },
          database: {
            type: 'single_connection',
            status: isConnected ? 'connected' : 'disconnected'
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database health check failed',
        error: error.message,
        connection: {
          connected: false,
          error: error.message
        }
      });
    }
  },

  /**
   * Connection info endpoint (admin only)
   */
  connectionInfo: async (req, res) => {
    try {
      const dbClient = client();
      const isConnected = dbClient && !dbClient._ending;
      
      res.json({
        success: true,
        message: 'Connection info retrieved',
        data: {
          type: 'single_connection',
          connected: isConnected,
          database: process.env.DB_NAME || 'Bidding',
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get connection info',
        error: error.message
      });
    }
  }
};

module.exports = databaseMiddleware;
