const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Helper function to parse file ID and get file info
const parseFileId = (fileId) => {
  // File ID format: tenderId_index (e.g., "123_0", "456_2")
  const parts = fileId.split('_');
  if (parts.length !== 2) {
    throw new Error('Invalid file ID format');
  }
  return {
    tenderId: parts[0],
    index: parseInt(parts[1])
  };
};

// Helper function to get file from tender attachments
const getFileFromTender = async (tenderId, index) => {
  const Tender = require('../models/Tender');
  const tender = await Tender.findById(tenderId);
  
  if (!tender) {
    throw new Error('Tender not found');
  }

  if (!tender.attachments || tender.attachments.length <= index) {
    throw new Error('File not found');
  }

  const attachment = tender.attachments[index];
  
  // Handle complex attachment structure
  let filename;
  if (attachment.data && attachment.data.filename) {
    filename = attachment.data.filename;
  } else if (attachment.filename) {
    filename = attachment.filename;
  } else if (attachment.name) {
    filename = attachment.name;
  } else if (typeof attachment === 'string') {
    filename = attachment;
  } else {
    throw new Error('Unable to determine filename from attachment');
  }
  
  return {
    tender,
    attachment,
    filename
  };
};

// GET /api/files/:id/view - View file inline in browser
router.get('/:id/view', async (req, res) => {
  try {
    const fileId = req.params.id;
    const { tenderId, index } = parseFileId(fileId);
    
    const { tender, filename } = await getFileFromTender(tenderId, index);
    
    // Check if tender is publicly accessible
    if (tender.status !== 'open' || new Date(tender.deadline) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'File is not publicly accessible'
      });
    }

    // Build file path
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Get file stats for headers
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
    
    // Set headers for inline viewing
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // For PDFs and text files, add inline disposition
    if (ext === '.pdf' || ext === '.txt') {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({
      success: false,
      message: 'File view failed',
      error: error.message
    });
  }
});

// GET /api/files/:id/download - Download file
router.get('/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const { tenderId, index } = parseFileId(fileId);
    
    const { tender, filename } = await getFileFromTender(tenderId, index);
    
    // Check if tender is publicly accessible
    if (tender.status !== 'open' || new Date(tender.deadline) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'File is not publicly accessible'
      });
    }

    // Build file path
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Get file stats for headers
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
    
    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'File download failed',
      error: error.message
    });
  }
});

module.exports = router;
