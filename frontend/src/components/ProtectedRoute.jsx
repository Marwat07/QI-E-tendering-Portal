import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access check
  if (roles.length > 0 && user) {
    const hasAccess = roles.includes(user.role);

    // Debug logging
    console.log('🔐 ProtectedRoute access check:', {
      userRole: user.role,
      userEmail: user.email,
      requiredRoles: roles,
      hasAccess
    });

    if (!hasAccess) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p><small>Required roles: {roles.join(', ')} | Your role: {user.role}</small></p>
          <p><small>Email: {user.email}</small></p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
