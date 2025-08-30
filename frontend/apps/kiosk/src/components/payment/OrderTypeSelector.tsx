import { memo } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';
import { OrderType } from '../../contexts/OrderContext';

interface OrderTypeOption {
  id: OrderType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface OrderTypeSelectorProps {
  selectedType: OrderType | null;
  onSelect: (type: OrderType) => void;
  className?: string;
}

const orderTypes: OrderTypeOption[] = [
  {
    id: 'dine_in',
    label: 'Comer no Local',
    description: 'Retire no balcão',
    icon: <MapPin className="w-8 h-8" />
  },
  {
    id: 'takeout',
    label: 'Para Viagem',
    description: 'Embalado para levar',
    icon: <Clock className="w-8 h-8" />
  }
];

/**
 * Order type selector component
 */
export const OrderTypeSelector = memo<OrderTypeSelectorProps>(({ 
  selectedType, 
  onSelect,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {orderTypes.map((type) => (
        <TouchButton
          key={type.id}
          onClick={() => onSelect(type.id)}
          variant={selectedType === type.id ? 'primary' : 'outline'}
          size="large"
          className="flex flex-col items-center gap-2 p-6"
        >
          {type.icon}
          <Text variant="body" className="font-semibold">
            {type.label}
          </Text>
          <Text variant="small" className="text-gray-500">
            {type.description}
          </Text>
        </TouchButton>
      ))}
    </div>
  );
});