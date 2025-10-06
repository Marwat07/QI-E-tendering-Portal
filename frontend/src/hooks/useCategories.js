import { useState, useEffect } from 'react';
import categoryService from '../services/categoryService';

// Custom hook to get categories with real-time updates
export const useCategories = (includeInactive = false) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let categoriesArray;
        if (includeInactive) {
          categoriesArray = await categoryService.fetchAllCategories();
        } else {
          categoriesArray = await categoryService.fetchCategories();
        }
        
        setCategories(categoriesArray);
        
        // Subscribe to category updates
        unsubscribe = categoryService.addListener((updatedCategories) => {
          if (includeInactive) {
            // For admin views, we need to refetch all categories including inactive
            categoryService.fetchAllCategories().then(setCategories);
          } else {
            setCategories(updatedCategories);
          }
        });
        
      } catch (err) {
        console.error('Error loading categories:', err);
        setError(err.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [includeInactive]);

  const refreshCategories = async () => {
    try {
      setLoading(true);
      if (includeInactive) {
        const categoriesArray = await categoryService.fetchAllCategories(true);
        setCategories(categoriesArray);
      } else {
        const categoriesArray = await categoryService.fetchCategories(true);
        setCategories(categoriesArray);
      }
    } catch (err) {
      console.error('Error refreshing categories:', err);
      setError(err.message || 'Failed to refresh categories');
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    loading,
    error,
    refreshCategories
  };
};

// Hook to get categories formatted for dropdown/select components
export const useCategoriesDropdown = () => {
  const { categories, loading, error } = useCategories(false); // Only active categories

  const dropdownOptions = categories.map(category => ({
    value: category.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    label: category.name,
    id: category.id,
    description: category.description
  }));

  return {
    options: dropdownOptions,
    categories,
    loading,
    error
  };
};

// Hook to get category by ID or name
export const useCategory = (identifier) => {
  const { categories } = useCategories(false);
  
  const category = categories.find(cat => 
    cat.id === identifier ||
    cat.name.toLowerCase() === identifier?.toLowerCase() ||
    cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === identifier?.toLowerCase()
  );

  return category || null;
};

// Hook for category statistics
export const useCategoryStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await categoryService.getCategoriesStats();
      setStats({
        total: parseInt(statsData.total) || 0,
        active: parseInt(statsData.active) || 0,
        inactive: parseInt(statsData.inactive) || 0
      });
    } catch (err) {
      console.error('Error fetching category stats:', err);
      setError(err.message || 'Failed to load category statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to category updates to refresh stats
    const unsubscribe = categoryService.addListener(() => {
      fetchStats();
    });

    return unsubscribe;
  }, []);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats
  };
};

export default useCategories;