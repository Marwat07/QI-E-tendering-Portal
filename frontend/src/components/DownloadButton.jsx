import React, { useState } from 'react';
import apiService from '../services/api';
import './DownloadButton.css';

const DownloadButton = ({ 
  tenderId, 
  documentId, 
  filename, 
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  showIcon = true,
  disabled = false,
  ...props 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDownloading || disabled) return;

    try {
      setIsDownloading(true);
      setError(null);
      
      // Try downloading with the enhanced API method
      await apiService.tenders.downloadDocument(tenderId, documentId, filename, children);
      
      // Optional success feedback
      console.log('Document downloaded successfully');
      
    } catch (err) {
      console.error('Download failed:', err);
      const errorMessage = err.message.includes('File may not exist') 
        ? 'File not found or has been removed.' 
        : 'Failed to download document. Please try again.';
      setError(errorMessage);
      
      // Auto-clear error after 5 seconds for better user experience
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  const getButtonClass = () => {
    const baseClass = 'download-btn';
    const variantClass = `download-btn--${variant}`;
    const sizeClass = `download-btn--${size}`;
    const stateClass = isDownloading ? 'download-btn--loading' : '';
    const errorClass = error ? 'download-btn--error' : '';
    const disabledClass = disabled ? 'download-btn--disabled' : '';
    
    return [baseClass, variantClass, sizeClass, stateClass, errorClass, disabledClass, className]
      .filter(Boolean)
      .join(' ');
  };

  const renderContent = () => {
    if (isDownloading) {
      return (
        <>
          <span className="download-spinner" aria-hidden="true"></span>
          <span>Downloading...</span>
        </>
      );
    }

    if (error) {
      return (
        <>
          {showIcon && <span className="download-icon download-icon--error" aria-hidden="true">⚠️</span>}
          <span>Retry Download</span>
        </>
      );
    }

    return (
      <>
        {showIcon && <span className="download-icon" aria-hidden="true">📄</span>}
        <span>{children || 'Download'}</span>
      </>
    );
  };

  return (
    <button
      type="button"
      className={getButtonClass()}
      onClick={handleDownload}
      disabled={isDownloading || disabled}
      title={error || (filename ? `Download ${filename}` : 'Download document')}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default DownloadButton;
