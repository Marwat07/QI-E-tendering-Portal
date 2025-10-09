const logger = require('../utils/logger');

/**
 * Middleware to check if user's credentials are expired
 * Should be used after auth middleware to ensure req.user is populated
 */
const checkCredentialExpiry = (options = {}) => {
  const {
    allowExpired = false,  // Allow access even if expired (just add warning)
    redirectExpired = false // Send specific response for expired credentials
  } = options;

  return (req, res, next) => {
    try {
      // Skip check if no user (not authenticated)
      if (!req.user) {
        return next();
      }

      // Check if user has credential expiry date
      if (!req.user.credential_expires_at) {
        // No expiry date set, allow access
        return next();
      }

      const isExpired = req.user.isCredentialExpired();
      const credentialStatus = req.user.getCredentialStatus();
      const daysUntilExpiry = req.user.getDaysUntilExpiry();

      // Add credential info to request for use in routes
      req.credentialInfo = {
        status: credentialStatus.status,
        message: credentialStatus.message,
        daysUntilExpiry,
        isExpired,
        expiresAt: req.user.credential_expires_at
      };

      // Handle expired credentials
      if (isExpired) {
        logger.warn(`User ${req.user.email} attempting to access protected route with expired credentials`);
        
        if (!allowExpired) {
          return res.status(401).json({
            success: false,
            message: 'Your credentials have expired. Please contact an administrator to renew your access.',
            code: 'CREDENTIALS_EXPIRED',
            expired: true,
            credentialInfo: req.credentialInfo
          });
        }
      }

      // Handle credentials expiring soon (warning)
      if (credentialStatus.status === 'critical' || credentialStatus.status === 'warning') {
        logger.info(`User ${req.user.email} has credentials expiring in ${daysUntilExpiry} days`);
        
        // Add warning to response headers
        res.set('X-Credential-Warning', credentialStatus.message);
        res.set('X-Credential-Days-Until-Expiry', daysUntilExpiry.toString());
        res.set('X-Credential-Status', credentialStatus.status);
      }

      next();
    } catch (error) {
      logger.error('Error in credential expiry middleware:', error);
      // Don't block access on middleware errors
      next();
    }
  };
};

/**
 * Strict credential check - blocks access for expired credentials
 */
const requireValidCredentials = checkCredentialExpiry({
  allowExpired: false,
  redirectExpired: true
});

/**
 * Lenient credential check - allows access but adds warnings
 */
const checkCredentialsWithWarning = checkCredentialExpiry({
  allowExpired: true,
  redirectExpired: false
});

/**
 * Middleware to require admin role AND valid credentials
 */
const requireAdminWithValidCredentials = (req, res, next) => {
  // First check if user is admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }

  // Then check credentials
  return requireValidCredentials(req, res, next);
};

/**
 * Get credential status for user (utility function for routes)
 */
const getCredentialStatus = (user) => {
  if (!user || !user.credential_expires_at) {
    return {
      status: 'no_expiry',
      message: 'No credential expiry set',
      isExpired: false,
      daysUntilExpiry: null
    };
  }

  return {
    status: user.getCredentialStatus().status,
    message: user.getCredentialStatus().message,
    isExpired: user.isCredentialExpired(),
    daysUntilExpiry: user.getDaysUntilExpiry(),
    expiresAt: user.credential_expires_at
  };
};

module.exports = {
  checkCredentialExpiry,
  requireValidCredentials,
  checkCredentialsWithWarning,
  requireAdminWithValidCredentials,
  getCredentialStatus
};