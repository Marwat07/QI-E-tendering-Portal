import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import apiService from '../services/api';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    phone: '',
    address: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  // Credential status state (for vendor/supplier users)
  const [credentialInfo, setCredentialInfo] = useState(null);
  const [isCredLoading, setIsCredLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        company_name: user.company_name || '',
        phone: user.phone || '',
        address: user.address || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Fetch credential status for vendor/supplier users
  useEffect(() => {
    const shouldFetch = user && (user.role === 'vendor' || user.role === 'supplier');
    if (!shouldFetch) return;

    const fetchCredentialStatus = async () => {
      try {
        setIsCredLoading(true);
        const res = await apiService.get('/credentials/status');
        // Expecting { success, data: { expiresAt, isExpired, daysUntilExpiry, credentialStatus } }
        setCredentialInfo(res?.data || null);
      } catch (err) {
        console.warn('Failed to fetch credential status:', err?.message || err);
        setCredentialInfo(null);
      } finally {
        setIsCredLoading(false);
      }
    };

    fetchCredentialStatus();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await apiService.put('/auth/profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        phone: formData.phone,
        address: formData.address
      });

      if (data.success) {
        if (updateProfile) {
          updateProfile(data.data.user);
        }
        toast.success('Profile updated successfully!');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('An error occurred while updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiService.put('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      });

      if (data.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An error occurred while changing password');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user?.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    } else if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return String(dateString);
    }
  };

  return (
    <div className="profile-settings">
      <div className="settings-container">
        <div className="settings-header">
          <div className="profile-avatar-large">
            {getUserInitials()}
          </div>
          <div className="profile-header-info">
            <h1>Account Settings</h1>
            <p>Manage your account information and preferences</p>
          </div>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            Profile Information
          </button>
          <button
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="tab-icon">🔒</span>
            Security
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="tab-content">
              <form onSubmit={handleProfileSubmit}>
                <div className="form-section">
                  <h2>Personal Information</h2>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="first_name">First Name *</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="last_name">Last Name *</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="disabled-field"
                    />
                    <small className="field-note">Email cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h2>Company Information</h2>
                  <div className="form-group">
                    <label htmlFor="company_name">Company Name</label>
                    <input
                      type="text"
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your full address"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="save-button"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="tab-content">
              {/* Credential info for vendor/supplier users */}
              {user && (user.role === 'vendor' || user.role === 'supplier') && (
                <div className="form-section">
                  <h2>Credential Status</h2>
                  {isCredLoading ? (
                    <p>Loading credential status...</p>
                  ) : credentialInfo ? (
                    <div className="credential-info">
                      {credentialInfo.isExpired ? (
                        <p className="credential-expired">
                          Your credentials expired on <strong>{formatDate(credentialInfo.expiresAt)}</strong>.
                        </p>
                      ) : credentialInfo.expiresAt ? (
                        <p className={typeof credentialInfo.daysUntilExpiry === 'number' && credentialInfo.daysUntilExpiry <= 7 ? 'credential-warning' : 'credential-ok'}>
                          Credentials expire on <strong>{formatDate(credentialInfo.expiresAt)}</strong>
                          {typeof credentialInfo.daysUntilExpiry === 'number' ? ` (in ${credentialInfo.daysUntilExpiry} days)` : ''}.
                        </p>
                      ) : (
                        <p>No credential expiry set.</p>
                      )}
                    </div>
                  ) : (
                    <p>Unable to load credential status.</p>
                  )}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="form-section">
                  <h2>Change Password</h2>
                  <p>Ensure your account is using a strong password to stay secure.</p>

                  <div className="form-group">
                    <label htmlFor="current_password">Current Password *</label>
                    <input
                      type="password"
                      id="current_password"
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="new_password">New Password *</label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      required
                      minLength="6"
                    />
                    <small className="field-note">Minimum 6 characters</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm_password">Confirm New Password *</label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="save-button"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
