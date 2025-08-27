import React, { memo } from 'react';

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
}

const CategorySelectorComponent: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  className = ''
}) => {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 ${className}`}>
      <button
        onClick={() => onSelectCategory('all')}
        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
          selectedCategory === 'all'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <span className="mr-2">📦</span>{' '}
        Todos
      </button>
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === category.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {category.icon && <span className="mr-2">{category.icon}</span>}
          {category.name}
        </button>
      ))}
    </div>
  );
};

export const CategorySelector = memo(CategorySelectorComponent);
export default CategorySelector;