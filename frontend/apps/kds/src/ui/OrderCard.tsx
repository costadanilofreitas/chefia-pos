import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { Card, CardHeader, CardContent, CardFooter } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Timer } from '../components/Timer';

type OrderItem = {
  id: string | number;
  name: string;
  quantity: number;
  notes?: string;
  status: string;
};

type Order = {
  id: string | number;
  created_at: string | Date;
  priority: 'urgent' | 'high' | 'normal' | 'low' | string;
  type: 'delivery' | 'table' | string;
  table_number?: string | number;
  delivery_id?: string | number;
  items: OrderItem[];
  customer_name?: string;
};

type OrderCardProps = {
  order: Order;
  onStatusChange: (orderId: string | number, newStatus: string) => void;
  onItemStatusChange: (
    orderId: string | number,
    itemId: string | number,
    newStatus: string
  ) => void;
  nextStatus: string;
};

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  onItemStatusChange,
  nextStatus
}) => {
  const getPriorityVariant = (priority: string): 'danger' | 'warning' | 'info' | 'success' => {
    switch (priority) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'info';
    }
  };

  const getButtonText = (status: string): string => {
    switch (status) {
      case 'preparing':
        return 'Iniciar Preparo';
      case 'ready':
        return 'Marcar como Pronto';
      case 'delivered':
        return 'Entregar';
      default:
        return 'Avançar';
    }
  };

  const getPriorityLevel = (priority: string): 'urgent' | 'high' | 'normal' => {
    switch (priority) {
      case 'urgent':
        return 'urgent';
      case 'high':
        return 'high';
      default:
        return 'normal';
    }
  };

  return (
    <Card 
      priority={getPriorityLevel(order.priority)}
      className="mb-4"
    >
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Pedido #{order.id}
          </h3>
          <Badge variant={getPriorityVariant(order.priority)} size="sm">
            {order.priority.toUpperCase()}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <Timer startTime={order.created_at} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {order.type === 'delivery' ? '🛵 Delivery' : '🍽️ Mesa'}{' '}
            <strong>{order.table_number || order.delivery_id}</strong>
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Itens:
        </h4>
        
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[30px]">
                {item.quantity}x
              </span>
              
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {item.name}
                </p>
                {item.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    📝 {item.notes}
                  </p>
                )}
              </div>
              
              <Button
                size="sm"
                variant={item.status === nextStatus ? 'success' : 'secondary'}
                icon={item.status === nextStatus ? <FaCheckCircle /> : null}
                onClick={() => onItemStatusChange(order.id, item.id, nextStatus)}
                className="touch-target"
              >
                {item.status === nextStatus ? 'Pronto' : 'Marcar'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Cliente: <strong>{order.customer_name || 'Não identificado'}</strong>
          </span>
          
          <Button
            variant="primary"
            size="lg"
            onClick={() => onStatusChange(order.id, nextStatus)}
            className="touch-target-lg"
          >
            {getButtonText(nextStatus)}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default OrderCard;