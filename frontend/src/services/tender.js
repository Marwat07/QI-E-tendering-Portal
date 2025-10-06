import apiService from './api.js';

export const tenderService = {
  // Get all tenders with optional filters
  async getTenders(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/tenders?${queryString}` : '/tenders';
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch tenders');
    } catch (error) {
      throw error;
    }
  },

  // Get active tenders only
  async getActiveTenders(params = {}) {
    try {
      const activeParams = { ...params, status: 'active' };
      return await this.getTenders(activeParams);
    } catch (error) {
      throw error;
    }
  },

  // Get single tender by ID
  async getTenderById(id) {
    try {
      const response = await apiService.get(`/tenders/${id}`);
      if (response.success) {
        return response.data.tender;
      }
      throw new Error(response.message || 'Failed to fetch tender');
    } catch (error) {
      throw error;
    }
  },

  // Create new tender (admin/buyer only)
  async createTender(tenderData) {
    try {
      const response = await apiService.post('/tenders', tenderData);
      if (response.success) {
        return response.data.tender;
      }
      throw new Error(response.message || 'Failed to create tender');
    } catch (error) {
      throw error;
    }
  },

  // Update tender (admin/buyer only)
  async updateTender(id, tenderData) {
    try {
      const response = await apiService.put(`/tenders/${id}`, tenderData);
      if (response.success) {
        return response.data.tender;
      }
      throw new Error(response.message || 'Failed to update tender');
    } catch (error) {
      throw error;
    }
  },

  // Delete tender (admin/buyer only)
  async deleteTender(id) {
    try {
      const response = await apiService.delete(`/tenders/${id}`);
      if (response.success) {
        return response;
      }
      throw new Error(response.message || 'Failed to delete tender');
    } catch (error) {
      throw error;
    }
  },

  // Get tender categories
  async getCategories() {
    try {
      const response = await apiService.get('/categories');
      if (response.success) {
        return response.data.categories;
      }
      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error) {
      throw error;
    }
  },

  // Search tenders
  async searchTenders(query, filters = {}) {
    try {
      const params = { search: query, ...filters };
      return await this.getTenders(params);
    } catch (error) {
      throw error;
    }
  },

  // Get my tenders (for buyers/admin)
  async getMyTenders(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/tenders/my?${queryString}` : '/tenders/my';
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch your tenders');
    } catch (error) {
      throw error;
    }
  },

  // Publish tender (change status from draft to open)
  async publishTender(id) {
    try {
      const response = await apiService.post(`/tenders/${id}/publish`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to publish tender');
    } catch (error) {
      throw error;
    }
  },

  // Close tender
  async closeTender(id) {
    try {
      const response = await apiService.post(`/tenders/${id}/close`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to close tender');
    } catch (error) {
      throw error;
    }
  }
};

export default tenderService;
