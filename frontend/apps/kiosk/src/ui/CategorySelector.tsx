// /home/ubuntu/pos-modern/src/kiosk/ui/CategorySelector.tsx

import React, { useRef, useEffect } from 'react';

interface Category {
  id: string | number;
  name: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string | number;
  onSelectCategory: (categoryId: string | number) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (selectedButtonRef.current && selectorRef.current) {
      const container = selectorRef.current;
      const button = selectedButtonRef.current;

      const scrollLeft =
        button.offsetLeft - container.clientWidth / 2 + button.clientWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [selectedCategory]);

  return (
    <div className="category-selector" ref={selectorRef}>
      {categories.map((category) => (
        <button
          key={category.id}
          className={`category-button ${
            selectedCategory === category.id ? 'selected' : ''
          }`}
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
