import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import CategoryList from './CategoryList';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenders: 0,
    activeTenders: 0,
    totalBids: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    company_name: '',
    phone: '',
    address: '',
    role: 'vendor'
  });

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'tenders') {
      fetchTenders();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/tenders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTenders(data.data.tenders || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenders:', error);
      toast.error('Failed to load tenders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      const data = await response.json();
      if (data.success) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        ));
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('An error occurred while updating user status');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newUserData,
          auto_generate_credentials: true
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('User created successfully! Credentials sent via email.');
        setShowCreateUser(false);
        setNewUserData({
          email: '',
          company_name: '',
          phone: '',
          address: '',
          role: 'vendor'
        });
        fetchUsers(); // Refresh users list
      } else {
        toast.error(data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('An error occurred while creating user');
    }
  };

  const getUserInitials = () => {
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    } else if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'A';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-panel pt-32">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-avatar">
            {getUserInitials()}
          </div>
          <div className="admin-header-info">
            <h1>Admin Panel</h1>
            <p>Manage users, tenders, and system settings</p>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="tab-icon">📊</span>
            Dashboard
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="tab-icon">👥</span>
            Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'tenders' ? 'active' : ''}`}
            onClick={() => setActiveTab('tenders')}
          >
            <span className="tab-icon">📋</span>
            Tenders
          </button>
          <button
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="tab-icon">⚙️</span>
            Settings
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="tab-panel">
              <h2>System Overview</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalUsers}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalTenders}</div>
                    <div className="stat-label">Total Tenders</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.activeTenders}</div>
                    <div className="stat-label">Active Tenders</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💼</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalBids}</div>
                    <div className="stat-label">Total Bids</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>User Management</h2>
                <div className="panel-actions">
                  <button className="create-btn" onClick={() => setShowCreateUser(true)}>
                    ➕ Create User
                  </button>
                  <button className="refresh-btn" onClick={fetchUsers}>
                    🔄 Refresh
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="loading">Loading users...</div>
              ) : (
                <div className="users-table">
                  <table>
                    <thead>
                      <tr>
                        <th>USER</th>
                        <th>ROLE</th>
                        <th>CATEGORY</th>
                        <th>COMPANY</th>
                        <th>STATUS</th>
                        <th>JOINED</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                {user.username || user.email?.split('@')[0] || 'N/A'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', opacity: 0.8 }}>
                                {user.email}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${user.role}`}>
                              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                            </span>
                          </td>
                          <td>
                            <CategoryList 
                              categories={user.categories || user.category || []}
                              maxVisible={2}
                              compact={true}
                              className="admin-table table-compact"
                            />
                          </td>
                          <td>{user.company_name || '-'}</td>
                          <td>
                            <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{formatDate(user.created_at)}</td>
                          <td>
                            <button
                              className={`action-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                              onClick={() => handleUserStatusToggle(user.id, user.is_active)}
                            >
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && !isLoading && (
                    <div className="empty-state">No users found</div>
                  )}
                </div>
              )}
              
              {/* Create User Modal */}
              {showCreateUser && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Create New User</h3>
                      <button className="close-btn" onClick={() => setShowCreateUser(false)}>
                        ×
                      </button>
                    </div>
                    <form onSubmit={handleCreateUser} className="create-user-form">
                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                          required
                          placeholder="user@example.com"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Company Name</label>
                        <input
                          type="text"
                          value={newUserData.company_name}
                          onChange={(e) => setNewUserData({...newUserData, company_name: e.target.value})}
                          placeholder="Company Ltd."
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={newUserData.phone}
                          onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                          placeholder="+1234567890"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Address</label>
                        <textarea
                          value={newUserData.address}
                          onChange={(e) => setNewUserData({...newUserData, address: e.target.value})}
                          placeholder="Business address"
                          rows="3"
                        ></textarea>
                      </div>
                      
                      <div className="form-group">
                        <label>Role *</label>
                        <select
                          value={newUserData.role}
                          onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                          required
                        >
                          <option value="vendor">Vendor</option>
                          <option value="buyer">Buyer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      
                      <div className="info-box">
                        <p>💬 <strong>Note:</strong> Username and password will be automatically generated and sent to the user's email address.</p>
                      </div>
                      
                      <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={() => setShowCreateUser(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="submit-btn">
                          Create User & Send Credentials
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tenders' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Tender Management</h2>
                <div className="panel-actions">
                  <button className="refresh-btn" onClick={fetchTenders}>
                    🔄 Refresh
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="loading">Loading tenders...</div>
              ) : (
                <div className="tenders-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Budget</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Deadline</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenders.map(tender => (
                        <tr key={tender.id}>
                          <td>{tender.title}</td>
                          <td>
                            <CategoryList 
                              categories={tender.categories || tender.category || tender.category_name || 'Uncategorized'}
                              maxVisible={2}
                              compact={true}
                              className="admin-table table-compact"
                            />
                          </td>
                          <td>${tender.budget?.toLocaleString() || 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${tender.status || 'active'}`}>
                              {tender.status?.charAt(0).toUpperCase() + tender.status?.slice(1) || 'Active'}
                            </span>
                          </td>
                          <td>{formatDate(tender.created_at)}</td>
                          <td>{formatDate(tender.deadline)}</td>
                          <td>
                            <button className="action-btn view">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tenders.length === 0 && !isLoading && (
                    <div className="empty-state">No tenders found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-panel">
              <h2>System Settings</h2>
              <div className="settings-sections">
                <div className="settings-section">
                  <h3>General Settings</h3>
                  <div className="setting-item">
                    <label>System Name</label>
                    <input type="text" defaultValue="QI E-Tendering System" />
                  </div>
                  <div className="setting-item">
                    <label>Contact Email</label>
                    <input type="email" defaultValue="admin@etendering.com" />
                  </div>
                </div>
                
                <div className="settings-section">
                  <h3>Tender Settings</h3>
                  <div className="setting-item">
                    <label>Default Tender Duration (Days)</label>
                    <input type="number" defaultValue="30" />
                  </div>
                  <div className="setting-item">
                    <label>Auto-approve Tenders</label>
                    <select>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>

                <button className="save-settings-btn">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
