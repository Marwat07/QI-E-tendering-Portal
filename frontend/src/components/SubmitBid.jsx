import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { showToast } from '../utils/toast';
import './SubmitBid.css';

const SubmitBid = () => {
  const { tenderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState(null);
  const [existingBid, setExistingBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [bidData, setBidData] = useState({
    amount: '',
    proposal: '',
    deliveryTimeline: ''
  });
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (tenderId) {
      fetchTenderAndBidData();
    }
  }, [tenderId, user.id]);

  const fetchTenderAndBidData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tender details
      const tenderResponse = await apiService.get(`/tenders/${tenderId}`);
      setTender(tenderResponse.data.tender);
      
      // Check if user already has a bid for this tender
      try {
        const bidsResponse = await apiService.get('/bids', { 
          vendor_id: user.id,
          tender_id: tenderId
        });
        
        if (bidsResponse.data?.bids?.length > 0) {
          const existingBid = bidsResponse.data.bids[0];
          setExistingBid(existingBid);
          setBidData({
            amount: existingBid.amount || '',
            proposal: existingBid.proposal || '',
            deliveryTimeline: existingBid.delivery_timeline || ''
          });
          
          // Load existing attachments if any
          if (existingBid.attachments && Array.isArray(existingBid.attachments)) {
            setUploadedFiles(existingBid.attachments);
          }
        }
      } catch (bidError) {
        console.log('No existing bid found or error checking:', bidError);
      }
      
    } catch (err) {
      console.error('Error fetching tender data:', err);
      setError('Failed to load tender details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBidData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateFiles = (files) => {
    console.log('Files selected:', files);
    
    if (files.length === 0) return { valid: true, files: [] };

    // Validate files
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      console.log(`Validating file: ${file.name}, type: ${file.type}, size: ${file.size}`);
      
      // Check file type by MIME type or extension
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
      
      if (!isValidType) {
        const errorMsg = `File "${file.name}" is not allowed. Please upload PDF, DOC, DOCX, XLS, XLSX, or TXT files.`;
        setError(errorMsg);
        showToast.fileValidationError(errorMsg);
        return { valid: false };
      }
      if (file.size > maxSize) {
        const errorMsg = `File "${file.name}" is too large. Maximum size is 10MB.`;
        setError(errorMsg);
        showToast.fileValidationError(errorMsg);
        return { valid: false };
      }
    }

    return { valid: true, files };
  };

  const handleFileSelection = (files) => {
    const validation = validateFiles(files);
    
    if (validation.valid) {
      setSelectedFiles(prev => [...prev, ...files]);
      setError(null);
      showToast.filesSelected(files.length);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    handleFileSelection(files);
    // Reset the input value so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const removeFile = async (fileIndex) => {
    // Determine if this is an uploaded file or a selected file
    if (fileIndex < uploadedFiles.length) {
      // This is an uploaded file
      const fileToRemove = uploadedFiles[fileIndex];
      
      if (fileToRemove.filename) {
        try {
          await apiService.delete(`/upload/${fileToRemove.filename}`);
          showToast.info(`File "${fileToRemove.name || fileToRemove.filename}" removed`);
        } catch (err) {
          console.error('Error removing uploaded file:', err);
          showToast.error('Failed to remove uploaded file');
        }
      }
      setUploadedFiles(prev => prev.filter((_, index) => index !== fileIndex));
    } else {
      // This is a selected file (not yet uploaded)
      const selectedIndex = fileIndex - uploadedFiles.length;
      const fileToRemove = selectedFiles[selectedIndex];
      
      setSelectedFiles(prev => prev.filter((_, index) => index !== selectedIndex));
      showToast.info(`File "${fileToRemove.name}" removed from selection`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bidData.amount || !bidData.proposal) {
      setError('Please fill in all required fields (Amount and Proposal).');
      showToast.requiredFieldsError();
      return;
    }

    if (bidData.proposal.length < 100) {
      setError('Proposal must be at least 100 characters long.');
      showToast.proposalTooShort();
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      
      // Add bid data
      formData.append('tender_id', parseInt(tenderId));
      formData.append('amount', parseFloat(bidData.amount));
      formData.append('proposal', bidData.proposal);
      if (bidData.deliveryTimeline) {
        formData.append('delivery_timeline', bidData.deliveryTimeline);
      }
      
      // Add existing attachments data
      if (uploadedFiles.length > 0) {
        formData.append('attachments', JSON.stringify(uploadedFiles));
      }
      
      // Add new files to be uploaded
      selectedFiles.forEach(file => {
        formData.append('documents', file);
      });

      if (existingBid) {
        // Update existing bid
        await apiService.put(`/bids/${existingBid.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        showToast.bidUpdated();
      } else {
        // Create new bid using enhanced endpoint
        await apiService.post('/bids', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        showToast.bidSubmitted();
      }

      // Clear selected files after successful submission
      setSelectedFiles([]);
      navigate('/my-bids');
      
    } catch (err) {
      console.error('Error submitting bid:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to submit bid. Please try again.';
      setError(errorMsg);
      showToast.bidSubmissionError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount, currency = 'PKR') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency || 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="submit-bid-loading">
        <div className="loading-spinner"></div>
        <p>Loading tender details...</p>
      </div>
    );
  }

  if (error && !tender) {
    return (
      <div className="submit-bid-error">
        <h2>Error Loading Tender</h2>
        <p>{error}</p>
        <button onClick={fetchTenderAndBidData} className="btn btn-primary">
          Retry
        </button>
        <button onClick={() => navigate('/active-tenders')} className="btn btn-secondary">
          Back to Tenders
        </button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(tender?.deadline);
  const isExpired = daysRemaining < 0;

  if (isExpired) {
    return (
      <div className="submit-bid-expired">
        <h2>Tender Expired</h2>
        <p>The deadline for this tender has passed. You can no longer submit or update bids.</p>
        <button onClick={() => navigate('/active-tenders')} className="btn btn-primary">
          Browse Active Tenders
        </button>
      </div>
    );
  }

  return (
    <div className="submit-bid">
      {/* Header */}
      <div className="submit-bid-header">
        <h1>{existingBid ? 'Update Your Bid' : 'Submit Your Bid'}</h1>
        <p>Provide your competitive offer for this tender opportunity</p>
      </div>

      {/* Tender Info */}
      {tender && (
        <div className="tender-info-card">
          <h2>{tender.title}</h2>
          <div className="tender-details">
            <div className="tender-detail">
              <span className="label">Budget Range:</span>
              <span className="value">
                {tender.budget_min && tender.budget_max 
                  ? `${formatCurrency(tender.budget_min)} - ${formatCurrency(tender.budget_max)}`
                  : formatCurrency(tender.budget_max || tender.budget_min)
                }
              </span>
            </div>
            <div className="tender-detail">
              <span className="label">Deadline:</span>
              <span className="value">
                {formatDate(tender.deadline)}
                {daysRemaining > 0 && (
                  <span className={`days-remaining ${daysRemaining <= 3 ? 'urgent' : ''}`}>
                    ({daysRemaining} days left)
                  </span>
                )}
              </span>
            </div>
            <div className="tender-detail">
              <span className="label">Category:</span>
              <span className="value">{tender.category_name || 'General'}</span>
            </div>
          </div>
          <div className="tender-description">
            <strong>Description:</strong>
            <p>{tender.description}</p>
          </div>
        </div>
      )}

      {/* Bid Form */}
      <div className="bid-form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Bid Details</h3>
            
            <div className="form-group">
              <label htmlFor="amount">Bid Amount *</label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                value={bidData.amount}
                onChange={handleInputChange}
                required
                placeholder="Enter your bid amount"
              />
              <small>Enter the total amount you're bidding for this tender</small>
            </div>

            <div className="form-group">
              <label htmlFor="deliveryTimeline">Delivery Timeline</label>
              <input
                type="text"
                id="deliveryTimeline"
                name="deliveryTimeline"
                value={bidData.deliveryTimeline}
                onChange={handleInputChange}
                placeholder="e.g., 30 days, 2 weeks, etc."
              />
              <small>Specify how long it will take to complete the work</small>
            </div>
          </div>

          <div className="form-section">
            <h3>Proposal</h3>
            
            <div className="form-group">
              <label htmlFor="proposal">Technical Proposal *</label>
              <textarea
                id="proposal"
                name="proposal"
                rows={8}
                value={bidData.proposal}
                onChange={handleInputChange}
                required
                placeholder="Describe your approach, methodology, team qualifications, and how you plan to meet the tender requirements..."
              />
              <small>Minimum 100 characters required. Provide a detailed proposal explaining your solution.</small>
            </div>

          </div>

          <div className="form-section">
            <h3>Supporting Documents</h3>
            
            <div className="form-group">
              <label htmlFor="documents">Upload Documents</label>
              <div 
                className={`file-upload-area ${isDragOver ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('documents').click()}
              >
                <input
                  type="file"
                  id="documents"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                <div className="file-upload-content">
                  <div className="file-upload-icon">📎</div>
                  <div className="file-upload-text">
                    <p><strong>Click to upload</strong> or drag and drop</p>
                    <p>PDF, DOC, DOCX, XLS, XLSX, TXT files up to 10MB each</p>
                  </div>
                </div>
              </div>
              <small>Upload supporting documents for your bid (optional but recommended)</small>
            </div>


            {(uploadedFiles.length > 0 || selectedFiles.length > 0) && (
              <div className="uploaded-files">
                <h4>Documents ({uploadedFiles.length + selectedFiles.length})</h4>
                <div className="file-list">
                  {/* Show uploaded files (from existing bid) */}
                  {uploadedFiles.map((file, index) => (
                    <div key={`uploaded-${index}`} className="file-item">
                      <div className="file-info">
                        <div className="file-icon">
                          {file.type?.includes('pdf') ? '📄' : 
                           file.type?.includes('word') ? '📝' : 
                           file.type?.includes('excel') || file.type?.includes('sheet') ? '📊' : 
                           file.type?.includes('text') ? '📄' : '📎'}
                        </div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">{formatFileSize(file.size)}</div>
                          <div className="file-status uploaded">✓ Uploaded</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="btn-remove-file"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  {/* Show selected files (pending upload) */}
                  {selectedFiles.map((file, index) => (
                    <div key={`selected-${index}`} className="file-item">
                      <div className="file-info">
                        <div className="file-icon">
                          {file.type?.includes('pdf') ? '📄' : 
                           file.type?.includes('word') ? '📝' : 
                           file.type?.includes('excel') || file.type?.includes('sheet') ? '📊' : 
                           file.type?.includes('text') ? '📄' : '📎'}
                        </div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">{formatFileSize(file.size)}</div>
                          <div className="file-status selected">📄 Ready to upload</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(uploadedFiles.length + index)}
                        className="btn-remove-file"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/active-tenders')}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : (existingBid ? 'Update Bid' : 'Submit Bid')}
            </button>
          </div>
        </form>
      </div>

      {existingBid && (
        <div className="existing-bid-notice">
          <h4>📝 Note: You have an existing bid</h4>
          <p>You submitted a bid of <strong>{formatCurrency(existingBid.amount)}</strong> on{' '}
            {new Date(existingBid.submitted_at).toLocaleDateString()}. 
            Submitting this form will update your previous bid.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubmitBid;
