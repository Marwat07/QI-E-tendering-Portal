import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tenderReducer from './slices/tenderSlice';
import bidReducer from './slices/bidSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenders: tenderReducer,
    bids: bidReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: import.meta.env.MODE !== 'production',
});
