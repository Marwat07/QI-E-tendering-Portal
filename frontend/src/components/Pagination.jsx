import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import './Pagination.css';

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showTotalItems = true,
  itemsPerPageOptions = [5, 10, 15, 25, 50],
  className = ''
}) => {
  // Generate page numbers to display
  const generatePageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 3) {
        // Show first few pages
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show last few pages
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show pages around current page
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    const newTotalPages = Math.ceil(totalItems / newItemsPerPage);
    const newCurrentPage = Math.min(currentPage, newTotalPages);
    
    onItemsPerPageChange(newItemsPerPage);
    if (newCurrentPage !== currentPage) {
      onPageChange(newCurrentPage);
    }
  };

  // Calculate start and end item numbers for display
  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1 && !showTotalItems) {
    return null; // Don't show pagination if there's only one page
  }

  return (
    <div className={`pagination-container ${className}`}>
      {showTotalItems && (
        <div className="pagination-info">
          <span className="pagination-text">
            Showing {startItem} to {endItem} of {totalItems} results
          </span>
        </div>
      )}
      
      <div className="pagination-controls">
        {showItemsPerPage && (
          <div className="items-per-page">
            <label htmlFor="items-per-page" className="pagination-label">
              Items per page:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="items-per-page-select"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="pagination-buttons">
            {/* First page button */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            
            {/* Previous page button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            
            {/* Page number buttons */}
            <div className="page-numbers">
              {generatePageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`page-number-btn ${
                        currentPage === page ? 'active' : ''
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Next page button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            
            {/* Last page button */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
