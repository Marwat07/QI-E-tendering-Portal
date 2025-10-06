import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { showToast } from '../utils/toast';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Filter,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Tags
} from 'lucide-react';
import './AdminDashboard.css';
import './CreateUserModal.css';
import Pagination from './Pagination';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Debug logging
  console.log('AdminDashboard - Current user:', user);
  console.log('AdminDashboard - Auth token:', localStorage.getItem('authToken'));
  
  // Get initial active tab from navigation state or default to overview
  const initialTab = location.state?.activeTab || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalTenders: 0,
    totalBids: 0,
    platformValue: 0,
    pendingBids: 0,
    activeTenders: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      console.log('Fetching dashboard stats with token:', token ? 'Token present' : 'No token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // API calls to fetch dashboard statistics
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Dashboard API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Dashboard API error:', errorData);
        
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          toast.error('Authentication failed. Please login again.');
          return;
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch dashboard stats`);
      }
      
      const data = await response.json();
      console.log('Dashboard API response data:', data);
      
      // Handle the correct API response structure
      if (data.success && data.data && data.data.stats) {
        setDashboardStats(data.data.stats);
        console.log('Dashboard stats set successfully:', data.data.stats);
      } else if (data.stats) {
        // Fallback for direct stats format
        setDashboardStats(data.stats);
        console.log('Dashboard stats set from fallback:', data.stats);
      } else {
        console.warn('Unexpected data structure:', data);
        setDashboardStats({
          totalUsers: 0,
          totalTenders: 0,
          totalBids: 0,
          platformValue: 0,
          pendingBids: 0,
          activeTenders: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error(error.message || 'Failed to load dashboard statistics');
      // Set default stats on error
      setDashboardStats({
        totalUsers: 0,
        totalTenders: 0,
        totalBids: 0,
        platformValue: 0,
        pendingBids: 0,
        activeTenders: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'tenders', label: 'Tender Management', icon: FileText },
    { id: 'bids', label: 'Bid Management', icon: DollarSign },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'upload-tender', label: 'Upload Tender', icon: Upload }
  ];

  return (
    <div className="admin-dashboard">
      <div className="flex">
        {/* Sidebar */}
        <div className="admin-sidebar">
          <div className="admin-sidebar-header">
            <h2 className="admin-sidebar-title">Admin Dashboard</h2>
            <p className="admin-sidebar-subtitle">Welcome, {user?.first_name}</p>
          </div>
          <nav className="admin-sidebar-nav">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`admin-sidebar-item ${ 
                    activeTab === item.id ? 'active' : ''
                  }`}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="admin-main-content">
          {activeTab === 'overview' && <OverviewTab stats={dashboardStats} loading={loading} onNavigateToTab={setActiveTab} onRefresh={fetchDashboardStats} />}
          {activeTab === 'tenders' && <TenderManagementTab key={refreshTrigger} />}
          {activeTab === 'bids' && <BidManagementTab />}
          {activeTab === 'users' && <UserManagementTab />}
          {activeTab === 'categories' && <CategoryManagementTab />}
          {activeTab === 'upload-tender' && <UploadTenderTab onTenderUploaded={() => {
            setRefreshTrigger(prev => prev + 1);
            setActiveTab('tenders');
            toast.success('Tender uploaded successfully! Switched to Tender Management.');
          }} />}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats, loading, onRefresh, onNavigateToTab }) => {
  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '1rem' }}>Loading dashboard statistics...</p>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers || 0, 
      icon: Users, 
      color: 'blue',
      subtitle: 'Registered users'
    },
    { 
      title: 'Active Tenders', 
      value: stats.activeTenders || 0, 
      icon: FileText, 
      color: 'green',
      subtitle: 'Currently open'
    },
    { 
      title: 'Total Bids', 
      value: stats.totalBids || 0, 
      icon: DollarSign, 
      color: 'yellow',
      subtitle: 'All submissions'
    },
    { 
      title: 'Pending Reviews', 
      value: stats.pendingBids || 0, 
      icon: Clock, 
      color: 'orange',
      subtitle: 'Awaiting approval'
    }
  ];

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        borderRadius: '0.75rem',
        marginBottom: '2rem',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', margin: 0 }}>Welcome to Admin Dashboard</h1>
            <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0 }}>{currentDate} • E-Tendering Platform</p>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="btn btn-secondary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
              title="Refresh dashboard data"
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Platform Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Platform Overview</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Monitor key metrics and manage system resources</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((card) => {
          const Icon = card.icon;
          
          return (
            <div key={card.title} className="stat-card">
              <div className="stat-card-content">
                <div className={`stat-card-icon ${card.color}`}>
                  <Icon />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="stat-card-title">{card.title}</p>
                  <p className="stat-card-value">{card.value.toLocaleString()}</p>
                  {card.subtitle && (
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af', 
                      margin: '0.25rem 0 0 0',
                      fontWeight: '400'
                    }}>
                      {card.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Admin Actions - Simple 3 Button Layout */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', textAlign: 'center' }}>Administrative Actions</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem', textAlign: 'center' }}>Choose from the main administrative functions</p>
      </div>

      <div className="admin-main-actions">
        <div className="admin-action-card" onClick={() => onNavigateToTab('tenders')}>
          <div className="admin-action-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <FileText size={40} color="white" />
          </div>
          <h3 className="admin-action-title">Tender Management</h3>
          <p className="admin-action-description">
            Create, edit, and manage all tenders in the system. Upload tender documents and track their status.
          </p>
          <div className="admin-action-stats">
            <span className="stat-highlight">{stats.activeTenders || 0} Active Tenders</span>
          </div>
        </div>

        <div className="admin-action-card" onClick={() => onNavigateToTab('bids')}>
          <div className="admin-action-icon" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
            <DollarSign size={40} color="white" />
          </div>
          <h3 className="admin-action-title">Bid Management</h3>
          <p className="admin-action-description">
            Review, approve, and manage all submitted bids. Track bid submissions and vendor proposals.
          </p>
          <div className="admin-action-stats">
            <span className="stat-highlight">{stats.pendingBids || 0} Pending Reviews</span>
          </div>
        </div>

        <div className="admin-action-card" onClick={() => onNavigateToTab('users')}>
          <div className="admin-action-icon" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <Users size={40} color="white" />
          </div>
          <h3 className="admin-action-title">User Management</h3>
          <p className="admin-action-description">
            Manage user accounts, permissions, and roles. Create new users and handle account settings.
          </p>
          <div className="admin-action-stats">
            <span className="stat-highlight">{stats.totalUsers || 0} Total Users</span>
          </div>
        </div>
      </div>

      {/* Secondary Actions */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Additional Tools</h3>
        <div className="admin-secondary-actions">
          <button 
            className="admin-secondary-btn"
            onClick={() => onNavigateToTab('upload-tender')}
            title="Upload a new tender document"
          >
            <Upload size={20} style={{ color: '#3b82f6' }} />
            <span>Quick Upload</span>
          </button>
          <button 
            className="admin-secondary-btn"
            onClick={() => onNavigateToTab('categories')}
            title="Manage business categories"
          >
            <Tags size={20} style={{ color: '#10b981' }} />
            <span>Categories</span>
          </button>
          <button 
            className="admin-secondary-btn"
            onClick={onRefresh}
            title="Refresh dashboard data"
          >
            <RefreshCw size={20} style={{ color: '#8b5cf6' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// User form categories - Updated to match the 9 categories used in forms
const USER_CATEGORIES = [
  { value: 'Construction & Infrastructure', label: 'Construction & Infrastructure' },
  { value: 'IT & Software Services', label: 'Information Technology' },
  { value: 'Pharmaceuticals', label: 'Healthcare & Medical' },
  { value: 'Transportation & Logistics', label: 'Transportation & Logistics' },
  { value: 'Professional Services', label: 'Professional Services' },
  { value: 'Office Supplies & Equipment', label: 'Supplies & Equipment' },
  { value: 'Chemicals', label: 'Energy & Utilities' },
  { value: 'Consulting', label: 'Education & Training' },
  { value: 'Other', label: 'Other' }
];

// Note: We keep USER_CATEGORIES for the edit form dropdown options
// But the table display now shows actual category data from tenders

// Helper function to get category name with fallbacks
const getCategoryName = (tender, categories = [], managedCategories = []) => {
  // First, try the categories array (highest priority - from tender_categories junction table)
  if (tender.categories && Array.isArray(tender.categories) && tender.categories.length > 0) {
    // Map all categories to their display names and join them
    const mappedCategories = tender.categories.map(categoryValue => {
      if (categoryValue && typeof categoryValue === 'string') {
        const trimmedValue = categoryValue.trim();
        
        // First try to find in managed categories (highest priority)
        const managedCategory = managedCategories.find(cat => 
          cat.name.toLowerCase() === trimmedValue.toLowerCase() ||
          cat.name === trimmedValue
        );
        
        if (managedCategory) {
          return managedCategory.name;
        }
        
        // Fallback to USER_CATEGORIES for backward compatibility
        const matchingCategory = USER_CATEGORIES.find(cat => 
          cat.value.toLowerCase() === trimmedValue.toLowerCase() ||
          cat.label.toLowerCase() === trimmedValue.toLowerCase() ||
          cat.value === trimmedValue ||
          cat.label === trimmedValue
        );
        
        if (matchingCategory) {
          return matchingCategory.label;
        }
        
        // Final fallback: capitalize first letter
        return trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1);
      }
      return null;
    }).filter(Boolean); // Remove null values
    
    if (mappedCategories.length > 0) {
      return mappedCategories.join(', '); // Join multiple categories with comma
    }
  }
  
  // Try display_category field (from SQL aggregation)
  if (tender.display_category && typeof tender.display_category === 'string' && tender.display_category.trim()) {
    return tender.display_category.trim();
  }
  
  // Try other possible field names where category might be stored
  const possibleFields = [
    'category',           // Most likely from TenderForm
    'category_name',      // Alternative
    'tender_category',    // Possible database field
    'type',              // Sometimes used instead of category
    'classification',     // Alternative name
    'sector',            // Another alternative
  ];
  
  // Check each possible field and try to match with USER_CATEGORIES
  for (const field of possibleFields) {
    if (tender[field] && typeof tender[field] === 'string' && tender[field].trim()) {
      const categoryValue = tender[field].trim();
      
      // Try to find matching USER_CATEGORIES entry
      const matchingCategory = USER_CATEGORIES.find(cat => 
        cat.value.toLowerCase() === categoryValue.toLowerCase() ||
        cat.label.toLowerCase() === categoryValue.toLowerCase() ||
        cat.value === categoryValue ||
        cat.label === categoryValue
      );
      
      if (matchingCategory) {
        return matchingCategory.label;
      }
      
      // If no exact match, return the original category value
      return categoryValue;
    }
  }
  
  // Try to map category_id to category name using categories list from API
  if (tender.category_id && categories.length > 0) {
    const foundCategory = categories.find(cat => cat.id == tender.category_id);
    if (foundCategory && foundCategory.name) {
      // Try to match the found category name with USER_CATEGORIES
      const matchingCategory = USER_CATEGORIES.find(cat => 
        cat.value.toLowerCase() === foundCategory.name.toLowerCase() ||
        cat.label.toLowerCase() === foundCategory.name.toLowerCase() ||
        cat.value === foundCategory.name ||
        cat.label === foundCategory.name
      );
      
      if (matchingCategory) {
        return matchingCategory.label;
      }
      
      return foundCategory.name;
    }
  }
  
  // Final fallback
  return 'Other';
};

// Tender Management Tab Component
const TenderManagementTab = () => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingTender, setEditingTender] = useState(null);
  const [categories, setCategories] = useState([]);
  const [managedCategories, setManagedCategories] = useState([]); // Categories from category management
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: '', // Changed from category_id to match TenderForm
    budget_min: '',
    budget_max: '',
    deadline: '',
    requirements: '',
    status: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchTenders();
    fetchCategories();
    fetchManagedCategories();
  }, []);
  
  // Reset page when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCategory]);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Admin tenders fetch - token present:', !!token);
      
      const response = await fetch(`${API_BASE_URL}/admin/tenders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Admin tenders fetch - response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Admin tenders API response:', data);
        
        // Handle the correct API response structure
        let tendersArray = [];
        if (data.success && data.data && data.data.tenders) {
          tendersArray = data.data.tenders;
        } else if (Array.isArray(data)) {
          tendersArray = data;
        } else if (Array.isArray(data.data)) {
          tendersArray = data.data;
        }
        
        // Debug category information for each tender
        console.log('=== ADMIN TENDERS CATEGORY DEBUG ===');
        tendersArray.forEach((tender, index) => {
          const categoryInfo = {
            id: tender.id,
            title: tender.title,
            category_id: tender.category_id,
            category_name: tender.category_name,
            category: tender.category,
            categories: tender.categories,
            all_properties: Object.keys(tender).filter(key => key.toLowerCase().includes('categor'))
          };
          console.log(`Tender ${index + 1}:`, categoryInfo);
          
          // Test getCategoryName for this tender
          const resolvedCategory = getCategoryName(tender, categories, managedCategories);
          console.log(`Resolved category for tender ${tender.id}:`, resolvedCategory);
        });
        console.log('=== END ADMIN TENDERS CATEGORY DEBUG ===');
        
        setTenders(tendersArray);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch tenders`);
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
      const errorMessage = error.message || 'Failed to load tenders';
      setError(errorMessage);
      toast.error(errorMessage);
      setTenders([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTender = async (tenderId, tenderTitle = 'this tender') => {
    // First, check if this tender has bids
    let confirmMessage = `Are you sure you want to delete \"${tenderTitle}\"?`;
    let bidCount = 0;
    
    try {
      // Get tender details to check for bids
      const checkResponse = await fetch(`${API_BASE_URL}/admin/tenders/${tenderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
        }
      });
      
      if (checkResponse.ok) {
        const tenderData = await checkResponse.json();
        bidCount = tenderData.bids ? tenderData.bids.length : 0;
        
        // Show warning toast before confirmation
        showToast.tenderDeleteWarning(tenderTitle, bidCount);
        
        if (bidCount > 0) {
          confirmMessage = `⚠️ Warning: This tender has ${bidCount} bid${bidCount > 1 ? 's' : ''}!\n\n` +
                          `Deleting \"${tenderTitle}\" will also permanently delete all associated bids.\n\n` +
                          `This action cannot be undone. Are you sure you want to proceed?`;
        }
      }
    } catch (error) {
      console.warn('Could not check tender bids, proceeding with basic confirmation:', error);
      // Still show warning even if we can't check bid count
      showToast.tenderDeleteWarning(tenderTitle, 0);
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenders/${tenderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        showToast.tenderDeleted(tenderTitle);
        fetchTenders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: Failed to delete tender`;
        console.error('Delete tender error:', errorData);
        showToast.tenderDeleteError(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting tender:', error);
      showToast.tenderDeleteError('Failed to delete tender. Please try again.');
    }
  };

  const handleArchiveTender = async (tenderId, tenderTitle = 'this tender') => {
    // Show info toast about what archiving does
    showToast.tenderArchiveWarning(tenderTitle);
    
    const confirmMessage = `Are you sure you want to archive \"${tenderTitle}\"?\n\n` +
                          `This will hide the tender from active listings but preserve all data and bids for record keeping.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenders/${tenderId}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        showToast.tenderArchived(tenderTitle);
        fetchTenders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: Failed to archive tender`;
        console.error('Archive tender error:', errorData);
        showToast.tenderArchiveError(errorMessage);
      }
    } catch (error) {
      console.error('Error archiving tender:', error);
      showToast.tenderArchiveError('Failed to archive tender. Please try again.');
    }
  };

  const handleUnarchiveTender = async (tenderId, tenderTitle = 'this tender') => {
    // Show info toast about what unarchiving does
    showToast.tenderUnarchiveWarning(tenderTitle);
    
    const confirmMessage = `Are you sure you want to unarchive \"${tenderTitle}\"?\n\n` +
                          `This will restore the tender to active listings and make it visible to vendors again.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenders/${tenderId}/unarchive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        showToast.tenderUnarchived(tenderTitle);
        fetchTenders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: Failed to unarchive tender`;
        console.error('Unarchive tender error:', errorData);
        showToast.tenderUnarchiveError(errorMessage);
      }
    } catch (error) {
      console.error('Error unarchiving tender:', error);
      showToast.tenderUnarchiveError('Failed to unarchive tender. Please try again.');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        console.log('Categories API response:', data);
        // Support multiple response shapes: {success:true, data:[...]}, {categories:[...]}, {data:{categories:[...]}}
        const categoriesArray = Array.isArray(data?.data) ? data.data :
                                (Array.isArray(data?.data?.categories) ? data.data.categories :
                                (Array.isArray(data?.categories) ? data.categories : []));
        console.log('Setting categories:', categoriesArray);
        setCategories(categoriesArray);
      } else {
        console.error('Failed to fetch categories:', response.status);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchManagedCategories = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Managed Categories API response:', data);
        // Admin categories endpoint returns {success: true, data: {categories: [...]}}
        const managedCategoriesArray = Array.isArray(data?.data?.categories) ? data.data.categories : [];
        console.log('Setting managed categories:', managedCategoriesArray);
        setManagedCategories(managedCategoriesArray.filter(cat => cat.is_active)); // Only active categories
      } else {
        console.error('Failed to fetch managed categories:', response.status);
      }
    } catch (error) {
      console.error('Error fetching managed categories:', error);
    }
  };

  const handleEditTender = (tender) => {
    console.log('Editing tender with category info:', {
      id: tender.id,
      category_id: tender.category_id,
      category_name: tender.category_name,
      category: tender.category
    });
    
    // Helper function to get category value for editing (should match managed categories or USER_CATEGORIES values)
    const getCategoryValue = (tender) => {
      // First, check if tender has category_name from database (most reliable)
      if (tender.category_name) {
        // Try to find exact match in managed categories first (highest priority)
        const managedMatch = managedCategories.find(cat => 
          cat.name === tender.category_name
        );
        
        if (managedMatch) {
          return managedMatch.name;
        }
        
        // Fallback to USER_CATEGORIES for backward compatibility
        const exactMatch = USER_CATEGORIES.find(cat => 
          cat.value === tender.category_name
        );
        
        if (exactMatch) {
          return exactMatch.value;
        }
        
        // Try to find match by label
        const labelMatch = USER_CATEGORIES.find(cat => 
          cat.label.toLowerCase() === tender.category_name.toLowerCase()
        );
        
        if (labelMatch) {
          return labelMatch.value;
        }
        
        // Return the database category name directly
        return tender.category_name;
      }
      
      // Fallback: try display_category 
      if (tender.display_category) {
        // Check managed categories first
        const managedMatch = managedCategories.find(cat => 
          cat.name === tender.display_category
        );
        if (managedMatch) return managedMatch.name;
        
        // Fallback to USER_CATEGORIES
        const match = USER_CATEGORIES.find(cat => 
          cat.value === tender.display_category || cat.label === tender.display_category
        );
        if (match) return match.value;
        return tender.display_category;
      }
      
      // Final fallback - check if 'Other' exists in managed categories
      const otherCategory = managedCategories.find(cat => cat.name === 'Other');
      return otherCategory ? otherCategory.name : 'Other';
    };

    // If already editing this tender, close the edit form (toggle off)
    if (editingTender === tender.id) {
      setEditingTender(null);
      setEditFormData({
        title: '',
        description: '',
        category: '',
        budget_min: '',
        budget_max: '',
        deadline: '',
        requirements: '',
        status: ''
      });
    } else {
      // Open edit form for this tender
      setEditingTender(tender.id);
      setEditFormData({
        title: tender.title || '',
        description: tender.description || '',
        category: getCategoryValue(tender),
        budget_min: tender.budget_min || '',
        budget_max: tender.budget_max || '',
        deadline: tender.deadline ? new Date(tender.deadline).toISOString().slice(0, 16) : '',
        requirements: tender.requirements || '',
        status: tender.status || ''
      });
      
      console.log('Edit form data set:', {
        category: getCategoryValue(tender),
        available_managed_categories: managedCategories.length,
        available_user_categories: USER_CATEGORIES.length,
        using_managed_categories: managedCategories.length > 0
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingTender(null);
    setEditFormData({
      title: '',
      description: '',
      category: '',
      budget_min: '',
      budget_max: '',
      deadline: '',
      requirements: '',
      status: ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      setEditLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/tenders/${editingTender}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Tender updated successfully');
        setEditingTender(null);
        fetchTenders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: Failed to update tender`;
        console.error('Update tender error:', errorData);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating tender:', error);
      toast.error('Failed to update tender. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleViewTender = (tenderId) => {
    console.log('handleViewTender called with tender ID:', tenderId);
    console.log('Opening URL:', `/tender/${tenderId}`);
    
    // Open tender details in a new tab
    window.open(`/tender/${tenderId}`, '_blank');
  };

  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const matchesFilter = filterStatus === 'all' || tender.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || getCategoryName(tender, categories, managedCategories) === filterCategory;
    return matchesSearch && matchesFilter && matchesCategory;
  });
  
  // Update total items when filtered tenders change
  useEffect(() => {
    setTotalItems(filteredTenders.length);
  }, [filteredTenders]);
  
  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenders = filteredTenders.slice(startIndex, endIndex);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="tab-header">
        <h1 className="tab-title">Tender Management</h1>
        <p className="tab-subtitle">Manage all tenders in the system</p>
        
        {/* Search and Filter */}
        <div className="search-filter-container">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search tenders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input search-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-select"
            style={{ minWidth: '200px' }}
          >
            <option value="all">All Categories</option>
            {/* Get unique categories from actual tender data */}
            {[...new Set(tenders.map(tender => getCategoryName(tender, categories, managedCategories))
              .filter(cat => cat && cat !== 'Uncategorized'))]
              .sort()
              .map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="data-table" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>Error: {error}</p>
          <button onClick={fetchTenders} className="btn btn-primary">Retry</button>
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Budget Range</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTenders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: '#6b7280' }}>No tenders found</p>
                  </td>
                </tr>
              ) : (
                paginatedTenders.map((tender) => (
                  <React.Fragment key={tender.id}>
                    <tr>
                      <td>
                        <div className="table-cell-content">
                          <div className="table-cell-primary">{tender.title || 'Untitled'}</div>
                          <div className="table-cell-secondary">
                            {tender.description ? `${tender.description.substring(0, 60)}...` : 'No description'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-center">
                          <span className="table-cell-content">
                            {getCategoryName(tender, categories, managedCategories)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-center">
                          <span className="table-cell-content">
                            {tender.budget_min || tender.budget_max ? 
                              `₨${(tender.budget_min || 0).toLocaleString()} - ₨${(tender.budget_max || 0).toLocaleString()}` : 
                              'Budget not specified'
                            }
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="badge-container">
                          <span className={`badge ${ 
                            tender.status === 'open' ? 'badge-green' :
                            tender.status === 'closed' ? 'badge-red' :
                            tender.status === 'archived' ? 'badge-yellow' :
                            'badge-gray'
                          }`}>
                            {tender.status || 'draft'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-center">
                          <span className="table-cell-content">
                            {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'No deadline set'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="actions-column">
                          <button 
                            onClick={() => handleViewTender(tender.id)}
                            className="btn-icon" 
                            style={{ color: '#3b82f6' }} 
                            title="View Details"
                          >
                            <Eye style={{ width: '0.8rem', height: '0.8rem' }} />
                          </button>
                          <button 
                            onClick={() => handleEditTender(tender)}
                            className="btn-icon" 
                            style={{ color: '#10b981' }} 
                            title="Edit Tender"
                          >
                            <Edit style={{ width: '0.8rem', height: '0.8rem' }} />
                          </button>
                          {tender.status === 'archived' ? (
                            <button 
                              onClick={() => handleUnarchiveTender(tender.id, tender.title)}
                              className="btn-icon" 
                              style={{ color: '#10b981' }} 
                              title="Unarchive (Restore to Active)"
                            >
                              <ArchiveRestore style={{ width: '0.8rem', height: '0.8rem' }} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleArchiveTender(tender.id, tender.title)}
                              className="btn-icon" 
                              style={{ color: '#f59e0b' }} 
                              title="Archive (Recommended)"
                            >
                              <Archive style={{ width: '0.8rem', height: '0.8rem' }} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteTender(tender.id, tender.title)}
                            className="btn-icon" 
                            style={{ color: '#ef4444' }} 
                            title="Delete Permanently"
                          >
                            <Trash2 style={{ width: '0.8rem', height: '0.8rem' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingTender === tender.id && (
                      <tr className="tender-edit-row">
                        <td colSpan="6" style={{ padding: '2rem', backgroundColor: '#f9fafb' }}>
                          <div className="tender-edit-form">
                            <h3 style={{ marginBottom: '1.5rem', color: '#1f2937', fontWeight: '600' }}>
                              Edit Tender: {tender.title}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '1.5rem' }}>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Title *
                                </label>
                                <input
                                  type="text"
                                  value={editFormData.title}
                                  onChange={(e) => handleEditFormChange('title', e.target.value)}
                                  className="form-input"
                                  placeholder="Enter tender title"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Category *
                                </label>
                                <select
                                  value={editFormData.category}
                                  onChange={(e) => handleEditFormChange('category', e.target.value)}
                                  className="form-select"
                                >
                                  <option value="">Select Category</option>
                                  {managedCategories.length > 0 ? 
                                    managedCategories.map((category) => (
                                      <option key={category.id} value={category.name}>
                                        {category.name}
                                      </option>
                                    )) :
                                    USER_CATEGORIES.map((category) => (
                                      <option key={category.value} value={category.value}>
                                        {category.label}
                                      </option>
                                    ))
                                  }
                                </select>
                              </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                              </label>
                              <textarea
                                value={editFormData.description}
                                onChange={(e) => handleEditFormChange('description', e.target.value)}
                                rows={3}
                                className="form-textarea"
                                placeholder="Enter detailed tender description"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '1.5rem' }}>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Minimum Budget (PKR)
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 text-sm">₨</span>
                                  </div>
                                  <input
                                    type="number"
                                    value={editFormData.budget_min}
                                    onChange={(e) => handleEditFormChange('budget_min', e.target.value)}
                                    className="form-input pl-8"
                                    placeholder="Enter minimum budget"
                                    min="0"
                                    step="1"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Maximum Budget (PKR)
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 text-sm">₨</span>
                                  </div>
                                  <input
                                    type="number"
                                    value={editFormData.budget_max}
                                    onChange={(e) => handleEditFormChange('budget_max', e.target.value)}
                                    className="form-input pl-8"
                                    placeholder="Enter maximum budget"
                                    min="0"
                                    step="1"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '1.5rem' }}>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Deadline
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editFormData.deadline}
                                  onChange={(e) => handleEditFormChange('deadline', e.target.value)}
                                  className="form-input"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Status
                                </label>
                                <select
                                  value={editFormData.status}
                                  onChange={(e) => handleEditFormChange('status', e.target.value)}
                                  className="form-select"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="open">Open</option>
                                  <option value="closed">Closed</option>
                                  <option value="archived">Archived</option>
                                </select>
                              </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Requirements
                              </label>
                              <textarea
                                value={editFormData.requirements}
                                onChange={(e) => handleEditFormChange('requirements', e.target.value)}
                                rows={2}
                                className="form-textarea"
                                placeholder="Enter specific requirements and qualifications"
                              />
                            </div>
                            <div className="flex justify-end space-x-4">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="btn btn-secondary"
                                disabled={editLoading}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="btn btn-primary"
                                disabled={editLoading}
                              >
                                {editLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                  </>
                                ) : (
                                  'Save Changes'
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Bid Management Tab Component
const BidManagementTab = () => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchBids();
  }, [filterStatus]);
  
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const fetchBids = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/bids?status=${filterStatus}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle different response structures
        const bidsArray = Array.isArray(data) ? data : 
                         Array.isArray(data.data) ? data.data : 
                         Array.isArray(data.bids) ? data.bids :
                         data.data?.bids || [];
        setBids(bidsArray);
        setTotalItems(bidsArray.length);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
      toast.error('Failed to load bids');
      setBids([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBids = bids.slice(startIndex, endIndex);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleBidAction = async (bidId, action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/bids/${bidId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Bid ${action}d successfully`);
          fetchBids();
        } else {
          throw new Error(data.message || `Failed to ${action} bid`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to ${action} bid`);
      }
    } catch (error) {
      console.error(`Error ${action}ing bid:`, error);
      toast.error(error.message || `Failed to ${action} bid`);
    }
  };

  const handleViewBidDocument = (file) => {
    try {
      // Check if file has the expected structure
      let filename = file.filename || file.name || file;
      
      // Handle different file structures that might exist
      if (file.data && file.data.filename) {
        filename = file.data.filename;
      }
      
      if (!filename) {
        toast.error('Unable to determine filename for document');
        return;
      }
      
      console.log('Viewing bid document:', filename);
      
      // Open the document in a new tab using the upload view endpoint
      const fileUrl = `${API_BASE_URL}/upload/view/${filename}`;
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDownloadBidDocument = (file) => {
    try {
      // Check if file has the expected structure
      let filename = file.filename || file.name || file;
      let originalName = file.originalName || file.name || filename;
      
      // Handle different file structures that might exist
      if (file.data) {
        filename = file.data.filename || filename;
        originalName = file.data.originalName || file.data.name || originalName;
      }
      
      if (!filename) {
        toast.error('Unable to determine filename for download');
        return;
      }
      
      console.log('Downloading bid document:', filename, 'Original name:', originalName);
      
      // Create download link
      const downloadUrl = `${API_BASE_URL}/upload/download/${filename}?original=${encodeURIComponent(originalName)}`;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalName || filename;
      link.target = '_blank';
      link.rel = 'noopener,noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Download started: ${originalName || filename}`);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleViewBidDetails = (bid) => {
    try {
      console.log('Viewing bid details:', bid);
      
      // Create a detailed view of the bid information with enhanced attachment functionality
      const bidDetailsContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
            <h2 style="color: #1f2937; margin: 0;">📋 Bid Details</h2>
            <span style="background: ${bid.status === 'pending' ? '#fef3c7' : bid.status === 'accepted' ? '#d1fae5' : '#fee2e2'}; color: ${bid.status === 'pending' ? '#92400e' : bid.status === 'accepted' ? '#065f46' : '#991b1b'}; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
              ${bid.status}
            </span>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <h3 style="color: #374151; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                <span>🏢</span> Tender Information
              </h3>
              <p style="margin: 8px 0;"><strong>Tender:</strong> ${bid.tender_title || 'N/A'}</p>
              <p style="margin: 8px 0;"><strong>Tender ID:</strong> ${bid.tender_id || 'N/A'}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <h3 style="color: #374151; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                <span>👤</span> Vendor Information
              </h3>
              <p style="margin: 8px 0;"><strong>Name:</strong> ${bid.vendor_name || 'N/A'}</p>
              <p style="margin: 8px 0;"><strong>Company:</strong> ${bid.vendor_company || 'N/A'}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${bid.vendor_email || 'N/A'}</p>
            </div>
          </div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #bae6fd;">
            <h3 style="color: #0c4a6e; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
              <span>💰</span> Bid Information
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <p style="margin: 0;"><strong>Amount:</strong> <span style="color: #059669; font-size: 18px; font-weight: 700;">₨${bid.amount?.toLocaleString() || '0'}</span></p>
              <p style="margin: 0;"><strong>Submitted:</strong> ${bid.submitted_at ? new Date(bid.submitted_at).toLocaleString() : 'N/A'}</p>
              <p style="margin: 0;"><strong>Bid ID:</strong> ${bid.id || 'N/A'}</p>
            </div>
          </div>
          
          ${bid.proposal ? `
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
              <span>📝</span> Proposal
            </h3>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #d1d5db; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6;">${bid.proposal}</div>
          </div>
          ` : ''}
          
          ${bid.attachments && bid.attachments.length > 0 ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border: 1px solid #fbbf24;">
            <h3 style="color: #92400e; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
              <span>📎</span> Attached Documents (${bid.attachments.length})
            </h3>
            <div style="display: grid; gap: 12px;">
              ${bid.attachments.map((file, index) => {
                const filename = file.filename || file.name || file;
                const originalName = file.originalName || file.name || filename;
                const fileSize = file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size';
                const fileExt = originalName.split('.').pop()?.toUpperCase() || 'FILE';
                const isPdf = fileExt === 'PDF';
                const isDoc = ['DOC', 'DOCX'].includes(fileExt);
                const isImage = ['JPG', 'JPEG', 'PNG', 'GIF'].includes(fileExt);
                
                return `
                  <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #d97706; display: flex; align-items: center; justify-content: between; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                      <div style="width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: ${isPdf ? '#ef4444' : isDoc ? '#3b82f6' : isImage ? '#10b981' : '#6b7280'}; color: white;">
                        ${isPdf ? '📄' : isDoc ? '📝' : isImage ? '🖼️' : '📎'}
                      </div>
                      <div style="flex: 1;">
                        <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 2px;">${originalName}</div>
                        <div style="font-size: 12px; color: #6b7280;">${fileExt} • ${fileSize}</div>
                      </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                      <button onclick="viewBidFile('${filename}', '${originalName}')" 
                              style="background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;"
                              onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        👁️ View
                      </button>
                      <button onclick="downloadBidFile('${filename}', '${originalName}')" 
                              style="background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;"
                              onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                        ⬇️ Download
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 12px; color: #92400e;">
              💡 <strong>Tip:</strong> Click "View" to preview documents in browser, or "Download" to save them locally.
            </div>
          </div>
          ` : `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; text-align: center; color: #6b7280;">
            <span style="font-size: 48px; display: block; margin-bottom: 10px;">📁</span>
            <p style="margin: 0; font-size: 14px;">No documents attached to this bid</p>
          </div>
          `}
        </div>
        
        <script>
          function downloadBidFile(filename, originalName) {
            console.log('Attempting to download:', { filename, originalName });
            
            // Try multiple endpoints for file download
            const downloadUrls = [
              '${API_BASE_URL}/upload/download/' + encodeURIComponent(filename) + '?original=' + encodeURIComponent(originalName || filename),
              '${API_BASE_URL}/files/' + encodeURIComponent(filename) + '/download',
              '${API_BASE_URL.replace('/api', '')}/uploads/' + encodeURIComponent(filename)
            ];
            
            let downloadAttempted = false;
            
            async function tryDownload(url, index) {
              try {
                console.log('Trying download URL:', url);
                const response = await fetch(url, {
                  method: 'HEAD'
                });
                
                if (response.ok) {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = originalName || filename;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  alert('Download started: ' + (originalName || filename));
                  return true;
                } else {
                  console.warn('URL failed with status:', response.status, url);
                  return false;
                }
              } catch (error) {
                console.warn('Error trying URL:', url, error);
                return false;
              }
            }
            
            // Try URLs in sequence
            downloadUrls.reduce((promise, url, index) => {
              return promise.then(success => {
                if (!success && !downloadAttempted) {
                  return tryDownload(url, index).then(result => {
                    if (result) downloadAttempted = true;
                    return result;
                  });
                }
                return success;
              });
            }, Promise.resolve(false)).then(success => {
              if (!success) {
                alert('Failed to download file: ' + (originalName || filename) + '. File may not exist or you may not have permission.');
              }
            });
          }
          
          function viewBidFile(filename, originalName) {
            console.log('Attempting to view:', { filename, originalName });
            
            const viewUrls = [
              '${API_BASE_URL}/upload/view/' + encodeURIComponent(filename),
              '${API_BASE_URL}/files/' + encodeURIComponent(filename) + '/view',
              '${API_BASE_URL.replace('/api', '')}/uploads/' + encodeURIComponent(filename)
            ];
            
            // Try the first available URL
            viewUrls.forEach((url, index) => {
              fetch(url, { method: 'HEAD' })
                .then(response => {
                  if (response.ok && index === 0) {
                    window.open(url, '_blank');
                  }
                })
                .catch(error => {
                  if (index === viewUrls.length - 1) {
                    console.warn('All view URLs failed for:', filename);
                  }
                });
            });
          }
        </script>
      `;
      
      // Open details in a new window with better sizing
      const detailsWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      detailsWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>📋 Bid Details - ${bid.vendor_name || bid.vendor_company || 'Unknown Vendor'}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                min-height: 100vh;
              }
              .container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                padding: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              ${bidDetailsContent}
            </div>
          </body>
        </html>
      `);
      detailsWindow.document.close();
    } catch (error) {
      console.error('Error displaying bid details:', error);
      toast.error('Failed to display bid details');
    }
  };

  return (
    <div>
      <div className="tab-header">
        <h1 className="tab-title">Bid Management</h1>
        <p className="tab-subtitle">Review and manage all bids in the system</p>
        
        <div className="filter-button-group">
          {['pending', 'accepted', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`filter-button ${ 
                filterStatus === status ? 'active' : ''
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} Bids
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="data-table" data-table-type="bid-management">
          <table>
            <thead>
              <tr>
                <th>Tender</th>
                <th>Vendor</th>
                <th>Bid Amount</th>
                <th>Documents</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBids.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: '#6b7280' }}>No bids found for {filterStatus} status</p>
                  </td>
                </tr>
              ) : (
                paginatedBids.map((bid) => (
                  <tr key={bid.id}>
                    <td>
                      <div className="table-cell-content">
                        <div className="table-cell-primary">{bid.tender_title || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-content">
                        <div className="table-cell-primary">{bid.vendor_name || 'N/A'}</div>
                        <div className="table-cell-secondary">{bid.vendor_company || ''}</div>
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-center" style={{ fontWeight: '600' }}>
                        ₨{bid.amount?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-center">
                        {bid.attachments && Array.isArray(bid.attachments) && bid.attachments.length > 0 ? (
                          <div className="attachments-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span className="badge badge-blue" style={{ marginBottom: '4px' }}>
                              📎 {bid.attachments.length} file{bid.attachments.length > 1 ? 's' : ''}
                            </span>
                            
                            {bid.attachments.length === 1 ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => handleViewBidDocument(bid.attachments[0])}
                                  className="btn-icon"
                                  style={{ 
                                    color: '#3b82f6', 
                                    backgroundColor: '#eff6ff', 
                                    border: '1px solid #bfdbfe', 
                                    borderRadius: '4px', 
                                    padding: '2px 6px',
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                  title={`View ${bid.attachments[0].name || bid.attachments[0].filename}`}
                                >
                                  <Eye style={{ width: '0.7rem', height: '0.7rem' }} />
                                  
                                </button>
                                <button
                                  onClick={() => handleDownloadBidDocument(bid.attachments[0])}
                                  className="btn-icon"
                                  style={{ 
                                    color: '#10b981', 
                                    backgroundColor: '#ecfdf5', 
                                    border: '1px solid #a7f3d0', 
                                    borderRadius: '4px', 
                                    padding: '2px 6px',
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                  title={`Download ${bid.attachments[0].name || bid.attachments[0].filename}`}
                                >
                                  <Download style={{ width: '0.7rem', height: '0.7rem' }} />
                                
                                </button>
                              </div>
                            ) : (
                              <div className="document-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', maxWidth: '120px' }}>
                                {bid.attachments.slice(0, 2).map((file, index) => (
                                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                      <button
                                        onClick={() => handleViewBidDocument(file)}
                                        className="btn-icon"
                                        style={{ 
                                          color: '#3b82f6', 
                                          backgroundColor: '#eff6ff',
                                          border: '1px solid #bfdbfe',
                                          borderRadius: '3px',
                                          padding: '1px 3px',
                                          fontSize: '0.6rem'
                                        }}
                                        title={`View ${file.name || file.filename}`}
                                      >
                                        <Eye style={{ width: '0.6rem', height: '0.6rem' }} />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadBidDocument(file)}
                                        className="btn-icon"
                                        style={{ 
                                          color: '#10b981', 
                                          backgroundColor: '#ecfdf5',
                                          border: '1px solid #a7f3d0',
                                          borderRadius: '3px',
                                          padding: '1px 3px',
                                          fontSize: '0.6rem'
                                        }}
                                        title={`Download ${file.name || file.filename}`}
                                      >
                                        <Download style={{ width: '0.6rem', height: '0.6rem' }} />
                                      </button>
                                    </div>
                                    <span style={{ fontSize: '0.55rem', color: '#6b7280', textAlign: 'center', lineHeight: '1' }}>
                                      {(file.name || file.filename)?.substring(0, 6)}...
                                    </span>
                                  </div>
                                ))}
                                {bid.attachments.length > 2 && (
                                  <div style={{ fontSize: '0.6rem', color: '#6b7280', textAlign: 'center', padding: '2px' }}>
                                    +{bid.attachments.length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>📄 No docs</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-center">
                        {bid.submitted_at ? new Date(bid.submitted_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="badge-container">
                        <span className={`badge ${ 
                          bid.status === 'pending' ? 'badge-yellow' :
                          bid.status === 'accepted' ? 'badge-green' :
                          'badge-red'
                        }`}>
                          {bid.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="actions-column">
                        {bid.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleBidAction(bid.id, 'accept')}
                              className="btn-icon accept"
                              title="Accept Bid"
                            >
                              <CheckCircle style={{ width: '0.9rem', height: '0.9rem' }} />
                            </button>
                            <button
                              onClick={() => handleBidAction(bid.id, 'reject')}
                              className="btn-icon reject"
                              title="Reject Bid"
                            >
                              <XCircle style={{ width: '0.9rem', height: '0.9rem' }} />
                            </button>
                            <button 
                              onClick={() => handleViewBidDetails(bid)}
                              className="btn-icon view" 
                              title="View Details"
                            >
                              <Eye style={{ width: '0.9rem', height: '0.9rem' }} />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleViewBidDetails(bid)}
                            className="btn-icon view" 
                            title="View Details"
                          >
                            <Eye style={{ width: '0.9rem', height: '0.9rem' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
};

// User Management Tab Component
const UserManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [editFormData, setEditFormData] = useState({
    email: '',
    company_name: '',
    role: '',
    category: 'Other',
    categories: [], // New field for multiple categories
    is_active: true
  });
  const [createFormData, setCreateFormData] = useState({
    // Supplier Information
    company_name: '',
    phone: '',
    email: '',
    
    // Business Details
    business_registered_name: '',
    business_registered_address: '',
    national_tax_no: '',
    sales_tax_registration_no: '',
    role: 'vendor',
    category: 'Other',
    categories: ['Other'], // New field for multiple categories
    
    // Documents Checklist
    documents: {
      registration_form: false,
      sales_tax_certificates: false,
      financial_statements: false,
      business_license: false,
      distributorship_certificate: false,
      bank_statement: false,
      power_of_attorney: false,
      product_services_list: false,
      pec_registration: false,
      ndu_undertaking: false,
      employees_list: false,
      non_involvement_declaration: false
    }
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);
  
  // Reset page when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle the correct API response structure
        let usersArray = [];
        if (data.success && data.data && data.data.users) {
          usersArray = data.data.users;
        } else if (Array.isArray(data)) {
          usersArray = data;
        }
        setUsers(usersArray);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (res.ok) {
        const data = await res.json();
        const cats = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.categories) ? data.data.categories : (Array.isArray(data?.categories) ? data.categories : []));
        setAllCategories(cats);
      }
    } catch (e) {
      console.warn('Failed to load categories for user management:', e);
    }
  };

  // Filter users based on search term, role, and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && !user.is_archived) ||
      (filterStatus === 'archived' && user.is_archived) ||
      (filterStatus === 'inactive' && !user.is_active && !user.is_archived);
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  // Update total items when filtered users change
  useEffect(() => {
    setTotalItems(filteredUsers.length);
  }, [filteredUsers]);
  
  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };
  
  // Modal handler functions
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };
  
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email || '',
      company_name: user.company_name || '',
      role: user.role || '',
      category: user.category || 'Other',
      categories: user.categories || (user.category ? [user.category] : ['Other']), // Use categories array from API
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setShowEditModal(true);
  };
  
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setUpdateLoading(true);
      
      // Validation for categories
      if (!editFormData.categories || editFormData.categories.length === 0) {
        toast.error('Please select at least one business category');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'User updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh the users list
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update user`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const handleCloseModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowCreateModal(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };
  
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDocumentChange = (documentKey, checked) => {
    setCreateFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: checked
      }
    }));
  };
  
  const handleCategoryChange = (categoryValue, checked, formType) => {
    if (formType === 'create') {
      setCreateFormData(prev => {
        let updatedCategories = [...(prev.categories || [])];
        if (checked) {
          if (!updatedCategories.includes(categoryValue)) {
            updatedCategories.push(categoryValue);
          }
        } else {
          updatedCategories = updatedCategories.filter(cat => cat !== categoryValue);
        }
        return {
          ...prev,
          categories: updatedCategories,
          category: updatedCategories[0] || 'Other' // Keep first category for backward compatibility
        };
      });
    } else if (formType === 'edit') {
      setEditFormData(prev => {
        let updatedCategories = [...(prev.categories || [])];
        if (checked) {
          if (!updatedCategories.includes(categoryValue)) {
            updatedCategories.push(categoryValue);
          }
        } else {
          updatedCategories = updatedCategories.filter(cat => cat !== categoryValue);
        }
        return {
          ...prev,
          categories: updatedCategories,
          category: updatedCategories[0] || 'Other' // Keep first category for backward compatibility
        };
      });
    }
  };
  
  const handleCreateUser = async () => {
    try {
      setCreateLoading(true);
      
      // Validation
      if (!createFormData.email) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      if (!createFormData.categories || createFormData.categories.length === 0) {
        toast.error('Please select at least one business category');
        return;
      }
      
      // Prepare data for API
      const userData = {
        email: createFormData.email,
        company_name: createFormData.company_name,
        phone: createFormData.phone,
        address: createFormData.business_registered_address,
        role: createFormData.role,
        category: createFormData.category,
        categories: createFormData.categories, // Send the categories array
        tax_number: createFormData.national_tax_no,
        registration_number: createFormData.sales_tax_registration_no
      };
      
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'User created successfully');
        setShowCreateModal(false);
        
        // Reset form
        setCreateFormData({
          company_name: '',
          phone: '',
          email: '',
          business_registered_name: '',
          business_registered_address: '',
          national_tax_no: '',
          sales_tax_registration_no: '',
          role: 'vendor',
          category: 'Other',
          categories: ['Other'], // Reset to default category
          documents: {
            registration_form: false,
            sales_tax_certificates: false,
            financial_statements: false,
            business_license: false,
            distributorship_certificate: false,
            bank_statement: false,
            power_of_attorney: false,
            product_services_list: false,
            pec_registration: false,
            ndu_undertaking: false,
            employees_list: false,
            non_involvement_declaration: false
          }
        });
        
        fetchUsers(); // Refresh the users list
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to create user`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };
  
  // Archive/Unarchive user function
  const handleArchiveUser = async (user) => {
    if (!user) return;
    
    try {
      setArchiveLoading(true);
      const isCurrentlyArchived = user.is_archived || false;
      const newArchivedState = !isCurrentlyArchived;
      
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: newArchivedState })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `User ${newArchivedState ? 'archived' : 'unarchived'} successfully`);
        fetchUsers(); // Refresh the users list
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to ${newArchivedState ? 'archive' : 'unarchive'} user`);
      }
    } catch (error) {
      console.error('Error archiving user:', error);
      toast.error(error.message || 'Failed to archive user. Please try again.');
    } finally {
      setArchiveLoading(false);
    }
  };
  
  // Delete user function (shows confirmation modal)
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };
  
  // Confirm delete user function
  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setDeleteLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh the users list
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to delete user`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="tab-header">
        <h1 className="tab-title">User Management</h1>
        <p className="tab-subtitle">Manage all users in the system</p>
        
        {/* Search, Filter, and Create Button */}
        <div className="search-filter-container">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input search-input"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            {/* <option value="buyer">Buyer</option> */}
            <option value="vendor">Vendor</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            Create New User
          </button>
        </div>
      </div>
      
      {/* User Statistics Summary */}
      {!loading && (
        <div className="user-stats-summary">
          <div className="stat-card-mini">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{users.length}</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-label">Active</span>
            <span className="stat-value text-green">{users.filter(u => !u.is_archived && u.is_active).length}</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-label">Inactive</span>
            <span className="stat-value text-red">{users.filter(u => !u.is_archived && !u.is_active).length}</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-label">Archived</span>
            <span className="stat-value text-gray">{users.filter(u => u.is_archived).length}</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-label">Showing</span>
            <span className="stat-value text-blue">{filteredUsers.length}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="data-table" data-table-type="user-management">
          <table>
            <thead>
              <tr>
                <th className="text-left">User</th>
                <th className="text-center">Role</th>
                <th className="text-center">Category</th>
                <th className="text-center">Company</th>
                <th className="text-center">Status</th>
                <th className="text-center">Joined</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: '#6b7280' }}>No users found</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className={user.is_archived ? 'archived' : ''}>
                    <td>
                      <div className="table-cell-content">
                        <div className="table-cell-primary">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="table-cell-secondary">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <div className="badge-container">
                        <span className={`badge ${ 
                          user.role === 'admin' ? 'badge-red' :
                          user.role === 'buyer' ? 'badge-blue' :
                          'badge-green'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-center">
                        <div className="categories-display">
                          {user.categories && user.categories.length > 0 ? (
                            user.categories.map((cat, index) => (
                              <span key={cat} className="category-tag">
                                {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {index < user.categories.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            <span className="table-cell-content">
                              {user.category ? user.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Other'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-center">
                        <span className="table-cell-content">{user.company_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="badge-container">
                        {user.is_archived ? (
                          <span className="badge badge-gray">
                            Archived
                          </span>
                        ) : (
                          <span className={`badge ${ 
                            user.is_active ? 'badge-green' : 'badge-red'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-center">
                        <span className="table-cell-content">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="actions-column">
                        <button 
                          onClick={() => handleViewUser(user)}
                          className="btn-icon" 
                          style={{ color: '#3b82f6' }} 
                          title="View User Details"
                        >
                          <Eye />
                        </button>
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="btn-icon" 
                          style={{ 
                            color: user.is_archived ? '#9ca3af' : '#10b981',
                            opacity: user.is_archived ? 0.5 : 1
                          }}
                          title={user.is_archived ? 'Unarchive to edit' : 'Edit User'}
                          disabled={user.is_archived}
                        >
                          <Edit />
                        </button>
                        <button 
                          onClick={() => handleArchiveUser(user)}
                          className="btn-icon" 
                          style={{ color: user.is_archived ? '#10b981' : '#f59e0b' }} 
                          title={user.is_archived ? 'Restore User' : 'Archive User'}
                          disabled={archiveLoading}
                        >
                          {user.is_archived ? (
                            <ArchiveRestore />
                          ) : (
                            <Archive />
                          )}
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            className="btn-icon btn-icon-danger" 
                            style={{ 
                              color: '#ef4444',
                              opacity: user.is_archived ? 0.7 : 1
                            }} 
                            title="Delete User Permanently"
                            disabled={deleteLoading}
                          >
                            <Trash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </div>
      )}
      
      {/* User View Modal */}
      {showViewModal && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">User Details</h2>
              <button 
                onClick={handleCloseModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="user-details-grid">
                <div className="user-detail-item">
                  <label className="user-detail-label">Email</label>
                  <p className="user-detail-value">{selectedUser.email}</p>
                </div>
                <div className="user-detail-item">
                  <label className="user-detail-label">Role</label>
                  <p className="user-detail-value">
                    <span className={`badge ${ 
                      selectedUser.role === 'admin' ? 'badge-red' :
                      selectedUser.role === 'buyer' ? 'badge-blue' :
                      'badge-green'
                    }`}>
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </p>
                </div>
                <div className="user-detail-item">
                  <label className="user-detail-label">Company</label>
                  <p className="user-detail-value">{selectedUser.company_name || 'N/A'}</p>
                </div>
                <div className="user-detail-item">
                  <label className="user-detail-label">Status</label>
                  <p className="user-detail-value">
                    <span className={`badge ${ 
                      selectedUser.is_archived ? 'badge-gray' :
                      selectedUser.is_active ? 'badge-green' : 'badge-red'
                    }`}>
                      {selectedUser.is_archived ? 'Archived' : 
                       selectedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div className="user-detail-item user-detail-categories">
                  <label className="user-detail-label">Categories</label>
                  <div className="user-detail-value">
                    <div className="categories-display-modal">
                      {selectedUser.categories && selectedUser.categories.length > 0 ? (
                        selectedUser.categories.map((cat, index) => (
                          <span key={cat} className="category-tag-modal">
                            {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))
                      ) : (
                        <span className="category-tag-modal">
                          {selectedUser.category ? selectedUser.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Other'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="user-detail-item">
                  <label className="user-detail-label">Joined Date</label>
                  <p className="user-detail-value">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseModals} className="btn btn-secondary">
                Close
              </button>
              <button 
                onClick={() => {
                  handleCloseModals();
                  handleEditUser(selectedUser);
                }}
                className="btn btn-primary"
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit User</h2>
              <button 
                onClick={handleCloseModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form>
                <div className="user-edit-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      className="form-input"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => handleEditFormChange('role', e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      {/* <option value="buyer">Buyer</option> */}
                      <option value="vendor">Vendor</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Business Categories *</label>
                    <div className="categories-checkbox-grid">
                      {allCategories.map(category => (
                        <div key={category.id} className="category-checkbox-item">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={editFormData.categories?.includes(category.name) || false}
                              onChange={(e) => handleCategoryChange(category.name, e.target.checked, 'edit')}
                              className="checkbox-input"
                            />
                            <span className="checkbox-text">{category.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status *</label>
                    <select
                      value={editFormData.is_active}
                      onChange={(e) => handleEditFormChange('is_active', e.target.value === 'true')}
                      className="form-select"
                      required
                    >
                      <option value={true}>Active</option>
                      <option value={false}>Inactive</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      value={editFormData.company_name}
                      onChange={(e) => handleEditFormChange('company_name', e.target.value)}
                      className="form-input"
                      placeholder="Enter company name"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button 
                onClick={handleCloseModals} 
                className="btn btn-secondary"
                disabled={updateLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateUser}
                className="btn btn-primary"
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New User</h2>
              <button 
                onClick={handleCloseModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form>
                {/* Section 1: Supplier Information */}
                <div className="form-section">
                  <h3 className="section-title">Section 1: Supplier Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Name of Company *</label>
                      <input
                        type="text"
                        value={createFormData.company_name}
                        onChange={(e) => handleCreateFormChange('company_name', e.target.value)}
                        className="form-input"
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone No *</label>
                      <input
                        type="tel"
                        value={createFormData.phone}
                        onChange={(e) => handleCreateFormChange('phone', e.target.value)}
                        className="form-input"
                        placeholder="Enter phone number"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        value={createFormData.email}
                        onChange={(e) => handleCreateFormChange('email', e.target.value)}
                        className="form-input"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Section 2: Business Details (Legally binding) */}
                <div className="form-section">
                  <h3 className="section-title">Section 2: Business Details (Legally binding)</h3>
                  <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Business Registered Name</label>
                      <input
                        type="text"
                        value={createFormData.business_registered_name}
                        onChange={(e) => handleCreateFormChange('business_registered_name', e.target.value)}
                        className="form-input"
                        placeholder="Enter business registered name"
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Business Registered Address</label>
                      <textarea
                        value={createFormData.business_registered_address}
                        onChange={(e) => handleCreateFormChange('business_registered_address', e.target.value)}
                        className="form-input"
                        rows="2"
                        placeholder="Enter business registered address"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">National Tax No</label>
                      <input
                        type="text"
                        value={createFormData.national_tax_no}
                        onChange={(e) => handleCreateFormChange('national_tax_no', e.target.value)}
                        className="form-input"
                        placeholder="Enter national tax number"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sales Tax Registration No</label>
                      <input
                        type="text"
                        value={createFormData.sales_tax_registration_no}
                        onChange={(e) => handleCreateFormChange('sales_tax_registration_no', e.target.value)}
                        className="form-input"
                        placeholder="Enter sales tax registration number"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role *</label>
                      <select
                        value={createFormData.role}
                        onChange={(e) => handleCreateFormChange('role', e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="vendor">Vendor</option>
                        {/* <option value="buyer">Buyer</option> */}
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Business Categories *</label>
                      <div className="categories-checkbox-grid">
                        {allCategories.map(category => (
                          <div key={category.id} className="category-checkbox-item">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={createFormData.categories?.includes(category.name) || false}
                                onChange={(e) => handleCategoryChange(category.name, e.target.checked, 'create')}
                                className="checkbox-input"
                              />
                              <span className="checkbox-text">{category.name}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Section 3: Documents Checklist */}
                <div className="form-section">
                  <h3 className="section-title">Section 3: Documents Checklist</h3>
                  <div className="documents-grid">
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.registration_form}
                          onChange={(e) => handleDocumentChange('registration_form', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Completed and signed Registration form, Sales tax and NTN certificates</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.financial_statements}
                          onChange={(e) => handleDocumentChange('financial_statements', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Latest audited financial statements of last two years</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.business_license}
                          onChange={(e) => handleDocumentChange('business_license', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Copy of certificates and business license</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.distributorship_certificate}
                          onChange={(e) => handleDocumentChange('distributorship_certificate', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Copy of foreign distributorship certificate</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.bank_statement}
                          onChange={(e) => handleDocumentChange('bank_statement', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Last six months bank statement</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.power_of_attorney}
                          onChange={(e) => handleDocumentChange('power_of_attorney', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Original power of attorney of authorized signatories</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.product_services_list}
                          onChange={(e) => handleDocumentChange('product_services_list', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">List of product and services that firm is providing</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.pec_registration}
                          onChange={(e) => handleDocumentChange('pec_registration', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Registration with Pakistan Engineering Council (PEC)</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.ndu_undertaking}
                          onChange={(e) => handleDocumentChange('ndu_undertaking', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Non-Disclosure undertaking (NDU) as per specified format</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.employees_list}
                          onChange={(e) => handleDocumentChange('employees_list', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Designation wise employees list on supplier's letterhead</span>
                      </label>
                    </div>
                    
                    <div className="document-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={createFormData.documents.non_involvement_declaration}
                          onChange={(e) => handleDocumentChange('non_involvement_declaration', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Declaration of non-involvement in any criminal activity</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Footer Section */}
                <div className="form-section footer-section">
                  <div className="footer-content">
                    <p className="footer-company">QASWA Industries Pvt Ltd</p>
                    <div className="footer-details">
                      <p><strong>Plot:</strong> Plot No: 56, 57 and 58 Special Economic Zone, Hattar</p>
                      <p><strong>Phone:</strong> +92 319 0508030</p>
                      <p><strong>Email:</strong> scm@qaswaindustries.com</p>
                    </div>
                    <div className="footer-notes">
                      <p><strong>Note:</strong> All pages of registration form and related documents must be signed and stamped by the authorized signatory</p>
                      <p><strong>Note:</strong> Please submit in original through registered mail / courier</p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button 
                onClick={handleCloseModals} 
                className="btn btn-secondary"
                disabled={createLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateUser}
                className="btn btn-primary"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Delete User</h2>
              <button 
                onClick={handleCloseModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation-content">
                <div className="delete-warning-icon">
                  <Trash2 style={{ width: '3rem', height: '3rem', color: '#ef4444' }} />
                </div>
                <h3 className="delete-warning-title">Delete User Account</h3>
                <p className="delete-warning-message">
                  Are you sure you want to permanently delete <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>?
                </p>
                <p className="delete-warning-submessage">
                  This action cannot be undone. All associated data including bids will be removed, and tenders will be archived.
                </p>
                <div className="user-delete-details">
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Role:</strong> {selectedUser.role}</p>
                  <p><strong>Company:</strong> {selectedUser.company_name || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={handleCloseModals} 
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteUser}
                className="btn btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Category Management Tab Component
const CategoryManagementTab = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}` } });
      if (res.ok) {
        const data = await res.json();
        const cats = Array.isArray(data?.data?.categories) ? data.data.categories : [];
        setCategories(cats);
      }
    } catch (e) {
      console.warn('Failed to load categories:', e);
    }
  };

  useEffect(() => { load(); }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim(), description: description || null })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Category created successfully');
        setName('');
        setDescription('');
        await load();
      } else {
        toast.error(data.message || 'Failed to create category');
      }
    } catch (e) {
      toast.error('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"?\n\nThis action cannot be undone. The category will be removed from all forms.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Category deleted successfully');
        await load();
      } else {
        toast.error(data.message || 'Failed to delete category');
      }
    } catch (e) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="tab-panel">
      <h1 className="tab-title">Categories</h1>
      <p className="tab-subtitle">Add new business categories for tenders and users</p>

      <form onSubmit={addCategory} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="New category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            style={{ minWidth: '260px' }}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            style={{ minWidth: '260px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Category'}
          </button>
        </div>
      </form>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No categories</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>{cat.description || '-'}</td>
                  <td>
                    <span className={`badge ${cat.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{cat.created_at ? new Date(cat.created_at).toLocaleDateString() : '-'}</td>
                  <td>
                    <button 
                      onClick={() => deleteCategory(cat.id, cat.name)}
                      className="btn-icon" 
                      style={{ color: '#ef4444' }} 
                      title="Delete Category"
                    >
                      <Trash2 style={{ width: '0.8rem', height: '0.8rem' }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Upload Tender Tab Component
const UploadTenderTab = ({ onTenderUploaded }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categories: [], // Back to categories array for checkboxes
    budget_min: '',
    budget_max: '',
    deadline: '',
    requirements: '',
    attachments: []
  });
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (res.ok) {
          const data = await res.json();
          const cats = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.categories) ? data.data.categories : (Array.isArray(data?.categories) ? data.categories : []));
          setAvailableCategories(cats);
        }
      } catch (e) {
        console.warn('Failed to load categories for upload tender:', e);
      }
    };
    loadCats();
  }, []);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // PDF Preview state
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (categoryValue, isChecked) => {
    setFormData(prev => {
      const updatedCategories = isChecked 
        ? [...prev.categories, categoryValue]
        : prev.categories.filter(cat => cat !== categoryValue);
      
      return {
        ...prev,
        categories: updatedCategories
      };
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    
    // Immediately add files to the list with "uploading" status
    const pendingFiles = files.map(file => ({
      id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID for tracking
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      originalFile: file // Keep reference to original file
    }));
    
    // Add pending files to the attachments list immediately
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...pendingFiles]
    }));

    const uploadedFiles = [];
    const failedFiles = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pendingFileId = pendingFiles[i].id;
        
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          
          const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: uploadFormData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            // Update the pending file with successful upload data
            const uploadedFile = {
              ...data,
              id: data.id || data.filename || pendingFileId,
              name: data.name || file.name,
              size: file.size,
              type: file.type,
              status: 'uploaded'
            };
            uploadedFiles.push({ pendingFileId, uploadedFile });
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
            failedFiles.push({ pendingFileId, error: errorData.message });
            console.error(`Error uploading file ${file.name}:`, errorData);
          }
        } catch (fileError) {
          failedFiles.push({ pendingFileId, error: fileError.message });
          console.error(`Error uploading file ${file.name}:`, fileError);
        }
      }
      
      // Update the attachments list: replace pending files with uploaded ones or remove failed ones
      setFormData(prev => {
        let updatedAttachments = [...prev.attachments];
        
        // Replace successfully uploaded files
        uploadedFiles.forEach(({ pendingFileId, uploadedFile }) => {
          const index = updatedAttachments.findIndex(att => att.id === pendingFileId);
          if (index !== -1) {
            updatedAttachments[index] = uploadedFile;
          }
        });
        
        // Remove failed files
        failedFiles.forEach(({ pendingFileId }) => {
          updatedAttachments = updatedAttachments.filter(att => att.id !== pendingFileId);
        });
        
        return {
          ...prev,
          attachments: updatedAttachments
        };
      });
      
      // Show appropriate success/error messages
      if (uploadedFiles.length > 0) {
        toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      }
      
      if (failedFiles.length > 0) {
        toast.error(`${failedFiles.length} file(s) failed to upload`);
      }
      
    } catch (error) {
      console.error('Error during file upload process:', error);
      toast.error('Failed to upload files');
      
      // Remove all pending files that were added if there's a general error
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter(att => !pendingFiles.some(pf => pf.id === att.id))
      }));
    } finally {
      setUploadingFiles(false);
    }
  };
  
  // PDF Preview handlers
  const handlePreviewFile = async (file) => {
    try {
      // For PDF files, create a blob URL for preview
      if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
        if (file.url) {
          // If file is already uploaded and has a URL
          setPreviewUrl(file.url);
          setSelectedPreviewFile(file);
          setShowPreview(true);
        } else if (file.filename) {
          // If file is uploaded but we need to get the URL
          const downloadUrl = `${API_BASE_URL}/upload/download/${file.filename}`;
          setPreviewUrl(downloadUrl);
          setSelectedPreviewFile(file);
          setShowPreview(true);
        } else {
          // File object (before upload)
          const objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);
          setSelectedPreviewFile(file);
          setShowPreview(true);
        }
      } else {
        // For non-PDF files, open in new tab
        if (file.url) {
          window.open(file.url, '_blank');
        } else if (file.filename) {
          const downloadUrl = `${API_BASE_URL}/upload/download/${file.filename}`;
          window.open(downloadUrl, '_blank');
        } else {
          toast.info('Preview not available for this file type');
        }
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Failed to preview file');
    }
  };
  
  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedPreviewFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };
  
  const handleDownloadFile = async (file) => {
    try {
      let downloadUrl;
      
      if (file.url) {
        downloadUrl = file.url;
      } else if (file.filename) {
        downloadUrl = `${API_BASE_URL}/upload/download/${file.filename}`;
      } else {
        toast.error('File not available for download');
        return;
      }
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name || file.filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate categories
    if (formData.categories.length === 0) {
      toast.error('Please select at least one category for your tender');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Reset form data
        setFormData({
          title: '',
          description: '',
          categories: [],
          budget_min: '',
          budget_max: '',
          deadline: '',
          requirements: '',
          attachments: []
        });
        
        // Call the callback to refresh tenders and switch tabs
        if (onTenderUploaded) {
          onTenderUploaded();
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload tender');
      }
    } catch (error) {
      console.error('Error uploading tender:', error);
      toast.error('Failed to upload tender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-tender-container">
      <div className="upload-tender-header">
        <h1 className="upload-tender-title">Upload New Tender</h1>
        <p className="upload-tender-subtitle">Create and publish a new tender for vendors to bid on</p>
      </div>

      <div className="upload-tender-form">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tender Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter tender title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Target Categories * <span className="text-sm text-gray-500">(Select categories that match your tender)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableCategories.map((category) => (
                  <div key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      checked={formData.categories.includes(category.name)}
                      onChange={(e) => handleCategoryChange(category.name, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`category-${category.value}`}
                      className="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
              {formData.categories.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Please select at least one category
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter detailed tender description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Budget (PKR) <span className="text-sm text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">₨</span>
                </div>
                <input
                  type="number"
                  name="budget_min"
                  value={formData.budget_min}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter minimum budget (optional)"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Budget (PKR) <span className="text-sm text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">₨</span>
                </div>
                <input
                  type="number"
                  name="budget_max"
                  value={formData.budget_max}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter maximum budget (optional)"
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submission Deadline *
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter specific requirements and qualifications"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600">
                  <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-500">
                    Click to upload
                  </label>
                  {' '}or drag and drop
                </div>
                <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX up to 10MB each</p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {uploadingFiles && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Uploading files...</p>
                </div>
              )}
              {formData.attachments.length > 0 && (
                <div className="uploaded-files-container">
                  <div className="uploaded-files-list">
                    <div className="uploaded-files-header">
                      📎 Attachments ({formData.attachments.length})
                    </div>
                    {formData.attachments.map((file, index) => {
                      const isPDF = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
                      const isDoc = file.type?.includes('word') || file.name?.toLowerCase().includes('doc');
                      const isUploading = file.status === 'uploading';
                      const isUploaded = file.status === 'uploaded';
                      
                      const formatFileSize = (bytes) => {
                        if (bytes === 0) return '0 Bytes';
                        const k = 1024;
                        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                      };
                      
                      return (
                        <div key={file.id || index} className="uploaded-file-item">
                          <div className={`file-icon ${isPDF ? 'pdf' : isDoc ? 'doc' : 'default'}`}>
                            {isPDF ? '📄' : isDoc ? '📝' : '📎'}
                          </div>
                          
                          <div className="file-info">
                            <div className="file-name">{file.name}</div>
                            <div className="file-details">
                              <span className="file-size">{formatFileSize(file.size || 0)}</span>
                              {file.type && (
                                <span className="file-type">{file.type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                              )}
                              <span className={`file-status ${isUploading ? 'uploading' : 'uploaded'}`}>
                                {isUploading ? (
                                  <>
                                    <span className="upload-spinner" style={{ 
                                      display: 'inline-block',
                                      width: '12px',
                                      height: '12px',
                                      border: '2px solid #f3f3f3',
                                      borderTop: '2px solid #3b82f6',
                                      borderRadius: '50%',
                                      animation: 'spin 1s linear infinite',
                                      marginRight: '4px'
                                    }}></span>
                                    Uploading...
                                  </>
                                ) : (
                                  '✓ Uploaded'
                                )}
                              </span>
                            </div>
                          </div>
                          
                          <div className="file-actions">
                            {isPDF && !isUploading && (
                              <button
                                type="button"
                                onClick={() => handlePreviewFile(file)}
                                className="btn-file-action preview"
                                title="Preview PDF"
                                disabled={isUploading}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {!isUploading && (
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                className="btn-file-action download"
                                title="Download File"
                                disabled={isUploading}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== index)
                                }));
                              }}
                              className="btn-file-action remove"
                              title="Remove File"
                              disabled={isUploading}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publish Tender
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* PDF Preview Modal */}
      {showPreview && selectedPreviewFile && previewUrl && (
        <div className="pdf-preview-modal-overlay" onClick={handleClosePreview}>
          <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <div className="pdf-preview-title">
                <FileText className="w-5 h-5 mr-2" />
                <span>Preview: {selectedPreviewFile.name}</span>
              </div>
              <div className="pdf-preview-actions">
                <button
                  onClick={() => handleDownloadFile(selectedPreviewFile)}
                  className="btn-preview-action download"
                  title="Download File"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="btn-preview-action open"
                  title="Open in New Tab"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Open
                </button>
                <button
                  onClick={handleClosePreview}
                  className="btn-preview-action close"
                  title="Close Preview"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="pdf-preview-content">
              <iframe
                src={previewUrl}
                title={`Preview: ${selectedPreviewFile.name}`}
                className="pdf-preview-iframe"
                onError={() => {
                  toast.error('Failed to load PDF preview. Try opening in a new tab.');
                  handleClosePreview();
                }}
              >
                <p>Your browser does not support PDF preview. 
                  <button onClick={() => handleDownloadFile(selectedPreviewFile)} className="text-blue-600 hover:underline">
                    Download the file instead
                  </button>
                </p>
              </iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;