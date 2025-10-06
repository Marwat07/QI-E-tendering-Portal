import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Building,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  Clock
} from 'lucide-react';
import './TenderPDFViewer.css';

const TenderPDFViewer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenderId = searchParams.get('tenderId');
  const [tender, setTender] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (tenderId) {
      fetchTenderDetails();
      fetchTenderPDFs();
    }
  }, [tenderId]);

  const fetchTenderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTender(data);
        
        // Check if tender is expired
        const now = new Date();
        const deadline = new Date(data.deadline);
        setIsExpired(now > deadline);
      } else {
        toast.error('Failed to load tender details');
      }
    } catch (error) {
      console.error('Error fetching tender details:', error);
      toast.error('Failed to load tender details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenderPDFs = async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/files`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files || []);
      } else {
        // If API doesn't exist yet, show empty files
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Error fetching tender files:', error);
      setUploadedFiles([]);
    }
  };

  const handleViewFile = async (file) => {
    try {
      const response = await fetch(`/api/files/${file.id}/view`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        toast.error('Failed to view file');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file');
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`, {
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

  const handleBidClick = () => {
    if (isExpired) {
      toast.error('This tender has expired. No more bids can be submitted.');
      return;
    }

    if (user?.role === 'admin') {
      toast.info('Admins cannot submit bids.');
      return;
    }

    // Navigate to bid submission page
    navigate(`/bid/${tenderId}`);
  };

  const handleManageDocuments = () => {
    // Open admin upload PDF in new tab
    const adminUploadUrl = `/admin/upload-pdf?tenderId=${tenderId}`;
    window.open(adminUploadUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDaysUntilExpiry = () => {
    if (!tender?.deadline) return null;
    const now = new Date();
    const deadline = new Date(tender.deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="tender-viewer">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tender details...</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="tender-viewer">
        <div className="error-container">
          <AlertCircle size={64} />
          <h2>Tender Not Found</h2>
          <p>The requested tender could not be found or you don't have permission to view it.</p>
          <button onClick={() => window.close()} className="btn-primary">
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="tender-viewer">
      <div className="viewer-container">
        {/* Header */}
        <header className="tender-header">
          <div className="header-content">
            <div className="tender-status">
              {isExpired ? (
                <span className="status-badge expired">
                  <XCircle size={16} />
                  Expired
                </span>
              ) : (
                <span className="status-badge active">
                  <CheckCircle size={16} />
                  Active
                </span>
              )}
              {!isExpired && daysUntilExpiry !== null && (
                <span className="time-remaining">
                  <Clock size={16} />
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expires today'}
                </span>
              )}
            </div>
            <h1 className="tender-title">{tender.title}</h1>
            <p className="tender-id">Tender ID: {tenderId}</p>
          </div>
        </header>

        {/* Tender Details */}
        <div className="tender-details">
          <h2>Tender Information</h2>
          <div className="details-grid">
            <div className="detail-card">
              <Calendar size={24} />
              <div>
                <h3>Deadline</h3>
                <p>{formatDate(tender.deadline)}</p>
              </div>
            </div>

            <div className="detail-card">
              <DollarSign size={24} />
              <div>
                <h3>Budget Range</h3>
                <p>
                  ${tender.budget_min?.toLocaleString() || '0'} - ${tender.budget_max?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            <div className="detail-card">
              <Building size={24} />
              <div>
                <h3>Category</h3>
                <p>{tender.category_name || 'Not specified'}</p>
              </div>
            </div>

            <div className="detail-card">
              <FileText size={24} />
              <div>
                <h3>Description</h3>
                <p>{tender.description || 'No description provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="documents-section">
          <div className="section-header">
            <h2>Tender Documents</h2>
            <div className="header-actions">
              {user?.role === 'admin' && (
                <button onClick={handleManageDocuments} className="btn-secondary">
                  <Upload size={16} />
                  Manage Documents
                </button>
              )}
              <span className="file-count">{uploadedFiles.length} file(s)</span>
            </div>
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Documents Available</h3>
              <p>No PDF documents have been uploaded for this tender yet.</p>
              {user?.role === 'admin' && (
                <button onClick={handleManageDocuments} className="btn-primary">
                  <Upload size={16} />
                  Upload Documents
                </button>
              )}
            </div>
          ) : (
            <div className="documents-grid">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="document-card">
                  <div className="document-header">
                    <FileText size={24} />
                    <div className="document-info">
                      <h4 className="document-name">{file.filename}</h4>
                      <div className="document-meta">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="upload-date">
                          Uploaded: {formatDate(file.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="document-actions">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="action-btn view"
                      title="View PDF"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="action-btn download"
                      title="Download PDF"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-section">
          {user?.role !== 'admin' && (
            <div className="bid-section">
              <div className="bid-info">
                <h3>Submit Your Bid</h3>
                <p>
                  {isExpired 
                    ? 'This tender has expired and no longer accepts bids.'
                    : `Submit your bid before ${formatDate(tender.deadline)}`
                  }
                </p>
              </div>
              <button
                onClick={handleBidClick}
                disabled={isExpired}
                className={`btn-bid ${isExpired ? 'expired' : 'active'}`}
              >
                {isExpired ? (
                  <>
                    <XCircle size={16} />
                    Bid Expired
                  </>
                ) : (
                  <>
                    <DollarSign size={16} />
                    Submit Bid
                  </>
                )}
              </button>
            </div>
          )}

          <div className="general-actions">
            <button onClick={() => window.print()} className="btn-secondary">
              Print Details
            </button>
            <button onClick={() => window.close()} className="btn-secondary">
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenderPDFViewer;
