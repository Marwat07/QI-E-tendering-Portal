import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBid, selectBidActionLoading, selectBidActionError } from '../store/slices/bidSlice';
import { showToast } from '../utils/toast';
import './BidUpdateModal.css';

const BidUpdateModal = ({ bid, isOpen, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading = useSelector(selectBidActionLoading);
  const error = useSelector(selectBidActionError);
  
  const [formData, setFormData] = useState({
    amount: '',
    proposal: '',
    delivery_timeline: '',
    attachments: []
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (bid && isOpen) {
      setFormData({
        amount: bid.amount || '',
        proposal: bid.proposal || '',
        delivery_timeline: bid.delivery_timeline || '',
        attachments: bid.attachments || []
      });
      setErrors({});
    }
  }, [bid, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Please enter a valid bid amount';
    }
    
    if (!formData.proposal || formData.proposal.trim().length < 50) {
      newErrors.proposal = 'Proposal must be at least 50 characters long';
    }
    
    if (!formData.delivery_timeline || formData.delivery_timeline.trim().length < 5) {
      newErrors.delivery_timeline = 'Please provide delivery timeline';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast.validationError('Please fix the form errors before submitting.');
      return;
    }

    try {
      await dispatch(updateBid({ 
        id: bid.id, 
        bidData: {
          ...formData,
          amount: parseFloat(formData.amount)
        }
      })).unwrap();
      
      showToast.bidUpdated();
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast.bidUpdateError(error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bid-update-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Bid</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="tender-info">
            <h3>{bid?.tender_title}</h3>
            <p className="tender-meta">
              Original submission: {new Date(bid?.submitted_at).toLocaleDateString()}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="bid-update-form">
            <div className="form-group">
              <label htmlFor="amount">
                Bid Amount <span className="required">*</span>
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={errors.amount ? 'error' : ''}
                placeholder="Enter your bid amount"
              />
              {errors.amount && <span className="error-message">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="proposal">
                Proposal <span className="required">*</span>
              </label>
              <textarea
                id="proposal"
                rows="6"
                value={formData.proposal}
                onChange={(e) => handleInputChange('proposal', e.target.value)}
                className={errors.proposal ? 'error' : ''}
                placeholder="Describe your proposal, methodology, and approach..."
              />
              <div className="char-count">
                {formData.proposal.length} characters
              </div>
              {errors.proposal && <span className="error-message">{errors.proposal}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="delivery_timeline">
                Delivery Timeline <span className="required">*</span>
              </label>
              <input
                type="text"
                id="delivery_timeline"
                value={formData.delivery_timeline}
                onChange={(e) => handleInputChange('delivery_timeline', e.target.value)}
                className={errors.delivery_timeline ? 'error' : ''}
                placeholder="e.g., 30 days, 2 weeks, etc."
              />
              {errors.delivery_timeline && <span className="error-message">{errors.delivery_timeline}</span>}
            </div>
          </form>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Bid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidUpdateModal;
