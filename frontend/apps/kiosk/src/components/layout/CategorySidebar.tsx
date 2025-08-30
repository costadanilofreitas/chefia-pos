import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Coffee, 
  Pizza, 
  Sandwich, 
  IceCream2, 
  Wine, 
  Salad,
  Beef,
  Fish,
  Package,
  Star
} from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  itemCount?: number;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  className?: string;
}

// Icon mapping for categories
const getCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('bebida') || lowerName.includes('drink')) return <Wine className="w-6 h-6" />;
  if (lowerName.includes('lanche') || lowerName.includes('burger')) return <Sandwich className="w-6 h-6" />;
  if (lowerName.includes('pizza')) return <Pizza className="w-6 h-6" />;
  if (lowerName.includes('sobremesa') || lowerName.includes('dessert')) return <IceCream2 className="w-6 h-6" />;
  if (lowerName.includes('salada') || lowerName.includes('salad')) return <Salad className="w-6 h-6" />;
  if (lowerName.includes('carne') || lowerName.includes('meat')) return <Beef className="w-6 h-6" />;
  if (lowerName.includes('peixe') || lowerName.includes('fish')) return <Fish className="w-6 h-6" />;
  if (lowerName.includes('café') || lowerName.includes('coffee')) return <Coffee className="w-6 h-6" />;
  if (lowerName.includes('destaque') || lowerName.includes('featured')) return <Star className="w-6 h-6" />;
  
  return <Package className="w-6 h-6" />;
};

// Get category color based on name or use default
const getCategoryColor = (name: string) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('bebida') || lowerName.includes('drink')) return 'bg-blue-500';
  if (lowerName.includes('lanche') || lowerName.includes('burger')) return 'bg-orange-500';
  if (lowerName.includes('pizza')) return 'bg-red-500';
  if (lowerName.includes('sobremesa') || lowerName.includes('dessert')) return 'bg-pink-500';
  if (lowerName.includes('salada') || lowerName.includes('salad')) return 'bg-green-500';
  if (lowerName.includes('carne') || lowerName.includes('meat')) return 'bg-red-600';
  if (lowerName.includes('peixe') || lowerName.includes('fish')) return 'bg-cyan-500';
  if (lowerName.includes('café') || lowerName.includes('coffee')) return 'bg-amber-700';
  if (lowerName.includes('destaque') || lowerName.includes('featured')) return 'bg-yellow-500';
  
  return 'bg-gray-500';
};

/**
 * Modern category sidebar for kiosk
 */
export const CategorySidebar = memo<CategorySidebarProps>(({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  className = ''
}) => {
  const haptic = useHapticFeedback();

  const handleCategoryClick = (categoryId: string | null) => {
    haptic.light();
    onSelectCategory(categoryId);
  };

  return (
    <aside className={`bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col ${className}`}>
      {/* Categories List */}
      <div className="flex-1 overflow-y-auto p-4 pt-6 space-y-2">
        {/* All Products */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TouchButton
            onClick={() => handleCategoryClick(null)}
            variant={selectedCategory === null ? 'primary' : 'ghost'}
            className={`
              w-full justify-start gap-4 p-4 rounded-xl transition-all
              ${selectedCategory === null 
                ? 'bg-primary-500 text-white shadow-lg scale-105' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }
            `}
          >
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              ${selectedCategory === null ? 'bg-primary-600' : 'bg-gray-100 dark:bg-gray-700'}
            `}>
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <Text variant="body" className="font-semibold">
                Todos os Produtos
              </Text>
              <Text variant="small" className="opacity-75">
                Ver tudo
              </Text>
            </div>
          </TouchButton>
        </motion.div>

        {/* Category Items */}
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <TouchButton
              onClick={() => handleCategoryClick(category.id)}
              variant={selectedCategory === category.id ? 'primary' : 'ghost'}
              className={`
                w-full justify-start gap-4 p-4 rounded-xl transition-all
                ${selectedCategory === category.id 
                  ? 'bg-primary-500 text-white shadow-lg scale-105' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${selectedCategory === category.id 
                  ? 'bg-primary-600 text-white' 
                  : getCategoryColor(category.name) + ' text-white'
                }
              `}>
                {getCategoryIcon(category.name)}
              </div>
              <div className="flex-1 text-left">
                <Text variant="body" className="font-semibold">
                  {category.name}
                </Text>
                {category.itemCount !== undefined && (
                  <Text variant="small" className="opacity-75">
                    {category.itemCount} {category.itemCount === 1 ? 'item' : 'itens'}
                  </Text>
                )}
              </div>
              {selectedCategory === category.id && (
                <motion.div
                  className="w-1 h-8 bg-white rounded-full"
                  layoutId="category-indicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </TouchButton>
          </motion.div>
        ))}
      </div>

    </aside>
  );
});

CategorySidebar.displayName = 'CategorySidebar';