import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import tenderService from '../services/tender';
import apiService from '../services/api';
import './TenderList.css';

const TenderList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenders();
  }, [pagination.page, selectedStatus]);

  useEffect(() => {
    // Load categories once for name resolution
    const loadCategories = async () => {
      try {
        const res = await apiService.get('/categories');
        const cats = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.categories) ? res.data.categories : (Array.isArray(res) ? res : []));
        setCategories(cats || []);
      } catch {
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedStatus !== 'all' && { status: selectedStatus })
      };
      
      const response = await tenderService.getMyTenders(params);
      setTenders(response.tenders || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
    } catch (err) {
      console.error('Error fetching tenders:', err);
      const errorMessage = 'Unable to fetch tenders. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchTenders();
    }, 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
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

  const handleCreateNew = () => {
    navigate('/tenders/create');
  };

  const handleEdit = (tenderId) => {
    navigate(`/tenders/edit/${tenderId}`);
  };

  const handleView = (tenderId) => {
    navigate(`/tender/${tenderId}`);
  };

  const handlePublish = async (tenderId, tenderTitle = 'tender') => {
    if (!window.confirm(`Are you sure you want to publish "${tenderTitle}"? This will make it visible to all vendors.`)) {
      return;
    }
    
    try {
      await tenderService.publishTender(tenderId);
      toast.success(`Tender "${tenderTitle}" published successfully!`);
      fetchTenders(); // Refresh list
    } catch (err) {
      console.error('Error publishing tender:', err);
      const errorMessage = err.message || 'Failed to publish tender';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const filteredTenders = tenders.filter(tender =>
    tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.tender_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="tender-list">
      <div className="header-section">
        <div className="brand-header">
          <h1>My Tenders</h1>
          <p>Manage and track your tender postings</p>
        </div>
        
        <div className="actions-header">
          <button 
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            + Create New Tender
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-section">
          <label htmlFor="search">Search:</label>
          <input 
            type="text" 
            id="search" 
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search tenders..."
          />
        </div>
        
        <div className="status-filter">
          <label htmlFor="status">Status:</label>
          <select 
            id="status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="awarded">Awarded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading tenders...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchTenders}>Retry</button>
          </div>
        )}
        
        {!loading && (
          <>
            <table className="tender-table">
              <thead>
                <tr>
                  <th>Sr#</th>
                  <th>Tender</th>
                  <th>Category</th>
                  <th>Created Date</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Bids</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {searchTerm ? 'No tenders found matching your search.' : 'No tenders created yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredTenders.map((tender, index) => (
                    <tr key={tender.id || index}>
                      <td>{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                      <td>
                        <div className="tender-details">
                          <div className="tender-title">{tender.title}</div>
                          <div className="tender-code">{tender.tender_number}</div>
                        </div>
                      </td>
                      <td>{(() => {
                        if (tender.display_category) return tender.display_category;
                        if (tender.category_name) return tender.category_name;
                        if (tender.category_id && categories.length > 0) {
                          const cat = categories.find(c => c.id == tender.category_id);
                          if (cat?.name) return cat.name;
                        }
                        if (tender.category) return tender.category;
                        return 'Uncategorized';
                      })()}</td>
                      <td>{formatDate(tender.created_at)}</td>
                      <td>{formatDate(tender.deadline)}</td>
                      <td>{getStatusBadge(tender.status)}</td>
                      <td>
                        <span className="bid-count">
                          {tender.bid_count || 0} bids
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="btn-small view-btn"
                          onClick={() => handleView(tender.id)}
                        >
                          View
                        </button>
                        {tender.status === 'draft' && (
                          <>
                            <button 
                              className="btn-small edit-btn"
                              onClick={() => handleEdit(tender.id)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn-small publish-btn"
                              onClick={() => handlePublish(tender.id, tender.title)}
                            >
                              Publish
                            </button>
                          </>
                        )}
                        {(tender.status === 'open' || tender.status === 'closed') && (
                          <button 
                            className="btn-small results-btn"
                            onClick={() => navigate(`/tender/${tender.id}/results`)}
                          >
                            Results
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {pagination.total > pagination.limit && (
              <div className="pagination">
                <button 
                  disabled={pagination.page === 1} 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </button>
                <span>Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}</span>
                <button 
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="back-to-home">
        <Link to="/" className="home-link">← Back to Home</Link>
      </div>
    </div>
  );
};

export default TenderList;
