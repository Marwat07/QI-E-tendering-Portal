const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = this.getSecretKey();
    this.ivLength = 16; // For GCM, this is recommended to be 12 bytes, but we'll use 16 for compatibility
    this.saltLength = 64;
    this.tagLength = 16;
    this.tagPosition = this.saltLength + this.ivLength;
    this.encryptedPosition = this.tagPosition + this.tagLength;
  }

  getSecretKey() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    return crypto.scryptSync(secret, 'salt', 32);
  }

  encrypt(text) {
    if (!text) return null;
    
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);
      
      cipher.setAAD(salt);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const buffer = Buffer.from(encryptedText, 'base64');
      
      const salt = buffer.slice(0, this.saltLength);
      const iv = buffer.slice(this.saltLength, this.tagPosition);
      const tag = buffer.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = buffer.slice(this.encryptedPosition);
      
      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash sensitive data for searching (one-way)
  hash(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  // Encrypt object fields
  encryptObject(obj, fieldsToEncrypt = []) {
    const result = { ...obj };
    const encryptedFields = {};
    
    fieldsToEncrypt.forEach(field => {
      if (result[field]) {
        encryptedFields[field] = this.encrypt(result[field].toString());
        delete result[field];
      }
    });
    
    if (Object.keys(encryptedFields).length > 0) {
      result.encrypted_fields = encryptedFields;
    }
    
    return result;
  }

  // Decrypt object fields
  decryptObject(obj, fieldsToDecrypt = []) {
    const result = { ...obj };
    
    if (result.encrypted_fields) {
      fieldsToDecrypt.forEach(field => {
        if (result.encrypted_fields[field]) {
          try {
            result[field] = this.decrypt(result.encrypted_fields[field]);
          } catch (error) {
            console.error(`Failed to decrypt field ${field}:`, error);
            result[field] = null;
          }
        }
      });
    }
    
    return result;
  }

  // Generate secure random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate secure random password
  generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  // Create HMAC signature
  createSignature(data, secret = null) {
    const key = secret || this.secretKey;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  // Verify HMAC signature
  verifySignature(data, signature, secret = null) {
    const key = secret || this.secretKey;
    const expectedSignature = crypto.createHmac('sha256', key).update(data).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  }
}

// Singleton instance
const encryptionService = new EncryptionService();

// Middleware to encrypt sensitive bid fields before saving
const encryptBidData = (req, res, next) => {
  if (req.body) {
    const sensitiveFields = ['amount', 'commercial_proposal'];
    req.body = encryptionService.encryptObject(req.body, sensitiveFields);
  }
  next();
};

// Middleware to decrypt sensitive bid fields after retrieval
const decryptBidData = (bidData) => {
  if (!bidData) return bidData;
  
  const sensitiveFields = ['amount', 'commercial_proposal'];
  
  if (Array.isArray(bidData)) {
    return bidData.map(bid => encryptionService.decryptObject(bid, sensitiveFields));
  } else {
    return encryptionService.decryptObject(bidData, sensitiveFields);
  }
};

// Middleware to encrypt sensitive tender fields
const encryptTenderData = (req, res, next) => {
  if (req.body) {
    const sensitiveFields = ['budget_min', 'budget_max', 'estimated_value'];
    req.body = encryptionService.encryptObject(req.body, sensitiveFields);
  }
  next();
};

// Decrypt tender data
const decryptTenderData = (tenderData) => {
  if (!tenderData) return tenderData;
  
  const sensitiveFields = ['budget_min', 'budget_max', 'estimated_value'];
  
  if (Array.isArray(tenderData)) {
    return tenderData.map(tender => encryptionService.decryptObject(tender, sensitiveFields));
  } else {
    return encryptionService.decryptObject(tenderData, sensitiveFields);
  }
};

module.exports = {
  encryptionService,
  encryptBidData,
  decryptBidData,
  encryptTenderData,
  decryptTenderData
};
