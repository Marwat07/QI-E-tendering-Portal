import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import './BidderDashboard.css';

const BidderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    activeTenders: [],
    myBids: [],
    recentActivity: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching dashboard data for user:', user);
      console.log('API Base URL:', apiService.baseURL);
      console.log('Auth token exists:', !!apiService.getToken());

      // Test API connection first
      try {
        const healthCheck = await fetch(`${apiService.baseURL.replace('/api', '')}/api/health`);
        const healthData = await healthCheck.json();
        console.log('API Health Check:', healthData);
      } catch (healthError) {
        console.warn('Health check failed:', healthError);
      }

      // Fetch data one by one to identify which call is failing
      let tendersResponse, bidsResponse, statsResponse;
      
      try {
        console.log('Fetching tenders filtered by user categories...');
        // For vendors/suppliers, fetch tenders that match their selected categories
        try {
          tendersResponse = await apiService.get('/tenders/my-category', { page: 1, limit: 6, search: '' });
        } catch (catErr) {
          console.warn('Category-filtered tenders endpoint failed, falling back to generic list:', catErr.message);
          // Fallback to generic active tenders
          tendersResponse = await apiService.get('/tenders', { active_only: true, limit: 6 });
        }
        console.log('Tenders response:', tendersResponse);
      } catch (err) {
        console.error('Tenders fetch failed:', err);
        tendersResponse = { data: { tenders: [] } };
      }
      
      try {
        console.log('Fetching bids...');
        bidsResponse = await apiService.get('/bids', { vendor_id: user.id, limit: 5 });
        console.log('Bids response:', bidsResponse);
      } catch (err) {
        console.error('Bids fetch failed:', err);
        bidsResponse = { data: { bids: [] } };
      }
      
      try {
        console.log('Fetching stats...');
        statsResponse = await apiService.get('/tenders/stats');
        console.log('Stats response:', statsResponse);
      } catch (err) {
        console.error('Stats fetch failed:', err);
        statsResponse = { data: { user_stats: {} } };
      }

      setDashboardData({
        stats: statsResponse.data?.user_stats || {},
        activeTenders: tendersResponse.data?.tenders || [],
        myBids: bidsResponse.data?.bids || [],
        recentActivity: []
      });

      console.log('Dashboard data loaded successfully');

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      setError(`Failed to load dashboard data: ${err.message}`);
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  const handleViewTender = (tenderId) => {
    navigate(`/tender/${tenderId}`);
  };

  const handleBidOnTender = (tenderId) => {
    navigate(`/bid/${tenderId}`);
  };

  const handleViewBid = (bidId) => {
    navigate(`/bid/view/${bidId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bidder-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.first_name || 'Bidder'}!</h1>
          <p>Here's what's happening with your tenders and bids</p>
        </div>
        <div className="quick-actions">
          <Link to="/active-tenders" className="btn btn-primary">
            Browse Tenders
          </Link>
          <Link to="/my-bids" className="btn btn-secondary">
            My Bids
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{dashboardData.stats.total_bids || 0}</h3>
            <p>Total Bids</p>
          </div>
        </div>
        
        <div className="stat-card winning">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>{dashboardData.stats.won_bids || 0}</h3>
            <p>Bids Won</p>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{dashboardData.stats.pending_bids || 0}</h3>
            <p>Pending Bids</p>
          </div>
        </div>
        
        <div className="stat-card average">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{formatCurrency(dashboardData.stats.avg_bid_amount)}</h3>
            <p>Avg Bid Amount</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Active Tenders */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>🎯 Active Tenders</h2>
            <Link to="/active-tenders" className="view-all-link">
              View All
            </Link>
          </div>
          
          {dashboardData.activeTenders.length === 0 ? (
            <div className="empty-state">
              <p>No active tenders available at the moment.</p>
              <Link to="/active-tenders" className="btn btn-outline">
                Browse All Tenders
              </Link>
            </div>
          ) : (
            <div className="tenders-list">
              {dashboardData.activeTenders.slice(0, 4).map(tender => {
                const daysRemaining = getDaysRemaining(tender.deadline);
                return (
                  <div key={tender.id} className="tender-card">
                    <div className="tender-header">
                      <h4>{tender.title}</h4>
                      <span className="tender-category">{tender.category_name}</span>
                    </div>
                    <div className="tender-details">
                      <div className="tender-budget">
                        <strong>Budget:</strong> 
                        {tender.budget_min && tender.budget_max 
                          ? `${formatCurrency(tender.budget_min)} - ${formatCurrency(tender.budget_max)}`
                          : formatCurrency(tender.budget_max || tender.budget_min)
                        }
                      </div>
                      <div className="tender-deadline">
                        <strong>Deadline:</strong> {formatDate(tender.deadline)}
                        {daysRemaining !== null && (
                          <span className={`days-remaining ${daysRemaining <= 3 ? 'urgent' : ''}`}>
                            ({daysRemaining} days left)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="tender-description">
                      {tender.description.length > 150 
                        ? `${tender.description.substring(0, 150)}...`
                        : tender.description
                      }
                    </div>
                    <div className="tender-actions">
                      <button 
                        onClick={() => handleViewTender(tender.id)}
                        className="btn btn-sm btn-outline"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => handleBidOnTender(tender.id)}
                        className="btn btn-sm btn-primary"
                      >
                        Place Bid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Bids */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>📋 My Recent Bids</h2>
            <Link to="/my-bids" className="view-all-link">
              View All
            </Link>
          </div>
          
          {dashboardData.myBids.length === 0 ? (
            <div className="empty-state">
              <p>You haven't placed any bids yet.</p>
              <Link to="/active-tenders" className="btn btn-outline">
                Start Bidding
              </Link>
            </div>
          ) : (
            <div className="bids-list">
              {dashboardData.myBids.map(bid => (
                <div key={bid.id} className="bid-card">
                  <div className="bid-header">
                    <h4>{bid.tender_title}</h4>
                    <span className={`bid-status ${getBidStatusColor(bid.status)}`}>
                      {bid.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="bid-details">
                    <div className="bid-amount">
                      <strong>Bid Amount:</strong> {formatCurrency(bid.amount)}
                    </div>
                    <div className="bid-date">
                      <strong>Submitted:</strong> {formatDateTime(bid.submitted_at)}
                    </div>
                  </div>
                  <div className="bid-proposal">
                    {bid.proposal.length > 100 
                      ? `${bid.proposal.substring(0, 100)}...`
                      : bid.proposal
                    }
                  </div>
                  <div className="bid-actions">
                    <button 
                      onClick={() => handleViewBid(bid.id)}
                      className="btn btn-sm btn-outline"
                    >
                      View Details
                    </button>
                    {bid.status === 'pending' && (
                      <button 
                        onClick={() => navigate(`/bid/edit/${bid.id}`)}
                        className="btn btn-sm btn-secondary"
                      >
                        Edit Bid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips Section */}
      <div className="dashboard-section">
        <h2>💡 Quick Tips for Successful Bidding</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>📝 Write Clear Proposals</h4>
            <p>Provide detailed technical and commercial proposals that address all tender requirements.</p>
          </div>
          <div className="tip-card">
            <h4>⏰ Submit Early</h4>
            <p>Don't wait until the last minute. Submit your bids well before the deadline.</p>
          </div>
          <div className="tip-card">
            <h4>💼 Be Competitive</h4>
            <p>Research market rates and provide competitive pricing while maintaining quality.</p>
          </div>
          <div className="tip-card">
            <h4>📎 Include Documents</h4>
            <p>Attach all required supporting documents to strengthen your bid.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidderDashboard;
