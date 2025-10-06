import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tenderService from '../../services/tender';

// Async thunks
export const fetchTenders = createAsyncThunk(
  'tenders/fetchTenders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await tenderService.getTenders(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchActiveTenders = createAsyncThunk(
  'tenders/fetchActiveTenders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await tenderService.getActiveTenders(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTenderById = createAsyncThunk(
  'tenders/fetchTenderById',
  async (id, { rejectWithValue }) => {
    try {
      const tender = await tenderService.getTenderById(id);
      return tender;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createTender = createAsyncThunk(
  'tenders/createTender',
  async (tenderData, { rejectWithValue }) => {
    try {
      const tender = await tenderService.createTender(tenderData);
      return tender;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTender = createAsyncThunk(
  'tenders/updateTender',
  async ({ id, tenderData }, { rejectWithValue }) => {
    try {
      const tender = await tenderService.updateTender(id, tenderData);
      return tender;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTender = createAsyncThunk(
  'tenders/deleteTender',
  async (id, { rejectWithValue }) => {
    try {
      await tenderService.deleteTender(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMyTenders = createAsyncThunk(
  'tenders/fetchMyTenders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await tenderService.getMyTenders(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'tenders/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await tenderService.getCategories();
      return categories;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchTenders = createAsyncThunk(
  'tenders/searchTenders',
  async ({ query, filters }, { rejectWithValue }) => {
    try {
      const response = await tenderService.searchTenders(query, filters);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Tender lists
  tenders: [],
  activeTenders: [],
  myTenders: [],
  searchResults: [],
  
  // Current tender details
  currentTender: null,
  
  // Categories
  categories: [],
  
  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  
  // Search and filters
  searchQuery: '',
  filters: {},
  
  // Loading states
  loading: false,
  tendersLoading: false,
  activeTendersLoading: false,
  myTendersLoading: false,
  tenderDetailsLoading: false,
  categoriesLoading: false,
  searchLoading: false,
  actionLoading: false, // for create, update, delete
  
  // Errors
  error: null,
  tendersError: null,
  activeTendersError: null,
  myTendersError: null,
  tenderDetailsError: null,
  categoriesError: null,
  searchError: null,
  actionError: null,
};

const tenderSlice = createSlice({
  name: 'tenders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.tendersError = null;
      state.activeTendersError = null;
      state.myTendersError = null;
      state.tenderDetailsError = null;
      state.categoriesError = null;
      state.searchError = null;
      state.actionError = null;
    },
    clearCurrentTender: (state) => {
      state.currentTender = null;
      state.tenderDetailsError = null;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    updateTenderInList: (state, action) => {
      const updatedTender = action.payload;
      // Update in all relevant lists
      const updateInArray = (array) => {
        const index = array.findIndex(tender => tender._id === updatedTender._id);
        if (index !== -1) {
          array[index] = updatedTender;
        }
      };
      
      updateInArray(state.tenders);
      updateInArray(state.activeTenders);
      updateInArray(state.myTenders);
      updateInArray(state.searchResults);
      
      // Update current tender if it matches
      if (state.currentTender && state.currentTender._id === updatedTender._id) {
        state.currentTender = updatedTender;
      }
    },
    removeTenderFromList: (state, action) => {
      const tenderId = action.payload;
      // Remove from all lists
      state.tenders = state.tenders.filter(tender => tender._id !== tenderId);
      state.activeTenders = state.activeTenders.filter(tender => tender._id !== tenderId);
      state.myTenders = state.myTenders.filter(tender => tender._id !== tenderId);
      state.searchResults = state.searchResults.filter(tender => tender._id !== tenderId);
      
      // Clear current tender if it matches
      if (state.currentTender && state.currentTender._id === tenderId) {
        state.currentTender = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tenders
      .addCase(fetchTenders.pending, (state) => {
        state.tendersLoading = true;
        state.tendersError = null;
      })
      .addCase(fetchTenders.fulfilled, (state, action) => {
        state.tendersLoading = false;
        state.tenders = action.payload.tenders || action.payload;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchTenders.rejected, (state, action) => {
        state.tendersLoading = false;
        state.tendersError = action.payload;
      })
      
      // Fetch Active Tenders
      .addCase(fetchActiveTenders.pending, (state) => {
        state.activeTendersLoading = true;
        state.activeTendersError = null;
      })
      .addCase(fetchActiveTenders.fulfilled, (state, action) => {
        state.activeTendersLoading = false;
        state.activeTenders = action.payload.tenders || action.payload;
      })
      .addCase(fetchActiveTenders.rejected, (state, action) => {
        state.activeTendersLoading = false;
        state.activeTendersError = action.payload;
      })
      
      // Fetch Tender by ID
      .addCase(fetchTenderById.pending, (state) => {
        state.tenderDetailsLoading = true;
        state.tenderDetailsError = null;
      })
      .addCase(fetchTenderById.fulfilled, (state, action) => {
        state.tenderDetailsLoading = false;
        state.currentTender = action.payload;
      })
      .addCase(fetchTenderById.rejected, (state, action) => {
        state.tenderDetailsLoading = false;
        state.tenderDetailsError = action.payload;
      })
      
      // Create Tender
      .addCase(createTender.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createTender.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.tenders.unshift(action.payload);
        state.myTenders.unshift(action.payload);
      })
      .addCase(createTender.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      })
      
      // Update Tender
      .addCase(updateTender.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateTender.fulfilled, (state, action) => {
        state.actionLoading = false;
        // Use the updateTenderInList logic
        tenderSlice.caseReducers.updateTenderInList(state, { payload: action.payload });
      })
      .addCase(updateTender.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      })
      
      // Delete Tender
      .addCase(deleteTender.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteTender.fulfilled, (state, action) => {
        state.actionLoading = false;
        // Use the removeTenderFromList logic
        tenderSlice.caseReducers.removeTenderFromList(state, { payload: action.payload });
      })
      .addCase(deleteTender.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      })
      
      // Fetch My Tenders
      .addCase(fetchMyTenders.pending, (state) => {
        state.myTendersLoading = true;
        state.myTendersError = null;
      })
      .addCase(fetchMyTenders.fulfilled, (state, action) => {
        state.myTendersLoading = false;
        state.myTenders = action.payload.tenders || action.payload;
      })
      .addCase(fetchMyTenders.rejected, (state, action) => {
        state.myTendersLoading = false;
        state.myTendersError = action.payload;
      })
      
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      })
      
      // Search Tenders
      .addCase(searchTenders.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchTenders.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.tenders || action.payload;
      })
      .addCase(searchTenders.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      });
  },
});

export const {
  clearError,
  clearCurrentTender,
  setSearchQuery,
  setFilters,
  clearSearchResults,
  updateTenderInList,
  removeTenderFromList,
} = tenderSlice.actions;

// Selectors
export const selectTenders = (state) => state.tenders;
export const selectTendersList = (state) => state.tenders.tenders;
export const selectActiveTenders = (state) => state.tenders.activeTenders;
export const selectMyTenders = (state) => state.tenders.myTenders;
export const selectCurrentTender = (state) => state.tenders.currentTender;
export const selectCategories = (state) => state.tenders.categories;
export const selectSearchResults = (state) => state.tenders.searchResults;
export const selectTendersPagination = (state) => state.tenders.pagination;
export const selectTendersLoading = (state) => state.tenders.tendersLoading;
export const selectActiveTendersLoading = (state) => state.tenders.activeTendersLoading;
export const selectTenderDetailsLoading = (state) => state.tenders.tenderDetailsLoading;
export const selectTendersError = (state) => state.tenders.tendersError;
export const selectTenderDetailsError = (state) => state.tenders.tenderDetailsError;

export default tenderSlice.reducer;
