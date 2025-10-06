import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { 
  fetchMyBids,
  updateBid,
  withdrawBid, 
  selectMyBids,
  selectMyBidsLoading,
  selectMyBidsError,
  selectBidActionLoading,
  selectBidActionError,
  clearError
} from '../store/slices/bidSlice';
import { showToast } from '../utils/toast';
import BidUpdateModal from './BidUpdateModal';
import './MyBids.css';

const MyBids = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux selectors
  const bids = useSelector(selectMyBids);
  const loading = useSelector(selectMyBidsLoading);
  const error = useSelector(selectMyBidsError);
  const bidActionLoading = useSelector(selectBidActionLoading);
  const bidActionError = useSelector(selectBidActionError);
  
  const [filteredBids, setFilteredBids] = useState([]);
  
  // Modal states
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  
  // Loading states for individual actions
  const [actionLoading, setActionLoading] = useState({});
  const [withdrawReason, setWithdrawReason] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sort_by: 'newest'
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchBids();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bids, filters]);

  // Clear any previous errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const fetchBids = async () => {
    try {
      await dispatch(fetchMyBids({ 
        limit: 100,
        sort_by: 'submitted_at',
        sort_order: 'DESC'
      })).unwrap();
    } catch (err) {
      console.error('Error fetching bids:', err);
      showToast.error('Failed to load your bids. Please try again.');
    }
  };

  const applyFilters = () => {
    let filtered = [...bids];
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(bid => bid.status === filters.status);
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(bid =>
        bid.tender_title.toLowerCase().includes(searchLower) ||
        bid.proposal.toLowerCase().includes(searchLower)
      );
    }
    
    // Sorting
    switch (filters.sort_by) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
        break;
      case 'amount_asc':
        filtered.sort((a, b) => a.amount - b.amount);
        break;
      case 'amount_desc':
        filtered.sort((a, b) => b.amount - a.amount);
        break;
      case 'tender_title':
        filtered.sort((a, b) => a.tender_title.localeCompare(b.tender_title));
        break;
      default:
        break;
    }
    
    setFilteredBids(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      search: '',
      sort_by: 'newest'
    });
  };

  const formatCurrency = (amount, currency = 'PKR') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency || 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBidStatusColor = (status) => {
    const colors = {
      'pending': 'status-pending',
      'accepted': 'status-accepted',
      'rejected': 'status-rejected',
      'withdrawn': 'status-withdrawn'
    };
    return colors[status] || 'status-default';
  };

  const getBidStatusIcon = (status) => {
    const icons = {
      'pending': '⏳',
      'accepted': '✅',
      'rejected': '❌',
      'withdrawn': '🔄'
    };
    return icons[status] || '📋';
  };

  const handleViewBid = (bidId) => {
    navigate(`/bid/view/${bidId}`);
  };

  const handleEditBid = (bidId) => {
    navigate(`/bid/edit/${bidId}`);
  };

  const handleViewTender = (tenderId) => {
    navigate(`/tender/${tenderId}`);
  };

  const handleUpdateBid = (bid) => {
    setSelectedBid(bid);
    setUpdateModalOpen(true);
  };

  const handleWithdrawBid = async (bidId, bid) => {
    const reason = prompt(
      'Please provide a reason for withdrawing this bid (optional):',
      'Changed business requirements'
    );
    
    // If user clicked cancel, don't proceed
    if (reason === null) {
      return;
    }
    
    if (!window.confirm(
      `Are you sure you want to withdraw your bid for "${bid.tender_title}"?\n\nThis action cannot be undone.`
    )) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [bidId]: 'withdrawing' }));
      
      await dispatch(withdrawBid({ 
        id: bidId, 
        reason: reason || 'Withdrawn by vendor' 
      })).unwrap();
      
      showToast.bidWithdrawn();
      // No need to fetch bids again - Redux will update the state automatically
      
    } catch (err) {
      console.error('Error withdrawing bid:', err);
      showToast.bidWithdrawError(err.message || err);
    } finally {
      setActionLoading(prev => ({ ...prev, [bidId]: null }));
    }
  };
  
  const handleUpdateSuccess = () => {
    // No need to fetch bids again - Redux will update the state automatically
    setUpdateModalOpen(false);
    setSelectedBid(null);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredBids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBids = filteredBids.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // Calculate stats
  const stats = {
    total: bids.length,
    pending: bids.filter(bid => bid.status === 'pending').length,
    accepted: bids.filter(bid => bid.status === 'accepted').length,
    rejected: bids.filter(bid => bid.status === 'rejected').length,
    totalValue: bids.reduce((sum, bid) => sum + (bid.amount || 0), 0)
  };

  // Show action error if there's one
  useEffect(() => {
    if (bidActionError) {
      showToast.error(bidActionError);
      dispatch(clearError());
    }
  }, [bidActionError, dispatch]);

  if (loading) {
    return (
      <div className="bids-loading">
        <div className="loading-spinner"></div>
        <p>Loading your bids...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bids-error">
        <h2>Error Loading Bids</h2>
        <p>{error}</p>
        <button onClick={fetchBids} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="my-bids">
      {/* Header */}
      <div className="bids-header">
        <div className="header-content">
          <h1>My Bids</h1>
          <p>Manage and track all your submitted bids</p>
        </div>
          <div className="header-actions">
            <button 
              onClick={fetchBids} 
              className="btn btn-outline"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Refreshing...
                </>
              ) : (
                '🔄 Refresh'
              )}
            </button>
            <Link to="/active-tenders" className="btn btn-primary">
              Browse Tenders
            </Link>
            <Link to="/bidder-dashboard" className="btn btn-secondary">
              Dashboard
            </Link>
          </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Bids</p>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        
        <div className="stat-card winning">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>{stats.accepted}</h3>
            <p>Accepted</p>
          </div>
        </div>
        
        <div className="stat-card rejected">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Filter Bids</h3>
          <button onClick={clearFilters} className="btn-clear-filters">
            Clear All
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="search">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search by tender title or proposal..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort_by">Sort By</label>
            <select
              id="sort_by"
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
              <option value="tender_title">Tender Title (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="results-summary">
          <span>
            Showing {startIndex + 1} to {Math.min(endIndex, filteredBids.length)} of {filteredBids.length} bids
            {filteredBids.length !== bids.length && ` (filtered from ${bids.length} total)`}
          </span>
        </div>
      </div>

      {/* Bids List */}
      {filteredBids.length === 0 ? (
        <div className="no-bids">
          <div className="no-bids-icon">📝</div>
          <h3>No Bids Found</h3>
          <p>
            {filters.status || filters.search 
              ? 'No bids match your current filters. Try adjusting them to see more results.'
              : 'You haven\'t submitted any bids yet. Start by browsing active tenders!'
            }
          </p>
          {!filters.status && !filters.search ? (
            <Link to="/active-tenders" className="btn btn-primary">
              Browse Active Tenders
            </Link>
          ) : (
            <button onClick={clearFilters} className="btn btn-primary">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bids-list">
            {currentBids.map(bid => (
              <div key={bid.id} className="bid-card">
                <div className="bid-header">
                  <div className="bid-title-section">
                    <h3 className="bid-title">{bid.tender_title}</h3>
                    <div className="bid-meta">
                      <span>Submitted: {formatDateTime(bid.submitted_at)}</span>
                      {bid.updated_at !== bid.submitted_at && (
                        <span>• Updated: {formatDateTime(bid.updated_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="bid-status-section">
                    <span className={`bid-status ${getBidStatusColor(bid.status)}`}>
                      {getBidStatusIcon(bid.status)} {bid.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="bid-content">
                  <div className="bid-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Bid Amount</span>
                      <span className="detail-value">{formatCurrency(bid.amount)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Vendor</span>
                      <span className="detail-value">{bid.vendor_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Company</span>
                      <span className="detail-value">{bid.vendor_company || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">{bid.status}</span>
                    </div>
                  </div>

                  <div className="bid-proposal">
                    <h4>Proposal Summary</h4>
                    <p>
                      {bid.proposal.length > 200 
                        ? `${bid.proposal.substring(0, 200)}...`
                        : bid.proposal
                      }
                    </p>
                  </div>

                  {bid.attachments && bid.attachments.length > 0 && (
                    <div className="bid-attachments">
                      <h4>Attachments</h4>
                      <div className="attachments-list">
                        {bid.attachments.map((attachment, index) => (
                          <div key={index} className="attachment-item">
                            <span>📎 {attachment.name || `Attachment ${index + 1}`}</span>
                            {attachment.url && (
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bid-actions">
                  <button 
                    onClick={() => handleViewBid(bid.id)}
                    className="btn btn-outline"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => handleViewTender(bid.tender_id)}
                    className="btn btn-outline"
                  >
                    View Tender
                  </button>
                  {bid.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleUpdateBid(bid)}
                        className="btn btn-secondary"
                        disabled={actionLoading[bid.id] || bidActionLoading}
                      >
                        {actionLoading[bid.id] === 'updating' ? (
                          <>
                            <span className="spinner"></span>
                            Updating...
                          </>
                        ) : (
                          'Update Bid'
                        )}
                      </button>
                      <button 
                        onClick={() => handleWithdrawBid(bid.id, bid)}
                        className="btn btn-danger"
                        disabled={actionLoading[bid.id] || bidActionLoading}
                      >
                        {actionLoading[bid.id] === 'withdrawing' ? (
                          <>
                            <span className="spinner"></span>
                            Withdrawing...
                          </>
                        ) : (
                          'Withdraw'
                        )}
                      </button>
                    </>
                  )}
                  {bid.status === 'withdrawn' && (
                    <span className="bid-withdrawn-note">
                      Bid withdrawn - No actions available
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-section">
              <div className="pagination">
                <button 
                  className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </button>
                
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
              </div>
              
              <div className="page-info">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Update Bid Modal */}
      <BidUpdateModal
        bid={selectedBid}
        isOpen={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false);
          setSelectedBid(null);
        }}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  );
};

export default MyBids;
