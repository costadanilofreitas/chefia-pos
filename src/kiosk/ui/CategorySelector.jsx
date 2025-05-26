// /home/ubuntu/pos-modern/src/kiosk/ui/CategorySelector.jsx

import React, { useRef, useEffect } from 'react';

const CategorySelector = ({ categories, selectedCategory, onSelectCategory }) => {
  const selectorRef = useRef(null);
  const selectedButtonRef = useRef(null);

  // Scroll to selected category when it changes
  useEffect(() => {
    if (selectedButtonRef.current && selectorRef.current) {
      const container = selectorRef.current;
      const button = selectedButtonRef.current;
      
      // Calculate scroll position to center the button
      const scrollLeft = button.offsetLeft - (container.clientWidth / 2) + (button.clientWidth / 2);
      
      // Smooth scroll to the position
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [selectedCategory]);

  return (
    <div className="category-selector" ref={selectorRef}>
      {categories.map(category => (
        <button
          key={category.id}
          className={`category-button ${selectedCategory === category.id ? 'selected' : ''}`}
          onClick={() => onSelectCategory(category.id)}
          ref={selectedCategory === category.id ? selectedButtonRef : null}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default CategorySelector;
