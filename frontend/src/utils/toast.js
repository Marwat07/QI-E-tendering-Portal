import { toast } from 'react-toastify';

// Centralized toast notification utility
export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  error: (message, options = {}) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  warning: (message, options = {}) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  info: (message, options = {}) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  // Specific toast notifications for common actions
  loginSuccess: () => {
    showToast.success('Login successful! Welcome back.');
  },

  loginError: (message = 'Login failed. Please try again.') => {
    showToast.error(message);
  },

  registerSuccess: () => {
    showToast.success('Registration successful! Please check your email for verification.');
  },

  registerError: (message = 'Registration failed. Please try again.') => {
    showToast.error(message);
  },

  logoutSuccess: () => {
    showToast.info('You have been logged out successfully.');
  },

  tenderCreated: () => {
    showToast.success('Tender created successfully!');
  },

  tenderUpdated: () => {
    showToast.success('Tender updated successfully!');
  },

  fileUploaded: (count = 1) => {
    showToast.success(`${count} file(s) uploaded successfully!`, { autoClose: 2000 });
  },

  fileRemoved: (fileName) => {
    showToast.info(`File "${fileName}" removed`, { autoClose: 2000 });
  },

  downloadStarted: () => {
    showToast.success('Download started successfully!', { autoClose: 2000 });
  },

  downloadError: () => {
    showToast.error('Unable to download documents. Please try again.');
  },

  serverError: () => {
    showToast.error('Server error. Please try again later.');
  },

  networkError: () => {
    showToast.error('Network error. Please check your connection and try again.');
  },

  validationError: (message = 'Please check your input and try again.') => {
    showToast.error(message);
  },

  unauthorized: () => {
    showToast.error('You are not authorized to perform this action.');
  },

  sessionExpired: () => {
    showToast.warning('Your session has expired. Please login again.');
  },

  // Bid-related toast notifications
  bidSubmitted: () => {
    showToast.success('Your bid has been submitted successfully!', { autoClose: 4000 });
  },

  bidUpdated: () => {
    showToast.success('Your bid has been updated successfully!', { autoClose: 4000 });
  },

  bidWithdrawn: () => {
    showToast.info('Your bid has been withdrawn successfully.', { autoClose: 4000 });
  },

  bidSubmissionError: (message = 'Failed to submit bid. Please try again.') => {
    showToast.error(message);
  },

  bidUpdateError: (message = 'Failed to update bid. Please try again.') => {
    showToast.error(message);
  },

  bidWithdrawError: (message = 'Failed to withdraw bid. Please try again.') => {
    showToast.error(message);
  },

  confirmBidWithdraw: () => {
    showToast.warning('Are you sure you want to withdraw this bid? This action cannot be undone.', { autoClose: 6000 });
  },

  filesSelected: (count) => {
    showToast.success(`${count} file(s) selected for upload`, { autoClose: 2000 });
  },

  fileValidationError: (message) => {
    showToast.error(message);
  },

  proposalTooShort: () => {
    showToast.error('Proposal must be at least 100 characters long.');
  },

  requiredFieldsError: () => {
    showToast.error('Please fill in all required fields (Amount and Proposal).');
  },

  // Tender management specific notifications
  tenderArchived: (tenderTitle) => {
    showToast.success(`Tender "${tenderTitle}" has been archived successfully!`, {
      autoClose: 4000
    });
  },

  tenderArchiveError: (message = 'Failed to archive tender. Please try again.') => {
    showToast.error(message);
  },

  tenderDeleted: (tenderTitle) => {
    showToast.success(`Tender "${tenderTitle}" has been permanently deleted.`, {
      autoClose: 4000
    });
  },

  tenderDeleteError: (message = 'Failed to delete tender. Please try again.') => {
    showToast.error(message);
  },

  tenderDeleteWarning: (tenderTitle, bidCount = 0) => {
    const message = bidCount > 0 
      ? `⚠️ Warning: Deleting "${tenderTitle}" will also delete ${bidCount} bid${bidCount > 1 ? 's' : ''}!`
      : `⚠️ You are about to permanently delete "${tenderTitle}".`;
    showToast.warning(`${message} This action cannot be undone.`, {
      autoClose: 6000
    });
  },

  tenderArchiveWarning: (tenderTitle) => {
    showToast.info(`Archiving "${tenderTitle}" will hide it from active listings but preserve all data.`, {
      autoClose: 5000
    });
  },

  tenderUnarchived: (tenderTitle) => {
    showToast.success(`Tender "${tenderTitle}" has been unarchived and restored to active status!`, {
      autoClose: 4000
    });
  },

  tenderUnarchiveError: (message = 'Failed to unarchive tender. Please try again.') => {
    showToast.error(message);
  },

  tenderUnarchiveWarning: (tenderTitle) => {
    showToast.info(`Unarchiving "${tenderTitle}" will restore it to active listings and make it visible to vendors.`, {
      autoClose: 5000
    });
  }
};

export default showToast;
