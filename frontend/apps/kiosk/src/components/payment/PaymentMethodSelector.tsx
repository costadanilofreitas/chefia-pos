import { memo } from 'react';
import { CreditCard, Smartphone, DollarSign } from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';
import { PaymentMethod } from '../../contexts/OrderContext';

interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description?: string;
  icon: React.ReactNode;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  className?: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'credit_card',
    label: 'Cartão de Crédito',
    icon: <CreditCard className="w-8 h-8" />
  },
  {
    id: 'debit_card',
    label: 'Cartão de Débito',
    icon: <CreditCard className="w-8 h-8" />
  },
  {
    id: 'pix',
    label: 'PIX',
    description: 'Pagamento instantâneo',
    icon: <Smartphone className="w-8 h-8" />
  },
  {
    id: 'cash',
    label: 'Dinheiro',
    description: 'Pagar no balcão',
    icon: <DollarSign className="w-8 h-8" />
  }
];

/**
 * Payment method selector component
 */
export const PaymentMethodSelector = memo<PaymentMethodSelectorProps>(({ 
  selectedMethod, 
  onSelect,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {paymentMethods.map((method) => (
        <TouchButton
          key={method.id}
          onClick={() => onSelect(method.id)}
          variant={selectedMethod === method.id ? 'primary' : 'outline'}
          size="large"
          className="flex flex-col items-center gap-2 p-6"
        >
          {method.icon}
          <Text variant="body" className="font-semibold">
            {method.label}
          </Text>
          {method.description && (
            <Text variant="small" className="text-gray-500">
              {method.description}
            </Text>
          )}
        </TouchButton>
      ))}
    </div>
  );
});