const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    // Check both possible token keys for compatibility
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }

  setToken(token) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token); // Also set the alternative key for compatibility
  }

  removeToken() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Don't set Content-Type for FormData (let browser set it)
    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.removeToken();
          window.location.href = '/login';
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET request with query params
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Auth API methods
  auth = {
    login: (credentials) => this.post('/auth/login', credentials),
    logout: () => this.post('/auth/logout'),
    getProfile: () => this.get('/auth/profile'),
    updateProfile: (userData) => this.put('/auth/profile', userData),
    forgotPassword: (email) => this.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => this.post('/auth/reset-password', { token, password }),
  };

  // Method to download documents with fallback support
  async downloadDocument(tenderId, documentId, filename, originalName) {
    const token = this.getToken();
    const urls = [
      // Try upload endpoint first (for newer uploads)
      `${this.baseURL}/upload/download/${filename}${originalName ? `?original=${encodeURIComponent(originalName)}` : ''}`,
      // Fallback to files endpoint (for bid attachments)
      documentId ? `${this.baseURL}/files/${tenderId}_${documentId}/download` : null,
      // Direct static file access as last resort
      `${this.baseURL.replace('/api', '')}/uploads/${filename}`
    ].filter(Boolean);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        console.log(`Attempting download from: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          // Get the blob from the response
          const blob = await response.blob();
          
          // Create download link
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = originalName || filename || `document-${documentId}`;
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
          
          return true;
        } else if (response.status === 401) {
          this.removeToken();
          window.location.href = '/login';
          return;
        } else {
          console.warn(`Failed to download from ${url}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Error downloading from ${url}:`, error.message);
      }
    }
    
    throw new Error(`Failed to download document: ${filename}. File may not exist or you may not have permission to access it.`);
  }

  // Method to view documents with fallback support
  async viewDocument(tenderId, documentId, filename) {
    const urls = [
      // Try upload endpoint first (for newer uploads)
      `${this.baseURL}/upload/view/${filename}`,
      // Fallback to files endpoint (for bid attachments)
      documentId ? `${this.baseURL}/files/${tenderId}_${documentId}/view` : null,
      // Direct static file access as last resort
      `${this.baseURL.replace('/api', '')}/uploads/${filename}`
    ].filter(Boolean);

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          window.open(url, '_blank');
          return true;
        }
      } catch (error) {
        console.warn(`Cannot access ${url}:`, error.message);
      }
    }
    
    throw new Error(`Failed to view document: ${filename}. File may not exist or you may not have permission to access it.`);
  }

  // Tender API methods
  tenders = {
    getAll: (params) => this.get('/tenders', params),
    getById: (id) => this.get(`/tenders/${id}`),
    create: (data) => this.post('/tenders', data),
    update: (id, data) => this.put(`/tenders/${id}`, data),
    delete: (id) => this.delete(`/tenders/${id}`),
    publish: (id) => this.post(`/tenders/${id}/publish`),
    close: (id) => this.post(`/tenders/${id}/close`),
    award: (id, bidId) => this.post(`/tenders/${id}/award`, { bidId }),
    getBids: (id, params) => this.get(`/tenders/${id}/bids`, params),
    getStats: () => this.get('/tenders/stats'),
    downloadDocument: (tenderId, documentId, filename, originalName) => this.downloadDocument(tenderId, documentId, filename, originalName),
    viewDocument: (tenderId, documentId, filename) => this.viewDocument(tenderId, documentId, filename),
  };

  // Bid API methods
  bids = {
    getAll: (params) => this.get('/bids', params),
    getById: (id) => this.get(`/bids/${id}`),
    submit: (data) => this.post('/bids', data),
    update: (id, data) => this.put(`/bids/${id}`, data),
    withdraw: (id, reason) => this.post(`/bids/${id}/withdraw`, { reason }),
    evaluate: (id, evaluation) => this.put(`/bids/${id}/evaluate`, evaluation),
    award: (id) => this.post(`/bids/${id}/award`),
    getStats: () => this.get('/bids/stats'),
    checkEligibility: (tenderId) => this.get(`/bids/eligibility/${tenderId}`),
  };

  // Dashboard API methods
  dashboard = {
    getData: () => this.get('/dashboard'),
    getAnalytics: (params) => this.get('/dashboard/analytics', params),
    getTenderMetrics: () => this.get('/dashboard/tender-metrics'),
    getBidMetrics: () => this.get('/dashboard/bid-metrics'),
  };

  // Notification API methods
  notifications = {
    getAll: (params) => this.get('/notifications', params),
    markAsRead: (id) => this.put(`/notifications/${id}/read`),
    markAllAsRead: () => this.put('/notifications/read-all'),
    delete: (id) => this.delete(`/notifications/${id}`),
    getUnreadCount: () => this.get('/notifications/unread-count'),
  };
}

export const apiService = new ApiService();
export default apiService;
