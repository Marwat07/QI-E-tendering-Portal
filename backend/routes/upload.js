const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, XLS, and XLSX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/upload/view/:filename - View file inline in browser
router.get('/view/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Try multiple possible file locations
    const possiblePaths = [
      path.join(uploadsDir, filename),
      path.join(uploadsDir, 'bids', filename),
      path.join(uploadsDir, 'tenders', filename)
    ];
    
    let filePath = null;
    let foundPath = null;
    
    // Find the actual file location
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        foundPath = possiblePath;
        break;
      }
    }

    console.log(`View request: ${filename}`);
    console.log(`Checked paths: ${possiblePaths.join(', ')}`);
    console.log(`Found at: ${foundPath || 'NOT FOUND'}`);

    // Check if file exists
    if (!filePath) {
      console.log(`File not found in any location: ${filename}`);
      return res.status(404).json({
        success: false,
        message: `File not found: ${filename}`,
        checkedPaths: possiblePaths,
        exists: false
      });
    }

    // Get file stats for additional headers
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Set appropriate content type for inline viewing
    let contentType = 'application/octet-stream';
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    if (contentTypes[ext]) {
      contentType = contentTypes[ext];
    }
    
    // Set headers for inline viewing (no Content-Disposition: attachment)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour for better performance
    
    // For PDFs and text files, add inline disposition
    if (ext === '.pdf' || ext === '.txt') {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({
      success: false,
      message: 'File view failed'
    });
  }
});

// GET /api/upload/download/:filename - Download uploaded file
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Try multiple possible file locations
    const possiblePaths = [
      path.join(uploadsDir, filename),
      path.join(uploadsDir, 'bids', filename),
      path.join(uploadsDir, 'tenders', filename)
    ];
    
    let filePath = null;
    let foundPath = null;
    
    // Find the actual file location
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        foundPath = possiblePath;
        break;
      }
    }
    
    // Get original filename from query parameter if provided
    const originalName = req.query.original || filename;

    console.log(`Download request: ${filename}`);
    console.log(`Checked paths: ${possiblePaths.join(', ')}`);
    console.log(`Found at: ${foundPath || 'NOT FOUND'}`);

    // Check if file exists
    if (!filePath) {
      console.log(`File not found in any location: ${filename}`);
      return res.status(404).json({
        success: false,
        message: `File not found: ${filename}`,
        checkedPaths: possiblePaths,
        exists: false
      });
    }

    // Get file stats for additional headers
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    if (contentTypes[ext]) {
      contentType = contentTypes[ext];
    }
    
    // Set headers for download with original filename
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'File download failed'
    });
  }
});

// Apply authentication to all other routes
router.use(protect);

// POST /api/upload - Single file upload
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// POST /api/upload/multiple - Multiple file upload
router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});


// DELETE /api/upload/:filename - Delete uploaded file
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed'
    });
  }
});

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    message: error.message || 'File upload failed'
  });
});

module.exports = router;
