import apiService from './api.js';

export const authService = {
  // Login user
  async login(credentials) {
    try {
      const response = await apiService.post('/auth/login', credentials);
      if (response.success && response.data.token) {
        apiService.setToken(response.data.token);
        return response.data;
      }
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      throw error;
    }
  },

  // Register user
  async register(userData) {
    try {
      const response = await apiService.post('/auth/register', userData);
      if (response.success && response.data.token) {
        apiService.setToken(response.data.token);
        return response.data;
      }
      throw new Error(response.message || 'Registration failed');
    } catch (error) {
      throw error;
    }
  },

  // Get current user profile
  async getProfile() {
    try {
      const response = await apiService.get('/auth/profile');
      if (response.success) {
        return response.data.user;
      }
      throw new Error(response.message || 'Failed to fetch profile');
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await apiService.put('/auth/profile', profileData);
      if (response.success) {
        return response.data.user;
      }
      throw new Error(response.message || 'Failed to update profile');
    } catch (error) {
      throw error;
    }
  },

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await apiService.put('/auth/change-password', passwordData);
      if (response.success) {
        return response;
      }
      throw new Error(response.message || 'Failed to change password');
    } catch (error) {
      throw error;
    }
  },

  // Forgot password
  async forgotPassword(emailData) {
    try {
      const response = await apiService.post('/auth/forgot-password', emailData);
      if (response.success) {
        return response;
      }
      throw new Error(response.message || 'Failed to send password reset instructions');
    } catch (error) {
      throw error;
    }
  },

  // Reset password
  async resetPassword(resetData) {
    try {
      const response = await apiService.post('/auth/reset-password', resetData);
      if (response.success) {
        return response;
      }
      throw new Error(response.message || 'Failed to reset password');
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout() {
    apiService.removeToken();
    // Clear any user data from localStorage if needed
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!apiService.getToken();
  },

  // Get stored user data
  getCurrentUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Store user data
  setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Clear user data
  clearCurrentUser() {
    localStorage.removeItem('user');
  }
};

export default authService;
