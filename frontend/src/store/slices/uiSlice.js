import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Theme
  theme: 'light',
  
  // Sidebar/Navigation
  sidebarOpen: false,
  
  // Modals
  modals: {
    loginModal: false,
    registerModal: false,
    bidSubmissionModal: false,
    tenderCreateModal: false,
    tenderEditModal: false,
    profileEditModal: false,
    confirmDialog: false,
  },
  
  // Current modal data
  modalData: null,
  
  // Notifications/Toast
  notifications: [],
  
  // Loading overlay
  globalLoading: false,
  
  // Filters and UI preferences
  preferences: {
    itemsPerPage: 10,
    defaultView: 'grid', // or 'list'
    sortOrder: 'desc',
    sortBy: 'createdAt',
  },
  
  // Search and filter panels
  searchPanelOpen: false,
  filterPanelOpen: false,
  
  // Current page/section
  currentPage: 'home',
  breadcrumb: [],
  
  // Mobile responsiveness
  isMobile: false,
  screenSize: 'desktop', // mobile, tablet, desktop
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    
    // Sidebar
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    // Modals
    openModal: (state, action) => {
      const { modalName, data } = action.payload;
      state.modals[modalName] = true;
      if (data) {
        state.modalData = data;
      }
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      state.modals[modalName] = false;
      if (!Object.values(state.modals).some(isOpen => isOpen)) {
        state.modalData = null;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modalName => {
        state.modals[modalName] = false;
      });
      state.modalData = null;
    },
    
    // Notifications
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Keep only last 10 notifications
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(0, 10);
      }
    },
    removeNotification: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.filter(notification => notification.id !== id);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Global loading
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },
    
    // Preferences
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    setItemsPerPage: (state, action) => {
      state.preferences.itemsPerPage = action.payload;
    },
    setDefaultView: (state, action) => {
      state.preferences.defaultView = action.payload;
    },
    setSortOrder: (state, action) => {
      state.preferences.sortOrder = action.payload;
    },
    setSortBy: (state, action) => {
      state.preferences.sortBy = action.payload;
    },
    
    // Search and filter panels
    setSearchPanelOpen: (state, action) => {
      state.searchPanelOpen = action.payload;
    },
    toggleSearchPanel: (state) => {
      state.searchPanelOpen = !state.searchPanelOpen;
    },
    setFilterPanelOpen: (state, action) => {
      state.filterPanelOpen = action.payload;
    },
    toggleFilterPanel: (state) => {
      state.filterPanelOpen = !state.filterPanelOpen;
    },
    
    // Navigation
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setBreadcrumb: (state, action) => {
      state.breadcrumb = action.payload;
    },
    
    // Screen size
    setScreenSize: (state, action) => {
      state.screenSize = action.payload;
      state.isMobile = action.payload === 'mobile';
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  openModal,
  closeModal,
  closeAllModals,
  addNotification,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
  updatePreferences,
  setItemsPerPage,
  setDefaultView,
  setSortOrder,
  setSortBy,
  setSearchPanelOpen,
  toggleSearchPanel,
  setFilterPanelOpen,
  toggleFilterPanel,
  setCurrentPage,
  setBreadcrumb,
  setScreenSize,
} = uiSlice.actions;

// Selectors
export const selectUI = (state) => state.ui;
export const selectTheme = (state) => state.ui.theme;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectModals = (state) => state.ui.modals;
export const selectModalData = (state) => state.ui.modalData;
export const selectNotifications = (state) => state.ui.notifications;
export const selectGlobalLoading = (state) => state.ui.globalLoading;
export const selectPreferences = (state) => state.ui.preferences;
export const selectSearchPanelOpen = (state) => state.ui.searchPanelOpen;
export const selectFilterPanelOpen = (state) => state.ui.filterPanelOpen;
export const selectCurrentPage = (state) => state.ui.currentPage;
export const selectBreadcrumb = (state) => state.ui.breadcrumb;
export const selectIsMobile = (state) => state.ui.isMobile;
export const selectScreenSize = (state) => state.ui.screenSize;

// Helper action creators
export const showSuccessNotification = (message, title = 'Success') => 
  addNotification({ type: 'success', title, message });

export const showErrorNotification = (message, title = 'Error') => 
  addNotification({ type: 'error', title, message });

export const showWarningNotification = (message, title = 'Warning') => 
  addNotification({ type: 'warning', title, message });

export const showInfoNotification = (message, title = 'Info') => 
  addNotification({ type: 'info', title, message });

export default uiSlice.reducer;
