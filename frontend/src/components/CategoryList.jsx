import React, { useState } from 'react';
import './CategoryList.css';

const CategoryList = ({ 
  categories, 
  maxVisible = 2, 
  className = '', 
  showAsButtons = false,
  compact = false 
}) => {
  const [showAll, setShowAll] = useState(false);

  // Handle different input formats
  let categoryArray = [];
  
  if (Array.isArray(categories)) {
    categoryArray = categories;
  } else if (typeof categories === 'string') {
    categoryArray = categories.split(',').map(cat => cat.trim()).filter(cat => cat);
  } else if (categories) {
    categoryArray = [String(categories)];
  }

  // Remove empty categories and duplicates
  categoryArray = [...new Set(categoryArray.filter(cat => cat && cat.trim()))];

  if (categoryArray.length === 0) {
    return <span className="category-none">No categories</span>;
  }

  if (categoryArray.length === 1) {
    return (
      <span className={`category-single ${className}`}>
        {showAsButtons ? (
          <span className="category-button single">{categoryArray[0]}</span>
        ) : (
          categoryArray[0]
        )}
      </span>
    );
  }

  const visibleCategories = showAll ? categoryArray : categoryArray.slice(0, maxVisible);
  const hiddenCount = categoryArray.length - maxVisible;

  return (
    <div className={`category-list ${compact ? 'compact' : ''} ${className}`}>
      <div className="category-items">
        {visibleCategories.map((category, index) => (
          <span 
            key={index}
            className={`category-item ${showAsButtons ? 'category-button' : 'category-badge'}`}
            title={category}
          >
            {category}
          </span>
        ))}
        
        {!showAll && hiddenCount > 0 && (
          <span 
            className="category-more"
            onClick={() => setShowAll(true)}
            title={`Show ${hiddenCount} more categories: ${categoryArray.slice(maxVisible).join(', ')}`}
          >
            +{hiddenCount} more...
          </span>
        )}
        
        {showAll && categoryArray.length > maxVisible && (
          <span 
            className="category-less"
            onClick={() => setShowAll(false)}
          >
            show less
          </span>
        )}
      </div>
    </div>
  );
};

export default CategoryList;