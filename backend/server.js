const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const dbHealthCheck = require('./utils/dbHealthCheck');
const databaseMiddleware = require('./middleware/database');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tenderRoutes = require('./routes/tenders');
const bidRoutes = require('./routes/enhancedBids'); // Use enhanced bid routes
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const filesRoutes = require('./routes/files');

const app = express();

// Database connection
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/files', filesRoutes);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Comprehensive health check endpoint with database status
app.get('/api/health/detailed', async (req, res) => {
  try {
    const testResult = await dbHealthCheck.testConnection();
    const connectionHealth = dbHealthCheck.isConnectionHealthy();
    const connectionStatus = dbHealthCheck.getConnectionStatus();
    
    const healthData = {
      status: testResult.success && connectionHealth.healthy ? 'OK' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        connection: {
          success: testResult.success,
          latency: testResult.latency,
          error: testResult.error || null
        },
        client: {
          healthy: connectionHealth.healthy,
          status: connectionStatus,
          warnings: connectionHealth.warnings,
          configuration: {
            type: 'single_connection',
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'Bidding',
            connectionTimeout: 5000
          }
        }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
    
    const statusCode = healthData.status === 'OK' ? 200 : 503;
    res.status(statusCode).json({
      success: healthData.status === 'OK',
      data: healthData
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'ERROR',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Database-specific health check endpoint (admin access recommended)
app.get('/api/health/database', databaseMiddleware.healthCheck);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please check if another instance is running or use a different port.`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  logger.error('Promise:', promise);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
