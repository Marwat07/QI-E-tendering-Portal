import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  Search,
  Filter,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Building,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import './ActiveTendersTable.css';

// Use a consistent API base with the app-wide service defaults
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const ActiveTendersTable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tenders, setTenders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activitySummary, setActivitySummary] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    status: 'open'
  });
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchData();
  }, [currentPage, sortConfig, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch categories (no auth required for categories)
      const categoriesResponse = await fetch(`${API_BASE_URL}/categories`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        let cats = [];
        if (Array.isArray(categoriesData)) {
          cats = categoriesData;
        } else if (Array.isArray(categoriesData.data)) {
          cats = categoriesData.data;
        } else if (Array.isArray(categoriesData.data?.categories)) {
          cats = categoriesData.data.categories;
        } else if (Array.isArray(categoriesData.categories)) {
          cats = categoriesData.categories;
        }
        setCategories(cats);
      } else {
        setCategories([]);
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add pagination (backend expects page + limit)
      queryParams.append('limit', itemsPerPage);
      queryParams.append('page', currentPage);
      
      // Add sorting
      if (sortConfig.key) {
        queryParams.append('sort_by', sortConfig.key);
        queryParams.append('sort_direction', sortConfig.direction);
      }
      
      // Add filters (only meaningful non-empty values)
      // Only add search if it has meaningful content
      if (filters.search && filters.search.toString().trim().length > 0) {
        queryParams.append('search', filters.search.toString().trim());
      }
      
      // Add category filter if selected
      if (filters.category_id && filters.category_id.toString().trim()) {
        queryParams.append('category_id', filters.category_id);
      }
      
      
      // Always fetch only active tenders - this should show all active tenders by default
      queryParams.append('status', 'open');
      // Remove the active_only filter to get more results
      // queryParams.append('active_only', 'true');
      
      // Fetch tenders with auth header if user is logged in
      const headers = {};
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Fetching tenders with URL:', `${API_BASE_URL}/tenders/public?${queryParams}`);
      
// If user is authenticated and has categories, use category-based filtering
      let tendersResponse;
      const hasMultiCategories = user && Array.isArray(user.categories) && user.categories.length > 0;
      const hasSingleCategory = user && user.category;
      if (token && (hasMultiCategories || hasSingleCategory)) {
        if (hasMultiCategories) {
          console.log(`User has categories: ${user.categories.join(', ')}, fetching category-filtered tenders...`);
        } else {
          console.log(`User has category: ${user.category}, fetching category-filtered tenders...`);
        }
        tendersResponse = await fetch(`${API_BASE_URL}/tenders/my-category?${queryParams}`, { headers });
      } else {
        // Fall back to public endpoint for unauthenticated users or users without category
        console.log('Using public tenders endpoint...');
        tendersResponse = await fetch(`${API_BASE_URL}/tenders/public?${queryParams}`);
      }
      
      // If category endpoint fails and user is authenticated, try the authenticated endpoint
      if (!tendersResponse.ok && token) {
        console.log('Category/Public tenders API failed, trying authenticated endpoint...');
        tendersResponse = await fetch(`${API_BASE_URL}/tenders?${queryParams}`, { headers });
        
        // If that also fails, try the admin endpoint
        if (!tendersResponse.ok) {
          console.log('Authenticated tenders API failed, trying admin endpoint...');
          tendersResponse = await fetch(`${API_BASE_URL}/admin/tenders`, { headers });
        }
      }
      
      if (tendersResponse.ok) {
        const tendersData = await tendersResponse.json();
        console.log('Raw tenders data:', tendersData);
        
        // Handle different response structures more comprehensively
        let tendersArray = [];
        if (Array.isArray(tendersData)) {
          tendersArray = tendersData;
        } else if (tendersData.data && Array.isArray(tendersData.data.tenders)) {
          tendersArray = tendersData.data.tenders;
        } else if (tendersData.data && Array.isArray(tendersData.data)) {
          tendersArray = tendersData.data;
        } else if (Array.isArray(tendersData.tenders)) {
          tendersArray = tendersData.tenders;
        } else if (tendersData.results && Array.isArray(tendersData.results)) {
          tendersArray = tendersData.results;
        }
        
        // Filter to only show open/active tenders if they're not already filtered
        let activeTenders = tendersArray.filter(tender => 
          tender.status === 'open' || tender.status === 'active' || !tender.status
        );
        
        // Apply activity filter if specified
        if (filters.activity_filter) {
          activeTenders = activeTenders.filter(tender => {
            switch (filters.activity_filter) {
              case 'new':
                return tender.is_new || tender.activity_status === 'new';
              case 'recent':
                return tender.is_recent || tender.activity_status === 'recent';
              case 'updated':
                return tender.is_recently_updated || tender.activity_status === 'updated';
              default:
                return true;
            }
          });
        }
        
        console.log(`Found ${activeTenders.length} active tenders out of ${tendersArray.length} total`);
        
        // Read total count from pagination if available
        const total = tendersData.data?.pagination?.total 
          || tendersData.data?.total 
          || tendersData.total 
          || activeTenders.length;
        const activitySummary = tendersData.data?.activity_summary || null;
        
        setTenders(activeTenders);
        setTotalItems(total);
        setActivitySummary(activitySummary);
        
        // Show success message if we found tenders
        if (activeTenders.length > 0) {
          console.log('Successfully loaded tenders:', activeTenders.map(t => t.title));
        }
      } else {
        const errorData = await tendersResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${tendersResponse.status}: Failed to fetch tenders`);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMessage = err.message || 'Failed to load tenders. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      status: 'open',
      activity_filter: ''
    });
    setCurrentPage(1);
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0 || amount === '') return 'Not specified';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatBudgetRange = (budgetMin, budgetMax) => {
    const hasMin = budgetMin && budgetMin !== 0 && budgetMin !== '';
    const hasMax = budgetMax && budgetMax !== 0 && budgetMax !== '';
    
    if (!hasMin && !hasMax) {
      return 'Budget not specified';
    } else if (hasMin && hasMax) {
      return `${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)}`;
    } else if (hasMin) {
      return `From ${formatCurrency(budgetMin)}`;
    } else {
      return `Up to ${formatCurrency(budgetMax)}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { class: 'bg-green-100 text-green-800', text: 'Open' },
      closed: { class: 'bg-red-100 text-red-800', text: 'Closed' },
      draft: { class: 'bg-gray-100 text-gray-800', text: 'Draft' },
      cancelled: { class: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const getDaysRemainingBadge = (deadline) => {
    const daysRemaining = getDaysRemaining(deadline);
    if (daysRemaining === null) return null;
    
    let badgeClass = 'bg-gray-100 text-gray-800';
    let text = `${daysRemaining} days`;
    
    if (daysRemaining < 0) {
      badgeClass = 'bg-red-100 text-red-800';
      text = 'Expired';
    } else if (daysRemaining === 0) {
      badgeClass = 'bg-orange-100 text-orange-800';
      text = 'Today';
    } else if (daysRemaining <= 3) {
      badgeClass = 'bg-orange-100 text-orange-800';
    } else if (daysRemaining <= 7) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
    } else {
      badgeClass = 'bg-green-100 text-green-800';
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
        <Clock className="w-3 h-3 mr-1" />
        {text}
      </span>
    );
  };

  // Helper function to determine content class based on text length
  const getContentClass = (tender) => {
    const titleLength = tender.title ? tender.title.length : 0;
    const descriptionLength = tender.description ? tender.description.length : 0;
    const totalLength = titleLength + descriptionLength;
    
    if (totalLength > 150) return 'long-content';
    if (totalLength < 50) return 'short-content';
    return '';
  };

  // Helper function to determine tender info class
  const getTenderInfoClass = (tender) => {
    const titleLength = tender.title ? tender.title.length : 0;
    if (titleLength > 50) return 'tender-info expanded';
    if (titleLength < 20) return 'tender-info compact';
    return 'tender-info';
  };

  const handleViewTender = (tenderId) => {
    navigate(`/tender/${tenderId}`);
  };

  const handleBidOnTender = (tenderId) => {
    if (!user) {
      toast.error('Please login to submit a bid');
      navigate('/login');
      return;
    }
    navigate(`/bid/${tenderId}`);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
  };

  // Pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const goToPage = (page) => {
    setCurrentPage(page);
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

  if (error) {
    return (
      <div className="active-tenders-table">
        <div className="error-container">
          <h2>Error Loading Tenders</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn-retry">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="active-tenders-table">
      {/* Header */}
      <div className="tenders-table-header">
        <div className="header-main">
          <h1>Active Tenders</h1>
          <div className="activity-summary">
            {activitySummary && (
              <div className="activity-badges">
                {activitySummary.new_tenders > 0 && (
                  <span className="activity-badge new">
                    <span className="badge-count">{activitySummary.new_tenders}</span> New
                  </span>
                )}
                {activitySummary.updated_tenders > 0 && (
                  <span className="activity-badge updated">
                    <span className="badge-count">{activitySummary.updated_tenders}</span> Updated
                  </span>
                )}
                {activitySummary.recent_tenders > 0 && (
                  <span className="activity-badge recent">
                    <span className="badge-count">{activitySummary.recent_tenders}</span> This Week
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="header-info">
{user && (Array.isArray(user.categories) ? user.categories.length > 0 : !!user.category) ? (
            <p>
              Tenders matching your business {Array.isArray(user.categories) && user.categories.length > 1 ? 'categories' : 'category'}:
              {' '}
              <strong style={{color: '#fbbf24'}}>
                {Array.isArray(user.categories) && user.categories.length > 0
                  ? user.categories.join(', ')
                  : String(user.category || '')
                }
              </strong>
            </p>
          ) : (
            <p>Browse and bid on available tenders</p>
          )}
          <div className="category-filter-info">
            {filters.category_id && categories.length > 0 && (
              <span className="filter-indicator">
                📂 Filtered by category: <strong>{categories.find(c => c.id == filters.category_id)?.name || 'Selected Category'}</strong>
              </span>
            )}
            {!filters.category_id && categories.length > 0 && (
              <span className="filter-indicator" style={{opacity: 0.7}}>
                📋 Showing all categories ({categories.length} available)
              </span>
            )}
          </div>
        </div>
        {/* Debug info */}
        {!loading && (
          <div style={{ fontSize: '12px', color: 'white', marginTop: '8px', opacity: 0.8 }}>
            Found {tenders.length} tenders | Total: {totalItems} | Page: {currentPage}
{user && Array.isArray(user.categories) && user.categories.length > 0 && (
              <span> | Your Categories: {user.categories.join(', ')}</span>
            )}
            {user && !Array.isArray(user.categories) && user.category && (
              <span> | Your Category: {user.category}</span>
            )}
            {tenders.length > 0 && (
              <span> | Latest: {tenders[0]?.title?.substring(0, 30)}...</span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          {/* Search */}
          <div className="filter-group">
            <label>Search</label>
            <div style={{ position: 'relative' }}>
              <Search style={{ width: '16px', height: '16px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search tenders..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category_id}
              onChange={(e) => handleFilterChange('category_id', e.target.value)}
            >
              <option value="">All Categories ({tenders.length} tenders)</option>
              {categories.map((category) => {
                const categoryTenders = tenders.filter(t => 
                  t.category_id == category.id || 
                  (t.category_name && t.category_name.toLowerCase() === category.name.toLowerCase())
                );
                const newInCategory = categoryTenders.filter(t => t.is_new).length;
                const recentInCategory = categoryTenders.filter(t => t.is_recent).length;
                
                return (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {categoryTenders.length > 0 ? ` (${categoryTenders.length} tenders)` : ' (0 tenders)'}
                    {newInCategory > 0 && ` • ${newInCategory} new`}
                    {recentInCategory > 0 && ` • ${recentInCategory} recent`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Activity Filter */}
          <div className="filter-group">
            <label>Activity</label>
            <select
              value={filters.activity_filter || ''}
              onChange={(e) => handleFilterChange('activity_filter', e.target.value)}
            >
              <option value="">All Activity</option>
              <option value="new">New (Last 24h)</option>
              <option value="recent">Recent (Last 3 days)</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="filter-group">
            <label style={{ visibility: 'hidden' }}>Actions</label>
            <div className="filter-actions">
              <button onClick={clearFilters} className="btn-clear-filters">
                Clear all filters
              </button>
              <button onClick={fetchData} className="btn-refresh">
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <p>Loading tenders...</p>
          </div>
        ) : tenders.length === 0 ? (
          <div className="table-empty">
            <FileText className="empty-icon" style={{ width: '64px', height: '64px' }} />
            <h3>No Active Tenders Found</h3>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p>There are currently no active tenders available.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>This could mean:</p>
              <ul style={{ listStyle: 'none', fontSize: '14px', color: '#666' }}>
                <li>• No tenders have been published yet</li>
                <li>• All current tenders have expired</li>
                <li>• Tenders are in draft status</li>
              </ul>
              <p style={{ fontSize: '14px', marginTop: '10px' }}>Check back later or contact the administrator.</p>
            </div>
            {user && (
              <div style={{ marginTop: '20px' }}>
                <button onClick={() => navigate('/')} className="btn-view">
                  Go to Homepage
                </button>
              </div>
            )}
          </div>
        ) : (
            <>
              <div className="table-overflow">
                <table className="tender-table">
                  <thead className="table-header">
                    <tr>
                      <th className="number-column">S#</th>
                      <th>
                        <button onClick={() => handleSort('title')} className="sort-button">
                          <span>Tender</span>
                          {getSortIcon('title')}
                        </button>
                      </th>
                      <th>
                        <button onClick={() => handleSort('category_name')} className="sort-button">
                          <span>Category</span>
                          {getSortIcon('category_name')}
                        </button>
                      </th>
                      <th>
                        <button onClick={() => handleSort('budget_min')} className="sort-button">
                          <span>Budget Range</span>
                          {getSortIcon('budget_min')}
                        </button>
                      </th>
                      <th>
                        <button onClick={() => handleSort('deadline')} className="sort-button">
                          <span>Deadline</span>
                          {getSortIcon('deadline')}
                        </button>
                      </th>
                      <th>Status</th>
                      <th>
                        <button onClick={() => handleSort('created_at')} className="sort-button">
                          <span>Published</span>
                          {getSortIcon('created_at')}
                        </button>
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {tenders.map((tender, index) => (
                      <tr key={tender.id} className={`table-row ${getContentClass(tender)}`}>
                        <td className="table-cell number-cell">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="table-cell tender-info-cell">
                          <div className={getTenderInfoClass(tender)}>
                            <div className="tender-title-container">
                              <div className="tender-title">
                                {tender.title}
                                {tender.activity_status && tender.activity_status !== 'normal' && (
                                  <span className={`activity-indicator ${tender.activity_status}`}>
                                    {tender.activity_status === 'new' && 'NEW'}
                                    {tender.activity_status === 'updated' && 'UPDATED'}
                                    {/* Intentionally hide the 'RECENT' label to avoid layout issues */}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="tender-description">
                              {tender.description}
                            </div>
                            {tender.created_by_name && (
                              <div className="tender-creator">
                                <Building style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                {tender.created_by_name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="category-info">
                            <span className="category-badge">
                              {(() => {
                                // Resolve display category using all available data
                                if (tender.display_category && tender.display_category.trim()) return tender.display_category;
                                if (tender.category_name && tender.category_name.trim()) return tender.category_name;
                                if (tender.category_id && categories && categories.length > 0) {
                                  const cat = categories.find(c => c.id == tender.category_id);
                                  if (cat?.name) return cat.name;
                                }
                                if (Array.isArray(tender.categories) && tender.categories.length > 0) return tender.categories.join(', ');
                                if (tender.category && String(tender.category).trim()) return tender.category;
                                return 'Uncategorized';
                              })()}
                            </span>
                            {tender.activity_status && tender.activity_status !== 'normal' && (
                              <div className="category-activity-indicator">
                                {tender.activity_status === 'new' && (
                                  <span className="activity-dot new" title="New tender in this category"></span>
                                )}
                                {tender.activity_status === 'updated' && (
                                  <span className="activity-dot updated" title="Recently updated tender"></span>
                                )}
                                {tender.activity_status === 'recent' && (
                                  <span className="activity-dot recent" title="Recent tender in this category"></span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="budget-info">
                            <div className="budget-amount">
                              {formatBudgetRange(tender.budget_min, tender.budget_max)}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="deadline-info">
                            <div className="deadline-date">
                              {formatDateTime(tender.deadline)}
                            </div>
                            <div className="deadline-badge">
                              {getDaysRemainingBadge(tender.deadline)}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          {getStatusBadge(tender.status)}
                        </td>
                        <td className="table-cell published-info">
                          <div className="published-date">
                            <Calendar style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                            {formatDate(tender.created_at)}
                          </div>
                        </td>
                        <td className="table-cell actions-cell">
                          <div className="table-actions">
                            <button
                              onClick={() => handleViewTender(tender.id)}
                              className="btn-view"
                            >
                              <Eye style={{ width: '10px', height: '10px', marginRight: '2px' }} />
                              View
                            </button>
                            {user && tender.status === 'open' && !tender.isExpired && (
                              <button
                                onClick={() => handleBidOnTender(tender.id)}
                                className="btn-bid"
                              >
                                <FileText style={{ width: '10px', height: '10px', marginRight: '2px' }} />
                                Bid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination-container">
                <div className="pagination-mobile">
                  <button
                    onClick={() => goToPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="pagination-button pagination-prev"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-button pagination-next"
                  >
                    Next
                  </button>
                </div>
                <div className="pagination-desktop">
                  <div className="pagination-info">
                    <p>
                      Showing <span className="pagination-highlight">{startItem}</span> to{' '}
                      <span className="pagination-highlight">{endItem}</span> of{' '}
                      <span className="pagination-highlight">{totalItems}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="pagination-nav" aria-label="Pagination">
                      <button
                        onClick={() => goToPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="pagination-button pagination-arrow"
                      >
                        <ChevronLeft style={{ width: '20px', height: '20px' }} />
                      </button>
                      {getPageNumbers().map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`pagination-button pagination-page ${
                            page === currentPage ? 'pagination-page-active' : ''
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="pagination-button pagination-arrow"
                      >
                        <ChevronRight style={{ width: '20px', height: '20px' }} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
};

export default ActiveTendersTable;
