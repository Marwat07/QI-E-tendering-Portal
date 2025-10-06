import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tenderService from '../services/tender';
import DownloadButton from './DownloadButton';
import './TenderDetails.css';

const TenderDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canBid, setCanBid] = useState(false);
  const [existingBid, setExistingBid] = useState(null);

  useEffect(() => {
    if (id && user) {
      console.log('useEffect triggered - ID:', id, 'User:', user?.role);
      fetchTenderDetails();
    } else {
      console.log('useEffect skipped - ID:', id, 'User:', user?.role);
    }
  }, [id, user]);

  const fetchTenderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching tender details for ID:', id);
      console.log('User role:', user?.role);
      
      let response;
      let usingAdminEndpoint = false;
      
      try {
        if (user?.role === 'admin') {
          // Try admin-specific endpoint first - use proper API service base URL
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
          const adminUrl = `${API_BASE}/admin/tenders/${id}`;
          console.log('Trying admin endpoint:', adminUrl);
          
          const adminResponse = await fetch(adminUrl, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Admin response status:', adminResponse.status);
          
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            console.log('Admin response data:', adminData);
            response = adminData;
            usingAdminEndpoint = true;
          } else {
            const errorText = await adminResponse.text();
            console.error('Admin endpoint failed:', adminResponse.status, errorText);
            throw new Error(`Admin endpoint failed: ${adminResponse.status}`);
          }
        } else {
          throw new Error('Not admin, use regular endpoint');
        }
      } catch (adminError) {
        console.log('Admin endpoint failed, trying regular tender service...', adminError.message);
        
        try {
          // Fallback to regular tender service
          response = await tenderService.getTenderById(id);
          console.log('Regular endpoint response:', response);
          usingAdminEndpoint = false;
        } catch (regularError) {
          console.error('Regular endpoint also failed:', regularError);
          throw new Error(`Failed to fetch tender: ${regularError.message}`);
        }
      }
      
      if (!response) {
        throw new Error('No response received from any endpoint');
      }
      
      // Debug logging to see the complete tender structure
      console.log('=== FULL RESPONSE DEBUG ===');
      console.log('Using admin endpoint:', usingAdminEndpoint);
      console.log('Raw response:', response);
      console.log('Response keys:', Object.keys(response));
      if (response.data) {
        console.log('Response data keys:', Object.keys(response.data));
      }
      console.log('=== END FULL RESPONSE DEBUG ===');
      
      // Handle different response structures more carefully
      let tenderData = null;
      let canBidValue = false;
      let existingBidValue = null;
      
      // Admin endpoint returns { success: true, data: { tender: {...}, bids: [...] } }
      if (usingAdminEndpoint && response.success && response.data && response.data.tender) {
        console.log('Processing admin endpoint response');
        tenderData = response.data.tender;
        canBidValue = response.data.canBid || false;
        existingBidValue = response.data.existingBid || null;
      }
      // Regular endpoint returns tender object directly (from tenderService.getTenderById)
      else if (!usingAdminEndpoint && response) {
        console.log('Processing regular endpoint response');
        tenderData = response;
        canBidValue = false; // Regular endpoint doesn't provide bid info
        existingBidValue = null;
      }
      // Alternative response structures
      else if (response.success && response.data && !response.data.tender) {
        console.log('Processing alternative response structure - data is tender');
        tenderData = response.data;
        canBidValue = response.canBid || false;
        existingBidValue = response.existingBid || null;
      }
      else if (response.tender) {
        console.log('Processing response with tender property');
        tenderData = response.tender;
        canBidValue = response.canBid || false;
        existingBidValue = response.existingBid || null;
      }
      else {
        console.log('Processing direct tender object');
        tenderData = response;
        canBidValue = false;
        existingBidValue = null;
      }
      
      if (!tenderData) {
        throw new Error('No tender data found in response');
      }
      
      console.log('=== PROCESSED TENDER DATA ===');
      console.log('Tender data:', tenderData);
      console.log('Tender ID:', tenderData.id);
      console.log('Tender title:', tenderData.title);
      console.log('Can bid:', canBidValue);
      console.log('Existing bid:', existingBidValue);
      console.log('=== END PROCESSED TENDER DATA ===');
      
      setTender(tenderData);
      setCanBid(canBidValue);
      setExistingBid(existingBidValue);
      
      // Debug logging for attachments specifically
      console.log('=== TENDER ATTACHMENT DEBUG ===');
      console.log('Tender data set:', tenderData);
      console.log('Tender attachments:', tenderData?.attachments);
      console.log('Tender documents:', tenderData?.documents);
      
      if (tenderData?.attachments && tenderData.attachments.length > 0) {
        console.log('First attachment structure:', tenderData.attachments[0]);
        console.log('All attachment properties:', Object.keys(tenderData.attachments[0]));
        
        tenderData.attachments.forEach((att, index) => {
          console.log(`Attachment ${index + 1}:`, {
            filename: att.filename,
            name: att.name,
            originalName: att.originalName,
            path: att.path,
            file_path: att.file_path,
            allKeys: Object.keys(att)
          });
        });
      }
      
      if (tenderData?.documents && tenderData.documents.length > 0) {
        console.log('First document structure:', tenderData.documents[0]);
        console.log('All document properties:', Object.keys(tenderData.documents[0]));
      }
      console.log('=== END ATTACHMENT DEBUG ===');
    } catch (err) {
      console.error('=== TENDER DETAILS ERROR ===');
      console.error('Error fetching tender details:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Tender ID:', id);
      console.error('User:', user);
      console.error('=== END ERROR DEBUG ===');
      
      let errorMessage = 'Unable to load tender details. Please try again.';
      if (err.message.includes('401')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (err.message.includes('404')) {
        errorMessage = 'Tender not found. It may have been deleted or you may not have permission to view it.';
      } else if (err.message.includes('403')) {
        errorMessage = 'You do not have permission to view this tender.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = date - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
      } else if (diffDays === 0) {
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        if (diffHours <= 0) {
          return 'Due now';
        } else if (diffHours < 24) {
          return `${diffHours} hour${diffHours === 1 ? '' : 's'} left`;
        }
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else if (diffDays <= 7) {
        return `In ${diffDays} days`;
      } else {
        const diffWeeks = Math.ceil(diffDays / 7);
        return `In ${diffWeeks} week${diffWeeks === 1 ? '' : 's'}`;
      }
      return `${diffDays} days`;
    } catch {
      return null;
    }
  };

  const formatCurrency = (amount, currency = 'PKR') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency || 'PKR'
    }).format(amount);
  };

  // Helper function to extract filename from attachment object
  const getAttachmentFilename = (attachment) => {
    console.log('Processing attachment for filename:', attachment);
    console.log('All attachment keys:', Object.keys(attachment));
    
    // The issue is that we need the server-generated filename, not the original name
    // Handle nested data structure from backend (attachment.data.filename)
    const possibleFilenames = [
      // Nested data structure (most likely to work)
      attachment.data?.filename,     // Server-generated filename from nested data
      attachment.data?.file,         // Alternative nested field
      
      // Direct properties - server-generated filenames
      attachment.filename,           // Generated filename like "file-123456789.pdf"
      attachment.file,              // Alternative field name
      attachment.generatedName,     // Might be stored here
      attachment.savedAs,           // Another possibility
      
      // Path-based extraction
      attachment.path && attachment.path.includes('/') ? attachment.path.split('/').pop() : attachment.path,
      attachment.file_path && attachment.file_path.includes('/') ? attachment.file_path.split('/').pop() : attachment.file_path,
      attachment.url && attachment.url.includes('/') ? attachment.url.split('/').pop() : null,
      
      // Original names (these probably won't work but worth trying)
      attachment.data?.originalName, // Original name from nested data
      attachment.name, 
      attachment.originalName,
      attachment.original_name
    ].filter(Boolean);
    
    console.log('Possible filenames found:', possibleFilenames);
    
    // Log each filename to see which ones look like server-generated names
    possibleFilenames.forEach((filename, index) => {
      const looksLikeGenerated = /^file-\d+-\d+\.(pdf|doc|docx|txt|xls|xlsx)$/i.test(filename);
      console.log(`Filename ${index + 1}: "${filename}" - Generated format: ${looksLikeGenerated}`);
    });
    
    // Prefer server-generated filenames (they start with "file-" and have timestamp pattern)
    const generatedFilename = possibleFilenames.find(filename => 
      /^file-\d+-\d+\.(pdf|doc|docx|txt|xls|xlsx)$/i.test(filename)
    );
    
    if (generatedFilename) {
      console.log('Using generated filename:', generatedFilename);
      return generatedFilename;
    }
    
    if (possibleFilenames.length > 0) {
      console.log('No generated filename found, using first available:', possibleFilenames[0]);
      return possibleFilenames[0];
    }
    
    // If no filename found, return null
    console.warn('No filename found in attachment:', attachment);
    return null;
  };
  
  // Helper function to get proper filename from backend files endpoint
  const getProperFilenameFromBackend = async (tenderId, attachmentIndex) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/tenders/${tenderId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const files = data.files || [];
        
        if (files[attachmentIndex] && files[attachmentIndex].filename) {
          console.log('Got proper filename from backend:', files[attachmentIndex].filename);
          return files[attachmentIndex].filename;
        }
      }
    } catch (error) {
      console.log('Failed to get filename from backend files endpoint:', error);
    }
    return null;
  };

  // Helper function to try multiple file access methods with view and download modes
  const tryOpenFile = async (filename, attachment, tenderId = tender?.id, attachmentIndex = null, mode = 'download') => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE.replace('/api', '');
    
    // Get original filename
    const originalFilename = attachment?.data?.originalName || attachment?.originalName || attachment?.name || filename;
    
    // If the filename doesn't look like a generated filename, try to get proper filename from backend
    const looksGenerated = /^file-\d+-\d+\.(pdf|doc|docx|txt|xls|xlsx)$/i.test(filename);
    
    if (!looksGenerated && tenderId !== null && attachmentIndex !== null) {
      console.log('Filename doesn\'t look generated, trying backend files endpoint...');
      const properFilename = await getProperFilenameFromBackend(tenderId, attachmentIndex);
      if (properFilename) {
        filename = properFilename;
      }
    }
    
    // Determine URLs based on mode
    const encodedOriginalName = encodeURIComponent(originalFilename);
    let urlsToTry;
    
    if (mode === 'view') {
      // For viewing, prioritize view endpoint for inline display
      urlsToTry = [
        `${API_BASE}/upload/view/${filename}`,
        `${baseUrl}/uploads/${filename}`,
        `http://localhost:3001/uploads/${filename}`,
        `${API_BASE}/upload/download/${filename}?original=${encodedOriginalName}`
      ];
    } else {
      // For downloading, prioritize download endpoint with original filename
      urlsToTry = [
        `${API_BASE}/upload/download/${filename}?original=${encodedOriginalName}`,
        `${API_BASE}/upload/view/${filename}`,
        `${baseUrl}/uploads/${filename}`,
        `http://localhost:3001/uploads/${filename}`
      ];
    }
    
    console.log(`Trying ${mode} for filename:`, filename, 'Original name:', originalFilename);
    
    // Try the first URL and fallback if it fails
    const tryUrl = (index = 0) => {
      if (index >= urlsToTry.length) {
        alert(`Unable to access file: ${originalFilename}. All URL patterns failed. The file might have been deleted or the filename is incorrect.`);
        return;
      }
      
      const url = urlsToTry[index];
      console.log(`Trying URL ${index + 1}:`, url);
      
      // Handle view and download differently
      const handleSuccess = (successUrl) => {
        if (mode === 'view') {
          // For viewing, open in new tab
          window.open(successUrl, '_blank', 'noopener,noreferrer');
        } else {
          // For downloading, create download link with original filename
          const link = document.createElement('a');
          link.href = successUrl;
          link.download = originalFilename;
          link.target = '_blank';
          link.rel = 'noopener,noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };
      
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            console.log(`Success with URL for ${mode}:`, url);
            handleSuccess(url);
          } else {
            console.log(`URL ${index + 1} failed with status:`, response.status);
            tryUrl(index + 1);
          }
        })
        .catch(error => {
          console.log(`URL ${index + 1} failed with error:`, error);
          tryUrl(index + 1);
        });
    };
    
    tryUrl();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'draft': 'status-draft',
      'open': 'status-open',
      'closed': 'status-closed',
      'awarded': 'status-awarded',
      'cancelled': 'status-cancelled'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-default'}`}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const isDeadlinePassed = () => {
    const deadlineField = tender?.deadline || tender?.submission_deadline;
    if (!deadlineField) return false;
    return new Date(deadlineField) < new Date();
  };

  const getDaysRemaining = () => {
    const deadlineField = tender?.deadline || tender?.submission_deadline;
    if (!deadlineField) return null;
    const deadline = new Date(deadlineField);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleBid = () => {
    navigate(`/bid/${tender.id}`);
  };

  const handleEditTender = () => {
    navigate(`/tenders/edit/${tender.id}`);
  };

  const handleViewBids = () => {
    navigate(`/tender/${tender.id}/bids`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading tender details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={fetchTenderDetails}>Retry</button>
          <Link to="/active-tenders" className="btn btn-secondary">Back to Tenders</Link>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="error-container">
        <h2>Tender Not Found</h2>
        <p>The requested tender could not be found.</p>
        <Link to="/active-tenders" className="btn btn-primary">Back to Tenders</Link>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const deadlinePassed = isDeadlinePassed();

  return (
    <div className="tender-details-page">
      <div className="container">
        {/* Header Section */}
        <div className="tender-header">
          <div className="header-content">
            <h1 className="tender-title">{tender.title}</h1>
            <div className="tender-meta">
              <span className="tender-id">ID: #{tender.id}</span>
              {getStatusBadge(tender.status)}
              {tender.status === 'open' && (
                <div className="deadline-info">
                  {deadlinePassed ? (
                    <span className="deadline-badge expired">
                      ⏰ Deadline Expired
                    </span>
                  ) : (
                    <span className={`deadline-badge ${daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : 'normal'}`}>
                      ⏰ {getRelativeTime(tender.deadline || tender.submission_deadline)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="header-actions">
            {user?.role === 'vendor' && tender.status === 'open' && canBid && !deadlinePassed && (
              <button className="btn btn-primary" onClick={handleBid}>
                <span>💰</span>
                {existingBid ? 'Update Bid' : 'Submit Bid'}
              </button>
            )}
            
            {(user?.role === 'buyer' || user?.role === 'admin') && tender.created_by === user.id && (
              <>
                {tender.status === 'draft' && (
                  <button className="btn btn-secondary" onClick={handleEditTender}>
                    <span>✏️</span>
                    Edit Tender
                  </button>
                )}
                {(tender.status === 'open' || tender.status === 'closed') && (
                  <button className="btn btn-outline" onClick={handleViewBids}>
                    <span>👁️</span>
                    View Bids ({tender.bid_count || 0})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="content-grid">
          {/* Left Column - Overview */}
          <div className="overview-section">
            <div className="card">
              <div className="card-header">
                <h2>📄 Overview</h2>
              </div>
              <div className="card-content">
                <div className="info-grid">
                  <div className="info-item">
                    <label>Category</label>
                    <div className="category-display">
                      {(() => {
                        // Collect all possible categories and deduplicate
                        const allCategories = [];
                        
                        // Add primary category if it exists
                        const primaryCategory = tender.category_name || tender.category;
                        if (primaryCategory && primaryCategory.trim() !== '') {
                          allCategories.push(primaryCategory);
                        }
                        
                        // Add categories from array if it exists, avoiding duplicates
                        if (tender.categories && Array.isArray(tender.categories)) {
                          tender.categories.forEach(cat => {
                            if (cat && cat.trim() !== '' && !allCategories.includes(cat)) {
                              allCategories.push(cat);
                            }
                          });
                        }
                        
                        // If no categories found, show fallback
                        if (allCategories.length === 0) {
                          return (
                            <span className="category-tag uncategorized">Not categorized</span>
                          );
                        }
                        
                        // Render unique categories
                        return (
                          <div className="categories-list">
                            {allCategories.map((category, index) => (
                              <span key={index} className={`category-tag ${index === 0 ? 'primary' : 'secondary'}`}>
                                {category}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="info-item">
                    <label>Created Date</label>
                    <span>{formatDateShort(tender.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <label>Submission Deadline</label>
                    <div className="deadline-display">
                      <span className="deadline-date">{formatDate(tender.deadline || tender.submission_deadline)}</span>
                      {tender.status === 'open' && getDaysRemaining() !== null && (
                        <div className={`time-remaining ${isDeadlinePassed() ? 'expired' : getDaysRemaining() <= 3 ? 'urgent' : getDaysRemaining() <= 7 ? 'warning' : 'normal'}`}>
                          {isDeadlinePassed() ? 'Expired' : 
                           getDaysRemaining() === 0 ? 'Due Today' :
                           `${getDaysRemaining()} day${getDaysRemaining() === 1 ? '' : 's'} left`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Section */}
            {(tender.budget_min || tender.budget_max || tender.estimated_budget) && (
              <div className="card">
                <div className="card-header">
                  <h2>💰 Budget</h2>
                </div>
                <div className="card-content">
                  <div className="budget-info">
                    {tender.budget_min || tender.budget_max ? (
                      <div className="budget-range">
                        <div className="budget-item">
                          <span className="budget-label">Min Budget:</span>
                          <span className="budget-amount">{formatCurrency(tender.budget_min || 0)}</span>
                        </div>
                        <div className="budget-item">
                          <span className="budget-label">Max Budget:</span>
                          <span className="budget-amount">{formatCurrency(tender.budget_max || 0)}</span>
                        </div>
                      </div>
                    ) : tender.estimated_budget ? (
                      <div className="budget-item">
                        <span className="budget-label">Estimated Budget:</span>
                        <span className="budget-amount">{formatCurrency(tender.estimated_budget, tender.currency)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Description */}
          <div className="details-section">
            <div className="card">
              <div className="card-header">
                <h2>📝 Description</h2>
              </div>
              <div className="card-content">
                <div className="description-text">
                  {tender.description || 'No description provided for this tender.'}
                </div>
              </div>
            </div>

            {/* Requirements */}
            {tender.requirements && (
              <div className="card">
                <div className="card-header">
                  <h2>✅ Requirements</h2>
                </div>
                <div className="card-content">
                  {Array.isArray(tender.requirements) ? (
                    <ul className="requirements-list">
                      {tender.requirements.map((req, index) => (
                        <li key={index} className="requirement-item">
                          <span className="requirement-number">{index + 1}</span>
                          <span className="requirement-text">{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="requirements-text">{tender.requirements}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="full-width-sections">
          {/* Documents & Attachments */}
          {((tender.documents && tender.documents.length > 0) || (tender.attachments && tender.attachments.length > 0)) && (
            <div className="card">
              <div className="card-header">
                <h2>📎 Documents & Attachments</h2>
              </div>
              <div className="card-content">
                <div className="files-grid">
                  {/* Documents */}
                  {tender.documents && tender.documents.map((doc, index) => {
                    const handleDocumentDownload = (document) => {
                      try {
                        const filename = getAttachmentFilename(document);
                        
                        console.log('Document download:', document, 'Filename:', filename);
                        
                        if (filename) {
                          // Use the comprehensive file opener with tender ID and document index
                          tryOpenFile(filename, document, tender.id, index, 'download');
                        } else {
                          alert('Unable to determine filename for this document.');
                        }
                      } catch (error) {
                        console.error('Error downloading document:', error);
                        alert('Failed to download document.');
                      }
                    };
                    
                    const handleDocumentView = (document) => {
                      try {
                        const filename = getAttachmentFilename(document);
                        
                        console.log('Document view:', document, 'Filename:', filename);
                        
                        if (filename) {
                          // Use the comprehensive file viewer with tender ID and document index
                          tryOpenFile(filename, document, tender.id, index, 'view');
                        } else {
                          alert('Unable to determine filename for this document.');
                        }
                      } catch (error) {
                        console.error('Error viewing document:', error);
                        alert('Failed to view document.');
                      }
                    };
                    
                    return (
                      <div key={`doc-${doc.id || index}`} className="file-item">
                        <div className="file-icon">📄</div>
                        <div className="file-info">
                          <div className="file-name">{doc.data?.originalName || doc.originalName || doc.name || doc.filename || 'Unknown File'}</div>
                          {doc.size && <div className="file-size">{(doc.size / 1024 / 1024).toFixed(2)} MB</div>}
                        </div>
                        <div className="file-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => handleDocumentView(doc)}>
                            View
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleDocumentDownload(doc)}>
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Attachments */}
                  {tender.attachments && tender.attachments.map((attachment, index) => {
                    const formatFileSize = (bytes) => {
                      if (!bytes) return 'Unknown size';
                      const k = 1024;
                      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                    };
                    
                    const handleAttachmentDownload = (attachment) => {
                      try {
                        console.log('Download attachment:', attachment);
                        
                        // Use helper function to get filename
                        const filename = getAttachmentFilename(attachment);
                        
                        console.log('Final filename for download:', filename);
                        
                        if (filename) {
                          // Use the comprehensive file opener with tender ID and attachment index
                          tryOpenFile(filename, attachment, tender.id, index, 'download');
                        } else {
                          console.error('No filename found in attachment:', attachment);
                          alert('Unable to determine filename for this file. Please check the console for more details.');
                        }
                      } catch (error) {
                        console.error('Error downloading attachment:', error);
                        alert('Failed to download attachment.');
                      }
                    };
                    
                    const handleAttachmentView = (attachment) => {
                      try {
                        console.log('View attachment:', attachment);
                        
                        // Use helper function to get filename
                        const filename = getAttachmentFilename(attachment);
                        
                        console.log('Final filename for viewing:', filename);
                        
                        if (filename) {
                          // Use the comprehensive file viewer with tender ID and attachment index
                          tryOpenFile(filename, attachment, tender.id, index, 'view');
                        } else {
                          console.error('No filename found in attachment:', attachment);
                          alert('Unable to determine filename for this file. Please check the console for more details.');
                        }
                      } catch (error) {
                        console.error('Error viewing attachment:', error);
                        alert('Failed to view attachment.');
                      }
                    };
                    
                    return (
                      <div key={`att-${attachment.id || index}`} className="file-item">
                        <div className="file-icon">
                          {attachment.type?.includes('pdf') ? '📄' : 
                           attachment.type?.includes('word') ? '📝' : '📎'}
                        </div>
                        <div className="file-info">
                          <div className="file-name">
                            {attachment.data?.originalName || attachment.originalName || attachment.name || attachment.filename || 'Unknown File'}
                          </div>
                          <div className="file-size">{formatFileSize(attachment.size)}</div>
                          {attachment.type && (
                            <div className="file-type" style={{fontSize: '0.8em', color: '#666'}}>
                              {attachment.type}
                            </div>
                          )}
                        </div>
                        <div className="file-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => handleAttachmentView(attachment)}>
                            View
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleAttachmentDownload(attachment)}>
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          {(tender.evaluation_criteria || tender.qualification_criteria || tender.terms_and_conditions) && (
            <div className="card">
              <div className="card-header">
                <h2>📜 Additional Information</h2>
              </div>
              <div className="card-content">
                <div className="additional-sections">
                  {tender.evaluation_criteria && tender.evaluation_criteria.length > 0 && (
                    <div className="additional-section">
                      <h3>Evaluation Criteria</h3>
                      <div className="criteria-list">
                        {tender.evaluation_criteria.map((criteria, index) => (
                          <div key={index} className="criteria-item">
                            <span className="criteria-name">{criteria.criterion}</span>
                            <span className="criteria-weight">{criteria.weight}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {tender.qualification_criteria && (
                    <div className="additional-section">
                      <h3>Qualification Criteria</h3>
                      <div className="section-content">{tender.qualification_criteria}</div>
                    </div>
                  )}
                  
                  {tender.terms_and_conditions && (
                    <div className="additional-section">
                      <h3>Terms and Conditions</h3>
                      <div className="section-content">{tender.terms_and_conditions}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bidding Information for vendors */}
          {user?.role === 'vendor' && (
            <div className="card">
              <div className="card-header">
                <h2>🎯 Bidding Status</h2>
              </div>
              <div className="card-content">
                {tender.status === 'open' ? (
                  canBid ? (
                    deadlinePassed ? (
                      <div className="status-message warning">
                        ⚠️ The submission deadline has passed. No more bids can be submitted.
                      </div>
                    ) : (
                      <div className="status-message success">
                        ✅ You can submit a bid for this tender.
                        {existingBid && (
                          <p className="note">You have already submitted a bid. You can update it before the deadline.</p>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="status-message info">
                      📝 This tender is not available for bidding.
                    </div>
                  )
                ) : (
                  <div className="status-message info">
                    📝 This tender is not currently open for bidding.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {tender.contact_person && (
            <div className="card">
              <div className="card-header">
                <h2>📞 Contact Information</h2>
              </div>
              <div className="card-content">
                <div className="contact-details">
                  <div className="contact-item">
                    <strong>Contact Person:</strong> {tender.contact_person}
                  </div>
                  {tender.contact_email && (
                    <div className="contact-item">
                      <strong>Email:</strong> 
                      <a href={`mailto:${tender.contact_email}`} className="contact-link">
                        {tender.contact_email}
                      </a>
                    </div>
                  )}
                  {tender.contact_phone && (
                    <div className="contact-item">
                      <strong>Phone:</strong> {tender.contact_phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Back Button */}
        <div className="back-section">
          <Link to="/active-tenders" className="btn btn-secondary">
            ← Back to Active Tenders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TenderDetails;
