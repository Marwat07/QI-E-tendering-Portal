import apiService from './api.js';

export const bidService = {
  // Get all bids for a tender (admin/buyer only)
  async getTenderBids(tenderId) {
    try {
      const response = await apiService.get(`/bids/tender/${tenderId}`);
      if (response.success) {
        return response.data.bids;
      }
      throw new Error(response.message || 'Failed to fetch tender bids');
    } catch (error) {
      throw error;
    }
  },

  // Get my bids (vendor)
  async getMyBids(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/bids/my?${queryString}` : '/bids/my';
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch your bids');
    } catch (error) {
      throw error;
    }
  },

  // Get single bid by ID
  async getBidById(id) {
    try {
      const response = await apiService.get(`/bids/${id}`);
      if (response.success) {
        return response.data.bid;
      }
      throw new Error(response.message || 'Failed to fetch bid');
    } catch (error) {
      throw error;
    }
  },

  // Submit a bid
  async submitBid(bidData) {
    try {
      const response = await apiService.post('/bids', bidData);
      if (response.success) {
        return response.data.bid;
      }
      throw new Error(response.message || 'Failed to submit bid');
    } catch (error) {
      throw error;
    }
  },

  // Update a bid (before tender closing)
  async updateBid(id, bidData) {
    try {
      const response = await apiService.put(`/bids/${id}`, bidData);
      if (response.success) {
        return response.data.bid;
      }
      throw new Error(response.message || 'Failed to update bid');
    } catch (error) {
      throw error;
    }
  },

  // Withdraw a bid
  async withdrawBid(id, reason = '') {
    try {
      const response = await apiService.post(`/bids/${id}/withdraw`, { reason });
      if (response.success) {
        return response.data.bid;
      }
      throw new Error(response.message || 'Failed to withdraw bid');
    } catch (error) {
      throw error;
    }
  },

  // Delete a bid (before tender closing)
  async deleteBid(id) {
    try {
      const response = await apiService.delete(`/bids/${id}`);
      if (response.success) {
        return response;
      }
      throw new Error(response.message || 'Failed to delete bid');
    } catch (error) {
      throw error;
    }
  },

  // Accept/Award a bid (admin/buyer only)
  async awardBid(id) {
    try {
      const response = await apiService.put(`/bids/${id}/award`);
      if (response.success) {
        return response.data.bid;
      }
      throw new Error(response.message || 'Failed to award bid');
    } catch (error) {
      throw error;
    }
  },

  // Reject a bid (admin/buyer only)
  async rejectBid(id, reason = '') {
    try {
      const response = await apiService.put(`/bids/${id}/reject`, { reason });
      if (response.success) {
        return response.data.bid;
      }
      throw new Error(response.message || 'Failed to reject bid');
    } catch (error) {
      throw error;
    }
  },

  // Check if user can bid on a tender
  async canBidOnTender(tenderId) {
    try {
      const response = await apiService.get(`/bids/can-bid/${tenderId}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to check bid eligibility');
    } catch (error) {
      throw error;
    }
  },

  // Get bid statistics for a tender (admin/buyer only)
  async getTenderBidStats(tenderId) {
    try {
      const response = await apiService.get(`/bids/tender/${tenderId}/stats`);
      if (response.success) {
        return response.data.stats;
      }
      throw new Error(response.message || 'Failed to fetch bid statistics');
    } catch (error) {
      throw error;
    }
  }
};

export default bidService;
