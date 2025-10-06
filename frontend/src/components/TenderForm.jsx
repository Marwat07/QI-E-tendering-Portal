import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import tenderService from '../services/tender';
import './TenderForm.css';

// Validation schema
const tenderValidationSchema = Yup.object({
  title: Yup.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters')
    .required('Title is required'),
  description: Yup.string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .required('Description is required'),
  category: Yup.string()
    .required('Category is required'),
  estimatedBudget: Yup.number()
    .positive('Budget must be positive')
    .nullable()
    .notRequired(),
  currency: Yup.string()
    .notRequired(),
  submissionDeadline: Yup.date()
    .min(new Date(), 'Deadline must be in the future')
    .required('Submission deadline is required'),
  requirements: Yup.array()
    .of(Yup.string().required('Requirement cannot be empty'))
    .min(1, 'At least one requirement is needed'),
  evaluationCriteria: Yup.array()
    .of(Yup.object({
      criterion: Yup.string().required('Criterion is required'),
      weight: Yup.number()
        .min(1, 'Weight must be at least 1')
        .max(100, 'Weight cannot exceed 100')
        .required('Weight is required')
    }))
    .min(1, 'At least one evaluation criterion is needed'),
  qualificationCriteria: Yup.string()
    .required('Qualification criteria is required'),
  termsAndConditions: Yup.string()
    .required('Terms and conditions are required'),
});

const TenderForm = ({ tender = null, onSubmit, onCancel }) => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Load categories dynamically from API
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          const cats = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.categories) ? data.data.categories : (Array.isArray(data?.categories) ? data.categories : []));
          setCategories(cats.map(cat => cat.name)); // Extract names for backward compatibility
        } else {
          // Fallback to default categories if API fails
          setCategories([
            'Construction & Infrastructure',
            'Information Technology',
            'Healthcare & Medical', 
            'Transportation & Logistics',
            'Professional Services',
            'Supplies & Equipment',
            'Energy & Utilities',
            'Education & Training',
            'Other'
          ]);
        }
      } catch (error) {
        console.warn('Failed to load categories, using defaults:', error);
        // Fallback to default categories
        setCategories([
          'Construction & Infrastructure',
          'Information Technology',
          'Healthcare & Medical', 
          'Transportation & Logistics',
          'Professional Services',
          'Supplies & Equipment',
          'Energy & Utilities',
          'Education & Training',
          'Other'
        ]);
      }
    };
    loadCategories();
  }, []);

  // Initial values
  const initialValues = {
    title: tender?.title || '',
    description: tender?.description || '',
    category: tender?.category || '',
    estimatedBudget: tender?.estimatedBudget || '',
    currency: tender?.currency || 'PKR',
    submissionDeadline: tender?.submissionDeadline 
      ? new Date(tender.submissionDeadline).toISOString().slice(0, 16)
      : '',
    requirements: tender?.requirements || [''],
    evaluationCriteria: tender?.evaluationCriteria || [{ criterion: '', weight: '' }],
    qualificationCriteria: tender?.qualificationCriteria || '',
    termsAndConditions: tender?.termsAndConditions || '',
  };

  // File upload with react-dropzone
  const onDrop = (acceptedFiles) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    if (acceptedFiles.length > 0) {
      toast.success(`${acceptedFiles.length} file(s) uploaded successfully!`, {
        position: 'top-right',
        autoClose: 2000,
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeFile = (index) => {
    const fileName = uploadedFiles[index]?.name;
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.info(`File "${fileName}" removed`, {
      position: 'top-right',
      autoClose: 2000,
    });
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add form fields
      Object.keys(values).forEach(key => {
        if (key === 'requirements' || key === 'evaluationCriteria') {
          formData.append(key, JSON.stringify(values[key]));
        } else {
          formData.append(key, values[key]);
        }
      });

      // Add files
      uploadedFiles.forEach(file => {
        formData.append('documents', file);
      });

      // Submit to API
      let response;
      if (tender) {
        response = await apiService.tenders.update(tender.id, formData);
      } else {
        response = await apiService.tenders.create(formData);
      }

      // Show success notification
      toast.success(tender ? 'Tender updated successfully!' : 'Tender created successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });

      if (onSubmit) {
        onSubmit(response);
      } else {
        // Default navigation after successful submission
        navigate('/tenders/manage');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to save tender';
      setSubmitError(errorMessage);
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const currencies = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AUD', 'CAD'];


  // Load existing tender if editing
  React.useEffect(() => {
    if (id && !tender) {
      // Fetch tender data for editing
      const fetchTender = async () => {
        try {
          const tenderData = await tenderService.getTenderById(id);
          // Update initial values or set tender data
        } catch (error) {
          console.error('Error fetching tender:', error);
          toast.error('Failed to load tender data', {
            position: 'top-right',
            autoClose: 4000,
          });
        }
      };
      fetchTender();
    }
  }, [id, tender]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/tenders/manage');
    }
  };

  return (
    <div className="tender-form-page">
      <div className="container">
        <div className="form-header">
          <h1>{tender || id ? 'Edit Tender' : 'Create New Tender'}</h1>
          <p>Fill in the details below to {tender || id ? 'update' : 'create'} your tender.</p>
        </div>
        
        <div className="form-container">
      <Formik
        initialValues={initialValues}
        validationSchema={tenderValidationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, setFieldValue }) => (
          <Form className="tender-form">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="compact-grid-2">
                <div className="field-group">
                  <label>Tender Title *</label>
                  <Field
                    name="title"
                    type="text"
                    placeholder="Enter tender title"
                  />
                  <ErrorMessage name="title" component="div" className="error-message" />
                </div>

                <div className="field-group">
                  <label>Category *</label>
                  <Field name="category" as="select">
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Field>
                  <ErrorMessage name="category" component="div" className="error-message" />
                </div>
              </div>

              <div className="field-group">
                <label>Description *</label>
                <Field
                  name="description"
                  as="textarea"
                  className="compact-textarea"
                  placeholder="Detailed description of the tender"
                />
                <ErrorMessage name="description" component="div" className="error-message" />
              </div>

              <div className="compact-grid-3">
                <div className="field-group">
                  <label>Estimated Budget (Optional)</label>
                  <Field
                    name="estimatedBudget"
                    type="number"
                    placeholder="0.00 (optional)"
                  />
                  <ErrorMessage name="estimatedBudget" component="div" className="error-message" />
                </div>

                <div className="field-group">
                  <label>Currency (Optional)</label>
                  <Field name="currency" as="select">
                    <option value="">Select currency (optional)</option>
                    {currencies.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </Field>
                  <ErrorMessage name="currency" component="div" className="error-message" />
                </div>

                <div className="field-group">
                  <label>Submission Deadline *</label>
                  <Field
                    name="submissionDeadline"
                    type="datetime-local"
                  />
                  <ErrorMessage name="submissionDeadline" component="div" className="error-message" />
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="form-section">
              <h3>Requirements</h3>
              
              <FieldArray name="requirements">
                {({ push, remove }) => (
                  <div>
                    {values.requirements.map((_, index) => (
                      <div key={index} className="dynamic-field-row">
                        <Field
                          name={`requirements[${index}]`}
                          type="text"
                          placeholder={`Requirement ${index + 1}`}
                        />
                        {values.requirements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="remove-btn"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => push('')}
                      className="add-btn"
                    >
                      Add Requirement
                    </button>
                  </div>
                )}
              </FieldArray>
              <ErrorMessage name="requirements" component="div" className="error-message" />
            </div>

            {/* Evaluation Criteria */}
            <div className="form-section">
              <h3>Evaluation Criteria</h3>
              
              <FieldArray name="evaluationCriteria">
                {({ push, remove }) => (
                  <div>
                    {values.evaluationCriteria.map((_, index) => (
                      <div key={index} className="dynamic-field-row">
                        <Field
                          name={`evaluationCriteria[${index}].criterion`}
                          type="text"
                          placeholder="Evaluation criterion"
                        />
                        <Field
                          name={`evaluationCriteria[${index}].weight`}
                          type="number"
                          className="weight-input"
                          placeholder="Weight %"
                        />
                        {values.evaluationCriteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="remove-btn"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => push({ criterion: '', weight: '' })}
                      className="add-btn"
                    >
                      Add Criterion
                    </button>
                  </div>
                )}
              </FieldArray>
            </div>

            {/* Additional Information */}
            <div className="form-section">
              <h3>Additional Information</h3>
              
              <div className="field-group">
                <label>Qualification Criteria *</label>
                <Field
                  name="qualificationCriteria"
                  as="textarea"
                  className="compact-textarea"
                  placeholder="Required qualifications and eligibility criteria"
                />
                <ErrorMessage name="qualificationCriteria" component="div" className="error-message" />
              </div>

              <div className="field-group">
                <label>Terms and Conditions *</label>
                <Field
                  name="termsAndConditions"
                  as="textarea"
                  className="compact-textarea"
                  placeholder="Terms and conditions for bidding"
                />
                <ErrorMessage name="termsAndConditions" component="div" className="error-message" />
              </div>
            </div>

            {/* File Upload */}
            <div className="form-section">
              <h3>Documents</h3>
              
              <div
                {...getRootProps()}
                className={`file-upload-area ${isDragActive ? 'active' : ''}`}
              >
                <input {...getInputProps()} />
                <p className="text-lg mb-2">📁</p>
                {isDragActive ? (
                  <p className="main-text">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="main-text">Drag & drop files here, or click to select files</p>
                    <p className="sub-text">Supported: PDF, DOC, DOCX, XLS, XLSX, Images (Max 10MB each)</p>
                  </div>
                )}
              </div>

              {uploadedFiles.length > 0 && (
                <div className="uploaded-files">
                  <h4>Uploaded Files:</h4>
                  <div>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="error-banner">
                {submitError}
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="cancel-btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? 'Saving...' : (tender ? 'Update Tender' : 'Create Tender')}
              </button>
            </div>
          </Form>
        )}
      </Formik>
        </div>
        
        <div className="back-to-home">
          <button 
            onClick={() => navigate('/tenders/manage')} 
            className="btn btn-secondary"
          >
            ← Back to My Tenders
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenderForm;
