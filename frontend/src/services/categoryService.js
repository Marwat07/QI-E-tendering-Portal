import apiService from './api.js';

export const categoryService = {
  // Get all categories
  async getCategories() {
    try {
      const response = await apiService.get('/categories');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error) {
      throw error;
    }
  },

  // Initialize service (stub for compatibility)
  initialize() {
    // Basic initialization if needed
    console.log('Category service initialized (basic mode)');
  }
};

export default categoryService;