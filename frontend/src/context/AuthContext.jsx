import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Normalize role to a consistent lowercase string for reliable routing/UI logic
const normalizeUserRole = (u) => {
  if (!u) return u;
  const role = typeof u.role === 'string' ? u.role.trim().toLowerCase() : u.role;
  return { ...u, role };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (authService.isAuthenticated()) {
        const profileUser = await authService.getProfile();
        const normalized = normalizeUserRole(profileUser);
        setUser(normalized);
        authService.setCurrentUser(normalized);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // If token is invalid, clear it
      authService.clearCurrentUser();
      authService.removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      // Perform login to obtain token
      const loginData = await authService.login(credentials);

      // Immediately fetch full profile (backend login response may not include user fields)
      const profileUser = await authService.getProfile();
      const normalized = normalizeUserRole(profileUser);
      setUser(normalized);
      authService.setCurrentUser(normalized);

      // Return combined data for callers like Login.jsx to make redirect decisions
      return { ...loginData, user: normalized };
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(userData);
      const normalized = normalizeUserRole(response.user);
      setUser(normalized);
      authService.setCurrentUser(normalized);
      return { ...response, user: normalized };
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    authService.logout();
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await authService.updateProfile(profileData);
      const normalized = normalizeUserRole(updatedUser);
      setUser(normalized);
      authService.setCurrentUser(normalized);
      return normalized;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError(null);
      await authService.changePassword(passwordData);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
