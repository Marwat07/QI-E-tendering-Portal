import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Register.css';
import './CreateUserModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [formData, setFormData] = useState({
    // Supplier Information
    company_name: '',
    phone: '',
    email: '',
    
    // Business Details
    business_registered_name: '',
    business_registered_address: '',
    national_tax_no: '',
    sales_tax_registration_no: '',
    role: 'vendor',
    category: 'Other',
    categories: ['Other'], // New field for multiple categories
    
    // Documents Checklist
    documents: {
      registration_form: false,
      financial_statements: false,
      business_license: false,
      distributorship_certificate: false,
      bank_statement: false,
      power_of_attorney: false,
      product_services_list: false
    }
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (res.ok) {
        const data = await res.json();
        const cats = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.categories) ? data.data.categories : (Array.isArray(data?.categories) ? data.categories : []));
        setAllCategories(cats);
      } else {
        // If API fails, use fallback categories
        setAllCategories(getFallbackCategories());
      }
    } catch (e) {
      console.warn('Failed to load categories for registration:', e);
      // If API fails, use fallback categories
      setAllCategories(getFallbackCategories());
    }
  };

  const getFallbackCategories = () => [
    { id: 1, name: 'Chemicals', description: 'Industrial chemicals, reagents, paints' },
    { id: 2, name: 'Textiles', description: 'Textiles, garments, and apparel' },
    { id: 3, name: 'Pharmaceuticals', description: 'Medical supplies, healthcare, pharmaceuticals' },
    { id: 4, name: 'Food & Beverages', description: 'Food, catering, and beverages' },
    { id: 5, name: 'Furniture', description: 'Office and general furniture' },
    { id: 6, name: 'Construction', description: 'Construction materials and services' },
    { id: 7, name: 'Electronics', description: 'Electronic equipment and components' },
    { id: 8, name: 'Automotive', description: 'Automotive parts and services' },
    { id: 9, name: 'Machinery', description: 'Industrial machinery and equipment' },
    { id: 10, name: 'Other', description: 'Miscellaneous services and products' }
  ];

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentChange = (documentKey, checked) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: checked
      }
    }));
  };

  const handleCategoryChange = (categoryValue, checked) => {
    setFormData(prev => {
      let updatedCategories = [...(prev.categories || [])];
      if (checked) {
        if (!updatedCategories.includes(categoryValue)) {
          updatedCategories.push(categoryValue);
        }
      } else {
        updatedCategories = updatedCategories.filter(cat => cat !== categoryValue);
      }
      return {
        ...prev,
        categories: updatedCategories,
        category: updatedCategories[0] || 'Other' // Keep first category for backward compatibility
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validation
      if (!formData.email || !formData.company_name || !formData.phone) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      if (!formData.categories || formData.categories.length === 0) {
        toast.error('Please select at least one business category');
        return;
      }
      
      // Check if at least 4 documents are selected
      const selectedDocuments = Object.values(formData.documents).filter(Boolean).length;
      if (selectedDocuments < 4) {
        toast.error('Please select at least 4 documents from the Documents Checklist');
        return;
      }
      
      // Prepare data for API
      const userData = {
        email: formData.email,
        company_name: formData.company_name,
        phone: formData.phone,
        address: formData.business_registered_address,
        role: formData.role,
        category: formData.category,
        categories: formData.categories, // Send the categories array
        tax_number: formData.national_tax_no,
        registration_number: formData.sales_tax_registration_no,
        business_registered_name: formData.business_registered_name
      };
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Registration successful! Please check your email for login credentials.');
        navigate('/login');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Registration failed`);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2 className="register-title">
            Register for E-Tendering
          </h2>
          <p className="register-subtitle">
            Already have an account?{' '}
            <Link to="/login">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="register-form-container">
          <form onSubmit={handleSubmit}>
            {/* Section 1: Supplier Information */}
            <div className="form-section">
              <h3 className="section-title">Section 1: Supplier Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Name of Company *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleFormChange('company_name', e.target.value)}
                    className="form-input"
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone No *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="form-input"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="form-input"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Section 2: Business Details (Legally binding) */}
            <div className="form-section">
              <h3 className="section-title">Section 2: Business Details (Legally binding)</h3>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Business Registered Name</label>
                  <input
                    type="text"
                    value={formData.business_registered_name}
                    onChange={(e) => handleFormChange('business_registered_name', e.target.value)}
                    className="form-input"
                    placeholder="Enter business registered name"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Business Registered Address</label>
                  <textarea
                    value={formData.business_registered_address}
                    onChange={(e) => handleFormChange('business_registered_address', e.target.value)}
                    className="form-input"
                    rows="2"
                    placeholder="Enter business registered address"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">National Tax No</label>
                  <input
                    type="text"
                    value={formData.national_tax_no}
                    onChange={(e) => handleFormChange('national_tax_no', e.target.value)}
                    className="form-input"
                    placeholder="Enter national tax number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sales Tax Registration No</label>
                  <input
                    type="text"
                    value={formData.sales_tax_registration_no}
                    onChange={(e) => handleFormChange('sales_tax_registration_no', e.target.value)}
                    className="form-input"
                    placeholder="Enter sales tax registration number"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div className="category-header">
                    <label className="form-label">Business Categories *</label>
                    {allCategories.length > 0 && (
                      <span className="category-count">
                        {allCategories.length} categories available
                      </span>
                    )}
                  </div>
                  <p className="category-help-text">
                    Select all business categories that apply to your company. You must select at least one category.
                  </p>
                  
                  {allCategories.length > 0 ? (
                    <div className="categories-section">
                      <div className="categories-checkbox-grid">
                        {allCategories.map(category => (
                        <div 
                          key={category.id} 
                          className={`category-checkbox-item ${
                            formData.categories?.includes(category.name) ? 'selected' : ''
                          }`}
                        >
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={formData.categories?.includes(category.name) || false}
                              onChange={(e) => handleCategoryChange(category.name, e.target.checked)}
                              className="checkbox-input"
                            />
                            <div className="category-info">
                              <span className="checkbox-text category-name">{category.name}</span>
                              {category.description && (
                                <span className="category-description">{category.description}</span>
                              )}
                            </div>
                          </label>
                        </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="categories-loading">
                      <div className="loading-spinner">
                        <div className="spinner"></div>
                      </div>
                      <p>Loading business categories...</p>
                    </div>
                  )}
                  
                  {formData.categories?.length > 0 && (
                    <div className="selected-categories-summary">
                      <span className="summary-label">Selected Categories:</span>
                      <div className="selected-categories-list">
                        {formData.categories.map((cat, index) => (
                          <span key={cat} className="selected-category-tag">
                            {cat}
                            {index < formData.categories.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Section 3: Documents Checklist */}
            <div className="form-section">
              <h3 className="section-title">Section 3: Documents Checklist</h3>
              <p className="documents-help-text">
                Please check at least 4 documents that you can provide. These are required for registration approval.
              </p>
              <div className="documents-grid">
                <div className="document-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.documents.registration_form}
                      onChange={(e) => handleDocumentChange('registration_form', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Completed and signed Registration form, Sales tax and NTN certificates</span>
                  </label>
                </div>
                
                <div className="document-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.documents.financial_statements}
                      onChange={(e) => handleDocumentChange('financial_statements', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Latest audited financial statements of last two years</span>
                  </label>
                </div>
                
                <div className="document-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.documents.business_license}
                      onChange={(e) => handleDocumentChange('business_license', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Copy of certificates and business license</span>
                  </label>
                </div>
                
                <div className="document-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.documents.distributorship_certificate}
                      onChange={(e) => handleDocumentChange('distributorship_certificate', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Copy of foreign distributorship certificate</span>
                  </label>
                </div>
                
                <div className="document-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.documents.bank_statement}
                      onChange={(e) => handleDocumentChange('bank_statement', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Last six months bank statement</span>
                  </label>
                </div>
                
                <div className="document-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.documents.power_of_attorney}
                      onChange={(e) => handleDocumentChange('power_of_attorney', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Original power of attorney of authorized signatories</span>
                  </label>
                </div>
                
              </div>
              
              {/* Document Counter */}
              <div className="document-counter">
                <div className={`counter-display ${
                  Object.values(formData.documents).filter(Boolean).length >= 4 ? 'complete' : 'incomplete'
                }`}>
                  <span className="counter-text">
                    Documents Selected: {Object.values(formData.documents).filter(Boolean).length}/4 minimum required
                  </span>
                  {Object.values(formData.documents).filter(Boolean).length >= 4 ? (
                    <span className="check-icon">✓</span>
                  ) : (
                    <span className="warning-icon">!</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Section */}
            <div className="form-section footer-section">
              <div className="footer-content">
                <p className="footer-company">QASWA Industries Pvt Ltd</p>
                <div className="footer-details">
                  <p><strong>Plot:</strong> Plot No: 56, 57 and 58 Special Economic Zone, Hattar</p>
                  <p><strong>Phone:</strong> +92 319 0508030</p>
                  <p><strong>Email:</strong> scm@qaswaindustries.com</p>
                </div>
                <div className="footer-notes">
                  <p><strong>Note:</strong> All pages of registration form and related documents must be signed and stamped by the authorized signatory</p>
                  <p><strong>Note:</strong> Please submit in original through registered mail / courier</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="register-buttons">
              <Link 
                to="/"
                className="btn btn-secondary"
                style={{ 
                  textDecoration: 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center'
                }}
              >
                Cancel
              </Link>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;