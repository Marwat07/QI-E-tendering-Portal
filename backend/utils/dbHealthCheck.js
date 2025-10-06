const { client, query } = require('../config/database');

/**
 * Database health check utility
 * Monitors single database connection status and provides diagnostic information
 */
class DatabaseHealthCheck {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    try {
      const dbClient = client();
      const isConnected = dbClient && !dbClient._ending;
      
      return {
        connected: isConnected,
        timestamp: new Date().toISOString(),
        type: 'single_connection'
      };
    } catch (error) {
      return {
        connected: false,
        timestamp: new Date().toISOString(),
        type: 'single_connection',
        error: error.message
      };
    }
  }

  /**
   * Check if database connection is healthy
   */
  isConnectionHealthy() {
    const status = this.getConnectionStatus();
    
    // Connection is unhealthy if not connected or has errors
    const isHealthy = status.connected && !status.error;
    
    return {
      healthy: isHealthy,
      status,
      warnings: this.getWarnings(status)
    };
  }

  /**
   * Get health warnings
   */
  getWarnings(status) {
    const warnings = [];
    
    if (!status.connected) {
      warnings.push('Database connection is not active');
    }
    
    if (status.error) {
      warnings.push(`Connection error: ${status.error}`);
    }

    return warnings;
  }

  /**
   * Start monitoring connection health
   */
  startMonitoring(intervalMs = 30000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[DB Health] Starting database connection monitoring...');
    
    this.monitoringInterval = setInterval(() => {
      const health = this.isConnectionHealthy();
      
      if (!health.healthy) {
        console.warn('[DB Health] Connection health warning:', {
          status: health.status,
          warnings: health.warnings
        });
      } else if (process.env.NODE_ENV === 'development') {
        console.log('[DB Health] Connection status:', health.status);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('[DB Health] Stopped database connection monitoring');
    }
  }

  /**
   * Test connection with retry logic
   */
  async testConnection(maxRetries = 3, retryDelay = 1000) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const start = Date.now();
      
      try {
        // Check if client is available
        const dbClient = client();
        if (!dbClient || dbClient._ending) {
          throw new Error('Database client is not connected');
        }
        
        await query('SELECT 1');
        const latency = Date.now() - start;
        
        return {
          success: true,
          latency,
          attempt,
          connectionStatus: this.getConnectionStatus()
        };
      } catch (error) {
        lastError = error;
        const latency = Date.now() - start;
        
        console.warn(`[DB Health] Connection test attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // If this is the last attempt, return the failure
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message,
            latency,
            attempts: attempt,
            connectionStatus: this.getConnectionStatus()
          };
        }
        
        // Wait before retrying (unless it's the last attempt)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    // This should never be reached, but just in case
    return {
      success: false,
      error: lastError?.message || 'Unknown connection error',
      attempts: maxRetries,
      connectionStatus: this.getConnectionStatus()
    };
  }
  
  /**
   * Test connection with simple single attempt (for monitoring)
   */
  async testConnectionQuick() {
    return this.testConnection(1, 0);
  }
}

// Export singleton instance
const dbHealthCheck = new DatabaseHealthCheck();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  dbHealthCheck.startMonitoring(60000); // Every minute
}

module.exports = dbHealthCheck;
