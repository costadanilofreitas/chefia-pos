import { memo } from 'react';
import { CheckCircle } from 'lucide-react';
import { Text } from '../ui/Text';

interface OrderSuccessProps {
  orderNumber?: string;
  orderType?: 'dine_in' | 'takeout';
  qrCode?: string;
  className?: string;
}

/**
 * Order success confirmation component
 */
export const OrderSuccess = memo<OrderSuccessProps>(({ 
  orderNumber,
  orderType,
  qrCode,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="bg-green-100 dark:bg-green-900 rounded-full p-4 mb-4">
        <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
      </div>
      
      <Text variant="h2" className="text-green-600 dark:text-green-400 mb-2">
        Pedido Confirmado!
      </Text>
      
      {orderNumber && (
        <Text variant="h3" className="mb-4">
          Número do Pedido: #{orderNumber}
        </Text>
      )}
      
      <Text variant="body" className="text-gray-600 dark:text-gray-400 text-center mb-6">
        {orderType === 'dine_in' 
          ? 'Retire seu pedido no balcão quando chamado'
          : 'Seu pedido será preparado para viagem'}
      </Text>
      
      {qrCode && (
        <div className="bg-white p-4 rounded-lg mb-4">
          <img src={qrCode} alt="QR Code para pagamento" className="w-48 h-48" />
          <Text variant="small" className="text-center mt-2">
            Escaneie para pagar com PIX
          </Text>
        </div>
      )}
    </div>
  );
});