import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './TenderBids.css';

const TenderBids = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    if (id) {
      fetchTenderAndBids();
    }
  }, [id]);

  const fetchTenderAndBids = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      // Fetch tender details
      const tenderResponse = await fetch(`${API_BASE}/tenders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!tenderResponse.ok) {
        throw new Error('Failed to fetch tender details');
      }
      
      const tenderData = await tenderResponse.json();
      setTender(tenderData.data || tenderData.tender || tenderData);
      
      // Fetch bids for this tender
      const bidsResponse = await fetch(`${API_BASE}/tenders/${id}/bids`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!bidsResponse.ok) {
        if (bidsResponse.status === 404) {
          setBids([]);
        } else {
          throw new Error('Failed to fetch bids');
        }
      } else {
        const bidsData = await bidsResponse.json();
        setBids(bidsData.data || bidsData.bids || bidsData || []);
      }
      
    } catch (err) {
      console.error('Error fetching tender and bids:', err);
      setError(err.message || 'Unable to load tender and bids');
    } finally {
      setLoading(false);
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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'submitted': 'status-submitted',
      'under_review': 'status-review',
      'accepted': 'status-accepted',
      'rejected': 'status-rejected',
      'withdrawn': 'status-withdrawn'
    };
    
    const statusLabels = {
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'withdrawn': 'Withdrawn'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-default'}`}>
        {statusLabels[status] || status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const handleBidAction = async (bidId, action) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/bids/${bidId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: action })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} bid`);
      }
      
      toast.success(`Bid ${action} successfully`);
      fetchTenderAndBids(); // Refresh the data
      
    } catch (err) {
      console.error(`Error ${action}ing bid:`, err);
      toast.error(`Failed to ${action} bid`);
    }
  };

  const handleViewBidDetails = (bid) => {
    setSelectedBid(bid);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading bids...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={fetchTenderAndBids}>Retry</button>
          <Link to={`/tender/${id}`} className="btn btn-secondary">Back to Tender</Link>
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

  return (
    <div className="tender-bids-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Bids for: {tender.title}</h1>
            <p className="tender-info">
              <span className="tender-id">ID: #{tender.id}</span>
              <span className="separator">•</span>
              <span className="bid-count">{bids.length} Bid{bids.length !== 1 ? 's' : ''} Received</span>
            </p>
          </div>
          <div className="header-actions">
            <Link to={`/tender/${id}`} className="btn btn-outline">
              ← View Tender Details
            </Link>
          </div>
        </div>

        {/* Bids List */}
        <div className="bids-section">
          {bids.length === 0 ? (
            <div className="no-bids">
              <div className="no-bids-icon">📝</div>
              <h3>No Bids Yet</h3>
              <p>No bids have been submitted for this tender yet.</p>
            </div>
          ) : (
            <div className="bids-grid">
              {bids.map((bid) => (
                <div key={bid.id} className="bid-card">
                  <div className="bid-header">
                    <div className="bidder-info">
                      <h3 className="bidder-name">
                        {bid.company_name || bid.bidder_name || 'Anonymous Bidder'}
                      </h3>
                      <p className="bid-meta">
                        Submitted: {formatDate(bid.created_at || bid.submitted_at)}
                      </p>
                    </div>
                    {getStatusBadge(bid.status)}
                  </div>
                  
                  <div className="bid-content">
                    <div className="bid-amount">
                      <label>Bid Amount</label>
                      <span className="amount">
                        {formatCurrency(bid.bid_amount || bid.amount, bid.currency || tender.currency)}
                      </span>
                    </div>
                    
                    {bid.delivery_time && (
                      <div className="delivery-time">
                        <label>Delivery Time</label>
                        <span>{bid.delivery_time} days</span>
                      </div>
                    )}
                    
                    {bid.technical_score && (
                      <div className="technical-score">
                        <label>Technical Score</label>
                        <span>{bid.technical_score}/100</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="bid-actions">
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => handleViewBidDetails(bid)}
                    >
                      View Details
                    </button>
                    
                    {user?.role === 'admin' || (user?.id === tender.created_by) ? (
                      <>
                        {bid.status === 'submitted' && (
                          <>
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleBidAction(bid.id, 'accepted')}
                            >
                              Accept
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleBidAction(bid.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bid Details Modal */}
        {selectedBid && (
          <div className="modal-overlay" onClick={() => setSelectedBid(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Bid Details</h2>
                <button className="modal-close" onClick={() => setSelectedBid(null)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="bid-details-grid">
                  <div className="detail-item">
                    <label>Bidder</label>
                    <span>{selectedBid.company_name || selectedBid.bidder_name || 'Anonymous'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Bid Amount</label>
                    <span className="highlight">
                      {formatCurrency(selectedBid.bid_amount || selectedBid.amount, selectedBid.currency)}
                    </span>
                  </div>
                  
                  {selectedBid.delivery_time && (
                    <div className="detail-item">
                      <label>Delivery Time</label>
                      <span>{selectedBid.delivery_time} days</span>
                    </div>
                  )}
                  
                  <div className="detail-item">
                    <label>Status</label>
                    <div>{getStatusBadge(selectedBid.status)}</div>
                  </div>
                  
                  <div className="detail-item">
                    <label>Submitted</label>
                    <span>{formatDate(selectedBid.created_at || selectedBid.submitted_at)}</span>
                  </div>
                </div>
                
                {selectedBid.proposal && (
                  <div className="proposal-section">
                    <label>Proposal</label>
                    <div className="proposal-text">{selectedBid.proposal}</div>
                  </div>
                )}
                
                {selectedBid.technical_details && (
                  <div className="technical-section">
                    <label>Technical Details</label>
                    <div className="technical-text">{selectedBid.technical_details}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenderBids;
