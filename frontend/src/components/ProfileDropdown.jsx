import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './ProfileDropdown.css';

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out successfully.', {
      position: 'top-right',
      autoClose: 3000,
    });
    navigate('/');
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  // Generate user initials for avatar
  const getUserInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else {
      return user.email;
    }
  };

  const adminMenuItems = [
    { to: '/admin', icon: '📊', label: 'Admin Dashboard' },
    { to: '/admin/panel', icon: '🛠️', label: 'Admin Panel' },
    // { to: '/tenders/manage', icon: '📋', label: 'Manage Tenders' },
    { to: '/profile/settings', icon: '⚙️', label: 'Account Settings' },
    // { to: '/admin/users', icon: '👥', label: 'Manage Users' },
    // { to: '/admin/reports', icon: '📊', label: 'Reports' },
  ];

  const buyerMenuItems = [
    { to: '/tenders/manage', icon: '📋', label: 'Manage Tenders' },
    { to: '/tenders/create', icon: '➕', label: 'Create Tender' },
    { to: '/profile/settings', icon: '⚙️', label: 'Account Settings' },
    { to: '/buyer/reports', icon: '📊', label: 'My Reports' },
  ];

  const vendorMenuItems = [
    { to: '/bidder-dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/my-bids', icon: '💼', label: 'My Bids' },
    { to: '/profile/settings', icon: '⚙️', label: 'Account Settings' },
    { to: '/vendor/history', icon: '📜', label: 'Bid History' },
  ];

  const getMenuItems = () => {
    switch (user.role) {
      case 'admin':
        return adminMenuItems;
      case 'buyer':
        return buyerMenuItems;
      case 'vendor':
      case 'supplier':
        return vendorMenuItems;
      default:
        return vendorMenuItems;
    }
  };

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <div className="profile-trigger" onClick={toggleDropdown}>
        <div className="user-avatar">
          {getUserInitials()}
        </div>
        <div className="user-info">
          <span className="user-name">{getDisplayName()}</span>
          <span className="user-role">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}</span>
        </div>
        <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="user-avatar large">
              {getUserInitials()}
            </div>
            <div className="user-details">
              <div className="user-name">{getDisplayName()}</div>
              <div className="user-email">{user.email}</div>
              <div className="user-role-badge">
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
              </div>
              {user.credentialStatus && (
                <div className={`credential-status ${user.credentialStatus.status}`}>
                  {user.credentialStatus.status === 'expired' && (
                    <span className="credential-expired">🔴 Credentials Expired</span>
                  )}
                  {user.credentialStatus.status === 'critical' && (
                    <span className="credential-critical">🟠 Expires in {user.daysUntilExpiry} days</span>
                  )}
                  {user.credentialStatus.status === 'warning' && (
                    <span className="credential-warning">🟡 Expires in {user.daysUntilExpiry} days</span>
                  )}
                  {user.credentialStatus.status === 'valid' && user.daysUntilExpiry < 90 && (
                    <span className="credential-valid">🟢 Valid ({user.daysUntilExpiry} days left)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-items">
            {getMenuItems().map((item, index) => (
              <Link
                key={index}
                to={item.to}
                className="dropdown-item"
                onClick={closeDropdown}
              >
                <span className="item-icon">{item.icon}</span>
                <span className="item-label">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-items">
            <button className="dropdown-item logout-item" onClick={handleLogout}>
              <span className="item-icon">🚪</span>
              <span className="item-label">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
