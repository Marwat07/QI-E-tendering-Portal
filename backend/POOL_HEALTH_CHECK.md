# Database Pool Health Check System

This document describes the comprehensive database pool health monitoring and debugging system implemented for the e-tendering portal backend.

## Overview

The pool health check system provides:
- Real-time monitoring of database connection pool status
- Health assessment with warnings and alerts
- Retry logic for connection testing
- Administrative endpoints for pool management
- Automated pool warmup and cleanup

## Quick Start

### Check Pool Health
```bash
npm run health:pool
```

### Monitor Pool for 30 seconds
```bash
npm run health:pool:monitor
```

### Debug Pool for 10 seconds
```bash
npm run debug:pool
```

### Database Health Check
```bash
npm run health:db
```

## Health Check Endpoints

### Public Endpoints

#### Basic Health Check
```
GET /api/health
```
Returns basic server status without database information.

#### Detailed Health Check
```
GET /api/health/detailed
```
Returns comprehensive health information including:
- Database connection status
- Pool health metrics
- Server uptime and memory usage
- Connection latency

#### Database Health Check
```
GET /api/health/database
```
Returns detailed database and pool status information.

### Admin Endpoints (Authentication Required)

#### Pool Health Status
```
GET /api/admin/health/pool
```
Returns detailed pool health information for admin monitoring.

#### Force Pool Cleanup
```
POST /api/admin/health/pool/cleanup
```
Forces cleanup of idle connections and returns before/after status.

#### Pool Monitoring Control
```
POST /api/admin/health/monitor
Content-Type: application/json

{
  "action": "start|stop",
  "interval": 30000  // milliseconds (optional)
}
```

#### Comprehensive Database Health
```
GET /api/admin/health/database
```
Returns full database health report with connection testing.

## Pool Configuration

Current pool settings:
- **Max Connections**: 20
- **Min Connections**: 2 (enforced with warmup)
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 5 seconds
- **Acquire Timeout**: 60 seconds

## Health Metrics

### Pool Status
- `totalCount`: Total active connections
- `idleCount`: Available idle connections
- `waitingCount`: Requests waiting for connections
- `expiredCount`: Expired connections

### Health Indicators
- **Healthy**: `waitingCount < 5` AND `utilization < 80%`
- **Utilization**: `(totalCount - idleCount) / maxConnections * 100`

### Warnings
- High connection utilization (>80%)
- Connections waiting for available clients
- Pool at maximum capacity with no idle connections
- Database pool not initialized

## Monitoring Features

### Automatic Monitoring
- Development mode: Auto-starts monitoring every minute
- Production mode: Monitoring disabled by default
- Pool events logged for connect/acquire/remove operations

### Manual Monitoring
- Use monitoring endpoints to start/stop monitoring
- Customizable monitoring intervals
- Real-time health status updates

## Troubleshooting

### Common Issues

1. **Pool Not Initialized Error**
   ```bash
   npm run health:pool
   ```
   Check if database connection is properly configured.

2. **High Connection Utilization**
   ```bash
   npm run health:pool:monitor
   ```
   Monitor for connection leaks or high load.

3. **Connection Timeouts**
   - Check database server status
   - Verify network connectivity
   - Review connection timeout settings

### Debug Commands

```bash
# Check current pool status
npm run health:pool

# Monitor pool for extended period
node scripts/check_pool_health.js monitor 60

# Test database connectivity
npm run health:db

# Force pool cleanup (requires admin access)
curl -X POST http://localhost:5000/api/admin/health/pool/cleanup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Files Modified

### Core Health Check Files
- `utils/dbHealthCheck.js` - Main health check utility
- `middleware/database.js` - Database middleware with health endpoints
- `scripts/check_pool_health.js` - CLI health check script
- `scripts/db_health_check.js` - Database connectivity test

### Server Integration
- `server.js` - Added health endpoints and database middleware
- `routes/admin.js` - Added admin health check routes
- `config/database.js` - Added pool warmup and improved initialization

### Configuration
- `package.json` - Added health check npm scripts

## API Response Examples

### Detailed Health Check Response
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "database": {
      "connection": {
        "success": true,
        "latency": 4,
        "attempt": 1
      },
      "pool": {
        "healthy": true,
        "status": {
          "totalCount": 2,
          "idleCount": 2,
          "waitingCount": 0,
          "expiredCount": 0
        },
        "utilization": 0,
        "warnings": []
      }
    },
    "uptime": 123.45,
    "memory": {
      "rss": 45678912,
      "heapTotal": 23456789,
      "heapUsed": 12345678
    }
  }
}
```

### Pool Cleanup Response
```json
{
  "success": true,
  "message": "Pool cleanup completed successfully",
  "data": {
    "before": {
      "totalCount": 5,
      "idleCount": 3,
      "waitingCount": 0
    },
    "after": {
      "totalCount": 2,
      "idleCount": 2,
      "waitingCount": 0
    },
    "connectionsReleased": 3
  }
}
```

## Best Practices

1. **Regular Monitoring**: Use the monitoring endpoints in production
2. **Pool Warmup**: Automatic warmup ensures minimum connections are available
3. **Error Handling**: All health checks include retry logic and proper error handling
4. **Graceful Shutdown**: Pool connections are properly closed on application termination
5. **Debugging**: Use the debug scripts for troubleshooting connection issues

## Performance Considerations

- Health checks use minimal resources
- Monitoring intervals should be balanced (30-60 seconds recommended)
- Pool warmup improves initial request latency
- Automatic cleanup prevents connection leaks
