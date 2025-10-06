import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react';
import './AdminUploadPDF.css';

const AdminUploadPDF = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tenderId = searchParams.get('tenderId');
  const [tender, setTender] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (tenderId) {
      fetchTenderDetails();
      fetchUploadedFiles();
    }
  }, [tenderId]);

  const fetchTenderDetails = async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTender(data);
      }
    } catch (error) {
      console.error('Error fetching tender details:', error);
      toast.error('Failed to load tender details');
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenders/${tenderId}/files`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadPromises = [];

    try {
      for (const file of files) {
        // Validate file type
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} is not a PDF file. Only PDF files are allowed.`);
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('tenderId', tenderId);
        formData.append('type', 'tender_document');

        uploadPromises.push(
          fetch('/api/admin/upload/tender-pdf', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        );
      }

      const responses = await Promise.all(uploadPromises);
      let successCount = 0;
      let failCount = 0;

      for (const response of responses) {
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully!`);
        fetchUploadedFiles(); // Refresh the file list
      }

      if (failCount > 0) {
        toast.error(`${failCount} file(s) failed to upload.`);
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
    e.target.value = ''; // Reset input
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('File deleted successfully');
        fetchUploadedFiles(); // Refresh the file list
      } else {
        toast.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await fetch(`/api/admin/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleViewFile = async (file) => {
    try {
      const response = await fetch(`/api/admin/files/${file.id}/view`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        toast.error('Failed to view file');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="admin-upload-pdf">
        <div className="access-denied">
          <AlertCircle size={64} />
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-upload-pdf">
      <div className="upload-container">
        <header className="upload-header">
          <div className="header-content">
            <h1>Admin PDF Upload</h1>
            {tender && (
              <div className="tender-info">
                <h2>{tender.title}</h2>
                <p>Tender ID: {tender.id} | Upload and manage PDF documents for this tender</p>
              </div>
            )}
          </div>
        </header>

        {/* Upload Section */}
        <div className="upload-section">
          <h3>Upload PDF Documents</h3>
          
          <div
            className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <div className="dropzone-content">
              <Upload size={48} />
              <h4>Drop PDF files here or click to browse</h4>
              <p>Upload tender documents, specifications, and other relevant PDFs</p>
              <p className="upload-limit">Maximum file size: 10MB per file | PDF files only</p>
              
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="file-input"
                id="file-upload"
                disabled={uploading}
              />
              
              <label htmlFor="file-upload" className="upload-button" onClick={(e) => e.stopPropagation()}>
                <Upload size={16} />
                Select Files
              </label>
            </div>

            {uploading && (
              <div className="upload-progress">
                <div className="spinner"></div>
                <p>Uploading files...</p>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files Section */}
        <div className="files-section">
          <div className="section-header">
            <h3>Uploaded Documents</h3>
            <span className="file-count">{uploadedFiles.length} file(s)</span>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading files...</p>
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h4>No files uploaded yet</h4>
              <p>Upload PDF documents to get started</p>
            </div>
          ) : (
            <div className="files-grid">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-header">
                    <FileText size={24} />
                    <div className="file-info">
                      <h4 className="file-name">{file.filename}</h4>
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="file-date">{formatDate(file.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="file-actions">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="action-btn view"
                      title="View PDF"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="action-btn download"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="action-btn delete"
                      title="Delete PDF"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="instructions-section">
          <h3>Instructions</h3>
          <ul>
            <li>Only PDF files are allowed for upload</li>
            <li>Maximum file size is 10MB per file</li>
            <li>You can upload multiple files at once</li>
            <li>Drag and drop files or click to browse</li>
            <li>Files will be associated with the selected tender</li>
            <li>Use the view button to preview PDFs in a new tab</li>
            <li>Download button saves files to your computer</li>
            <li>Delete button permanently removes files (cannot be undone)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadPDF;
