import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import bidService from '../../services/bid';

// Async thunks
export const fetchTenderBids = createAsyncThunk(
  'bids/fetchTenderBids',
  async (tenderId, { rejectWithValue }) => {
    try {
      const bids = await bidService.getTenderBids(tenderId);
      return { tenderId, bids };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMyBids = createAsyncThunk(
  'bids/fetchMyBids',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bidService.getMyBids(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBidById = createAsyncThunk(
  'bids/fetchBidById',
  async (id, { rejectWithValue }) => {
    try {
      const bid = await bidService.getBidById(id);
      return bid;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitBid = createAsyncThunk(
  'bids/submitBid',
  async (bidData, { rejectWithValue }) => {
    try {
      const bid = await bidService.submitBid(bidData);
      return bid;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateBid = createAsyncThunk(
  'bids/updateBid',
  async ({ id, bidData }, { rejectWithValue }) => {
    try {
      const bid = await bidService.updateBid(id, bidData);
      return bid;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const withdrawBid = createAsyncThunk(
  'bids/withdrawBid',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const bid = await bidService.withdrawBid(id, reason);
      return bid;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteBid = createAsyncThunk(
  'bids/deleteBid',
  async (id, { rejectWithValue }) => {
    try {
      await bidService.deleteBid(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const awardBid = createAsyncThunk(
  'bids/awardBid',
  async (id, { rejectWithValue }) => {
    try {
      const bid = await bidService.awardBid(id);
      return bid;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const rejectBid = createAsyncThunk(
  'bids/rejectBid',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const bid = await bidService.rejectBid(id, reason);
      return bid;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkBidEligibility = createAsyncThunk(
  'bids/checkEligibility',
  async (tenderId, { rejectWithValue }) => {
    try {
      const eligibility = await bidService.canBidOnTender(tenderId);
      return { tenderId, eligibility };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTenderBidStats = createAsyncThunk(
  'bids/fetchTenderBidStats',
  async (tenderId, { rejectWithValue }) => {
    try {
      const stats = await bidService.getTenderBidStats(tenderId);
      return { tenderId, stats };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Bid lists
  myBids: [],
  tenderBids: {}, // Map of tenderId -> bids array
  
  // Current bid details
  currentBid: null,
  
  // Bid stats
  tenderBidStats: {}, // Map of tenderId -> stats
  
  // Bid eligibility
  bidEligibility: {}, // Map of tenderId -> eligibility info
  
  // Pagination for my bids
  myBidsPagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  
  // Loading states
  loading: false,
  myBidsLoading: false,
  tenderBidsLoading: false,
  bidDetailsLoading: false,
  bidActionLoading: false, // for submit, update, delete, award, reject
  bidStatsLoading: false,
  eligibilityLoading: false,
  
  // Error states
  error: null,
  myBidsError: null,
  tenderBidsError: null,
  bidDetailsError: null,
  bidActionError: null,
  bidStatsError: null,
  eligibilityError: null,
};

const bidSlice = createSlice({
  name: 'bids',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.myBidsError = null;
      state.tenderBidsError = null;
      state.bidDetailsError = null;
      state.bidActionError = null;
      state.bidStatsError = null;
      state.eligibilityError = null;
    },
    clearCurrentBid: (state) => {
      state.currentBid = null;
      state.bidDetailsError = null;
    },
    updateBidInList: (state, action) => {
      const updatedBid = action.payload;
      
      // Update in myBids
      const myBidIndex = state.myBids.findIndex(bid => bid._id === updatedBid._id);
      if (myBidIndex !== -1) {
        state.myBids[myBidIndex] = updatedBid;
      }
      
      // Update in tender bids
      Object.keys(state.tenderBids).forEach(tenderId => {
        const bidIndex = state.tenderBids[tenderId].findIndex(bid => bid._id === updatedBid._id);
        if (bidIndex !== -1) {
          state.tenderBids[tenderId][bidIndex] = updatedBid;
        }
      });
      
      // Update current bid if it matches
      if (state.currentBid && state.currentBid._id === updatedBid._id) {
        state.currentBid = updatedBid;
      }
    },
    removeBidFromList: (state, action) => {
      const bidId = action.payload;
      
      // Remove from myBids
      state.myBids = state.myBids.filter(bid => bid._id !== bidId);
      
      // Remove from tender bids
      Object.keys(state.tenderBids).forEach(tenderId => {
        state.tenderBids[tenderId] = state.tenderBids[tenderId].filter(bid => bid._id !== bidId);
      });
      
      // Clear current bid if it matches
      if (state.currentBid && state.currentBid._id === bidId) {
        state.currentBid = null;
      }
    },
    addBidToTenderList: (state, action) => {
      const { tenderId, bid } = action.payload;
      if (!state.tenderBids[tenderId]) {
        state.tenderBids[tenderId] = [];
      }
      state.tenderBids[tenderId].push(bid);
    },
    clearTenderBids: (state, action) => {
      const tenderId = action.payload;
      delete state.tenderBids[tenderId];
      delete state.tenderBidStats[tenderId];
    },
    setBidEligibility: (state, action) => {
      const { tenderId, eligibility } = action.payload;
      state.bidEligibility[tenderId] = eligibility;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tender Bids
      .addCase(fetchTenderBids.pending, (state) => {
        state.tenderBidsLoading = true;
        state.tenderBidsError = null;
      })
      .addCase(fetchTenderBids.fulfilled, (state, action) => {
        state.tenderBidsLoading = false;
        const { tenderId, bids } = action.payload;
        state.tenderBids[tenderId] = bids;
      })
      .addCase(fetchTenderBids.rejected, (state, action) => {
        state.tenderBidsLoading = false;
        state.tenderBidsError = action.payload;
      })
      
      // Fetch My Bids
      .addCase(fetchMyBids.pending, (state) => {
        state.myBidsLoading = true;
        state.myBidsError = null;
      })
      .addCase(fetchMyBids.fulfilled, (state, action) => {
        state.myBidsLoading = false;
        state.myBids = action.payload.bids || action.payload;
        if (action.payload.pagination) {
          state.myBidsPagination = action.payload.pagination;
        }
      })
      .addCase(fetchMyBids.rejected, (state, action) => {
        state.myBidsLoading = false;
        state.myBidsError = action.payload;
      })
      
      // Fetch Bid by ID
      .addCase(fetchBidById.pending, (state) => {
        state.bidDetailsLoading = true;
        state.bidDetailsError = null;
      })
      .addCase(fetchBidById.fulfilled, (state, action) => {
        state.bidDetailsLoading = false;
        state.currentBid = action.payload;
      })
      .addCase(fetchBidById.rejected, (state, action) => {
        state.bidDetailsLoading = false;
        state.bidDetailsError = action.payload;
      })
      
      // Submit Bid
      .addCase(submitBid.pending, (state) => {
        state.bidActionLoading = true;
        state.bidActionError = null;
      })
      .addCase(submitBid.fulfilled, (state, action) => {
        state.bidActionLoading = false;
        const newBid = action.payload;
        
        // Add to myBids
        state.myBids.unshift(newBid);
        
        // Add to tender bids if we have that tender's bids loaded
        if (state.tenderBids[newBid.tender]) {
          state.tenderBids[newBid.tender].push(newBid);
        }
      })
      .addCase(submitBid.rejected, (state, action) => {
        state.bidActionLoading = false;
        state.bidActionError = action.payload;
      })
      
      // Update Bid
      .addCase(updateBid.pending, (state) => {
        state.bidActionLoading = true;
        state.bidActionError = null;
      })
      .addCase(updateBid.fulfilled, (state, action) => {
        state.bidActionLoading = false;
        bidSlice.caseReducers.updateBidInList(state, { payload: action.payload });
      })
      .addCase(updateBid.rejected, (state, action) => {
        state.bidActionLoading = false;
        state.bidActionError = action.payload;
      })
      
      // Withdraw Bid
      .addCase(withdrawBid.pending, (state) => {
        state.bidActionLoading = true;
        state.bidActionError = null;
      })
      .addCase(withdrawBid.fulfilled, (state, action) => {
        state.bidActionLoading = false;
        bidSlice.caseReducers.updateBidInList(state, { payload: action.payload });
      })
      .addCase(withdrawBid.rejected, (state, action) => {
        state.bidActionLoading = false;
        state.bidActionError = action.payload;
      })
      
      // Delete Bid
      .addCase(deleteBid.pending, (state) => {
        state.bidActionLoading = true;
        state.bidActionError = null;
      })
      .addCase(deleteBid.fulfilled, (state, action) => {
        state.bidActionLoading = false;
        bidSlice.caseReducers.removeBidFromList(state, { payload: action.payload });
      })
      .addCase(deleteBid.rejected, (state, action) => {
        state.bidActionLoading = false;
        state.bidActionError = action.payload;
      })
      
      // Award Bid
      .addCase(awardBid.pending, (state) => {
        state.bidActionLoading = true;
        state.bidActionError = null;
      })
      .addCase(awardBid.fulfilled, (state, action) => {
        state.bidActionLoading = false;
        bidSlice.caseReducers.updateBidInList(state, { payload: action.payload });
      })
      .addCase(awardBid.rejected, (state, action) => {
        state.bidActionLoading = false;
        state.bidActionError = action.payload;
      })
      
      // Reject Bid
      .addCase(rejectBid.pending, (state) => {
        state.bidActionLoading = true;
        state.bidActionError = null;
      })
      .addCase(rejectBid.fulfilled, (state, action) => {
        state.bidActionLoading = false;
        bidSlice.caseReducers.updateBidInList(state, { payload: action.payload });
      })
      .addCase(rejectBid.rejected, (state, action) => {
        state.bidActionLoading = false;
        state.bidActionError = action.payload;
      })
      
      // Check Bid Eligibility
      .addCase(checkBidEligibility.pending, (state) => {
        state.eligibilityLoading = true;
        state.eligibilityError = null;
      })
      .addCase(checkBidEligibility.fulfilled, (state, action) => {
        state.eligibilityLoading = false;
        const { tenderId, eligibility } = action.payload;
        state.bidEligibility[tenderId] = eligibility;
      })
      .addCase(checkBidEligibility.rejected, (state, action) => {
        state.eligibilityLoading = false;
        state.eligibilityError = action.payload;
      })
      
      // Fetch Tender Bid Stats
      .addCase(fetchTenderBidStats.pending, (state) => {
        state.bidStatsLoading = true;
        state.bidStatsError = null;
      })
      .addCase(fetchTenderBidStats.fulfilled, (state, action) => {
        state.bidStatsLoading = false;
        const { tenderId, stats } = action.payload;
        state.tenderBidStats[tenderId] = stats;
      })
      .addCase(fetchTenderBidStats.rejected, (state, action) => {
        state.bidStatsLoading = false;
        state.bidStatsError = action.payload;
      });
  },
});

export const {
  clearError,
  clearCurrentBid,
  updateBidInList,
  removeBidFromList,
  addBidToTenderList,
  clearTenderBids,
  setBidEligibility,
} = bidSlice.actions;

// Selectors
export const selectBids = (state) => state.bids;
export const selectMyBids = (state) => state.bids.myBids;
export const selectTenderBids = (tenderId) => (state) => state.bids.tenderBids[tenderId] || [];
export const selectCurrentBid = (state) => state.bids.currentBid;
export const selectTenderBidStats = (tenderId) => (state) => state.bids.tenderBidStats[tenderId];
export const selectBidEligibility = (tenderId) => (state) => state.bids.bidEligibility[tenderId];
export const selectMyBidsLoading = (state) => state.bids.myBidsLoading;
export const selectTenderBidsLoading = (state) => state.bids.tenderBidsLoading;
export const selectBidActionLoading = (state) => state.bids.bidActionLoading;
export const selectBidDetailsLoading = (state) => state.bids.bidDetailsLoading;
export const selectMyBidsError = (state) => state.bids.myBidsError;
export const selectBidActionError = (state) => state.bids.bidActionError;

export default bidSlice.reducer;
