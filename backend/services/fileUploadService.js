const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

class FileUploadService {
  constructor() {
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    this.uploadDir = path.join(__dirname, '../uploads');
    this.initializeUploadDir();
    
    // Initialize AWS S3 if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.s3Bucket = process.env.AWS_S3_BUCKET;
    }
  }

  async initializeUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['tenders', 'bids', 'users', 'temp'];
    for (const subdir of subdirs) {
      const dirPath = path.join(this.uploadDir, subdir);
      try {
        await fs.access(dirPath);
      } catch (error) {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }
  }

  // Multer storage configuration for local storage
  getLocalStorage(destination = 'temp') {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, destination);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });
  }

  // Multer memory storage for S3 uploads
  getMemoryStorage() {
    return multer.memoryStorage();
  }

  // File filter
  fileFilter(req, file, cb) {
    if (this.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  }

  // Create multer instance
  createMulter(destination = 'temp', useS3 = false) {
    const storage = useS3 ? this.getMemoryStorage() : this.getLocalStorage(destination);
    
    return multer({
      storage: storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 files per request
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  // Upload single file
  uploadSingle(fieldName, destination = 'temp', useS3 = false) {
    return this.createMulter(destination, useS3).single(fieldName);
  }

  // Upload multiple files
  uploadMultiple(fieldName, maxCount = 10, destination = 'temp', useS3 = false) {
    return this.createMulter(destination, useS3).array(fieldName, maxCount);
  }

  // Upload to S3
  async uploadToS3(file, destination = 'temp') {
    if (!this.s3 || !this.s3Bucket) {
      throw new Error('S3 is not configured');
    }

    const fileName = `${destination}/${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    
    const uploadParams = {
      Bucket: this.s3Bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private' // Files are private by default
    };

    try {
      const result = await this.s3.upload(uploadParams).promise();
      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  // Get signed URL for private S3 files
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.s3 || !this.s3Bucket) {
      throw new Error('S3 is not configured');
    }

    const params = {
      Bucket: this.s3Bucket,
      Key: key,
      Expires: expiresIn
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  // Process and save file information to database
  async saveFileInfo(fileData, uploadedBy, entityType, entityId) {
    const {
      originalname,
      filename,
      path: filepath,
      mimetype,
      size,
      s3Key,
      s3Url
    } = fileData;

    const result = await query(
      `INSERT INTO file_uploads (original_name, filename, filepath, mimetype, size, uploaded_by, entity_type, entity_id, s3_key, s3_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        originalname,
        filename || s3Key,
        filepath || s3Url,
        mimetype,
        size,
        uploadedBy,
        entityType,
        entityId,
        s3Key,
        s3Url
      ]
    );

    return result.rows[0];
  }

  // Get file by ID
  async getFileById(fileId) {
    const result = await query('SELECT * FROM file_uploads WHERE id = $1', [fileId]);
    return result.rows[0];
  }

  // Get files by entity
  async getFilesByEntity(entityType, entityId) {
    const result = await query(
      'SELECT * FROM file_uploads WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId]
    );
    return result.rows;
  }

  // Delete file
  async deleteFile(fileId, userId) {
    const file = await this.getFileById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Check permissions (only uploader or admin can delete)
    if (file.uploaded_by !== userId) {
      // Additional permission check can be added here
      throw new Error('Not authorized to delete this file');
    }

    // Delete from S3 if it's stored there
    if (file.s3_key && this.s3) {
      try {
        await this.s3.deleteObject({
          Bucket: this.s3Bucket,
          Key: file.s3_key
        }).promise();
      } catch (error) {
        console.error('Error deleting from S3:', error);
      }
    }

    // Delete local file if it exists
    if (file.filepath && !file.s3_key) {
      try {
        await fs.unlink(file.filepath);
      } catch (error) {
        console.error('Error deleting local file:', error);
      }
    }

    // Delete from database
    await query('DELETE FROM file_uploads WHERE id = $1', [fileId]);
    
    return { success: true, message: 'File deleted successfully' };
  }

  // Clean up temporary files older than 24 hours
  async cleanupTempFiles() {
    const tempDir = path.join(this.uploadDir, 'temp');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < oneDayAgo) {
          await fs.unlink(filePath);
          console.log(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Validate file type for specific entity
  validateFileForEntity(file, entityType) {
    const restrictions = {
      tender: {
        maxSize: 20 * 1024 * 1024, // 20MB
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
      },
      bid: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip'
        ]
      },
      user: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf'
        ]
      }
    };

    const restriction = restrictions[entityType];
    if (!restriction) {
      return { valid: true };
    }

    if (file.size > restriction.maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${restriction.maxSize / (1024 * 1024)}MB limit for ${entityType}`
      };
    }

    if (!restriction.allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed for ${entityType}`
      };
    }

    return { valid: true };
  }

  // Generate secure download URL
  async generateDownloadUrl(fileId, userId, expiresIn = 3600) {
    const file = await this.getFileById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Check if user has access to this file
    // This is a simplified check - you may want to add more sophisticated access control
    if (file.uploaded_by !== userId && !file.is_public) {
      throw new Error('Not authorized to access this file');
    }

    if (file.s3_key) {
      return await this.getSignedUrl(file.s3_key, expiresIn);
    } else {
      // For local files, return a token-based URL
      const token = require('../utils/encryption').encryptionService.generateToken();
      // Store token temporarily in cache/database for validation
      return `/api/files/download/${fileId}?token=${token}`;
    }
  }
}

// Export singleton instance
const fileUploadService = new FileUploadService();

// Middleware for handling file uploads
const handleFileUpload = (options = {}) => {
  const {
    fieldName = 'files',
    maxCount = 10,
    destination = 'temp',
    useS3 = process.env.USE_S3_STORAGE === 'true',
    entityType = null
  } = options;

  return (req, res, next) => {
    const upload = fileUploadService.uploadMultiple(fieldName, maxCount, destination, useS3);
    
    upload(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: 'Too many files'
            });
          }
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      // Validate files if entity type is specified
      if (entityType && req.files) {
        for (const file of req.files) {
          const validation = fileUploadService.validateFileForEntity(file, entityType);
          if (!validation.valid) {
            return res.status(400).json({
              success: false,
              message: validation.error
            });
          }
        }
      }

      // If using S3, upload files
      if (useS3 && req.files) {
        try {
          const uploadPromises = req.files.map(file => 
            fileUploadService.uploadToS3(file, destination)
          );
          
          const s3Results = await Promise.all(uploadPromises);
          
          // Add S3 info to file objects
          req.files.forEach((file, index) => {
            file.s3Key = s3Results[index].key;
            file.s3Url = s3Results[index].url;
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload files to cloud storage'
          });
        }
      }

      next();
    });
  };
};

// Schedule cleanup job (run every 6 hours)
setInterval(() => {
  fileUploadService.cleanupTempFiles();
}, 6 * 60 * 60 * 1000);

module.exports = {
  fileUploadService,
  handleFileUpload
};
