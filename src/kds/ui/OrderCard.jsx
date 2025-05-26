import React from 'react';
import './OrderCard.css';

// Componentes auxiliares
const OrderTimer = ({ createdAt, estimatedCompletionTime }) => {
  const [timeElapsed, setTimeElapsed] = React.useState(0);
  const [isOverdue, setIsOverdue] = React.useState(false);
  
  React.useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const created = new Date(createdAt);
      const elapsed = Math.floor((now - created) / 1000 / 60); // em minutos
      
      setTimeElapsed(elapsed);
      
      if (estimatedCompletionTime) {
        const estimated = new Date(estimatedCompletionTime);
        setIsOverdue(now > estimated);
      }
    };
    
    calculateTime();
    const intervalId = setInterval(calculateTime, 30000); // Atualiza a cada 30 segundos
    
    return () => clearInterval(intervalId);
  }, [createdAt, estimatedCompletionTime]);
  
  return (
    <div className={`order-timer ${isOverdue ? 'overdue' : ''}`}>
      <span className="timer-icon">⏱️</span>
      <span className="timer-value">{timeElapsed} min</span>
      {isOverdue && <span className="timer-alert">ATRASADO</span>}
    </div>
  );
};

const PriorityBadge = ({ priority }) => {
  const priorityLabels = {
    'low': 'Baixa',
    'normal': 'Normal',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  
  return (
    <span className={`priority-badge ${priority}`}>
      {priorityLabels[priority] || 'Normal'}
    </span>
  );
};

const OrderTypeIcon = ({ type }) => {
  const icons = {
    'dine_in': '🍽️',
    'takeout': '🥡',
    'delivery': '🚚'
  };
  
  const labels = {
    'dine_in': 'Mesa',
    'takeout': 'Para Viagem',
    'delivery': 'Entrega'
  };
  
  return (
    <span className={`order-type-icon ${type}`} title={labels[type]}>
      {icons[type] || '🍽️'}
    </span>
  );
};

const OrderCard = ({ order, onStatusChange, onItemStatusChange, nextStatus }) => {
  const handleOrderStatusChange = () => {
    onStatusChange(order.id, nextStatus);
  };
  
  const handleItemStatusChange = (itemId, currentStatus) => {
    // Determinar o próximo status para o item
    let itemNextStatus;
    if (currentStatus === 'pending') {
      itemNextStatus = 'preparing';
    } else if (currentStatus === 'preparing') {
      itemNextStatus = 'ready';
    } else if (currentStatus === 'ready') {
      itemNextStatus = 'delivered';
    }
    
    if (itemNextStatus) {
      onItemStatusChange(order.id, itemId, itemNextStatus);
    }
  };
  
  // Determinar o texto do botão de ação principal
  const getActionButtonText = () => {
    switch (nextStatus) {
      case 'preparing':
        return 'Iniciar Preparo';
      case 'ready':
        return 'Marcar como Pronto';
      case 'delivered':
        return 'Marcar como Entregue';
      default:
        return 'Próximo Status';
    }
  };
  
  // Determinar a classe CSS para o card com base no status e prioridade
  const getCardClass = () => {
    let classes = `order-card ${order.status}`;
    
    if (order.priority === 'urgent') {
      classes += ' urgent';
    } else if (order.priority === 'high') {
      classes += ' high-priority';
    }
    
    return classes;
  };
  
  return (
    <div className={getCardClass()}>
      <div className="order-header">
        <div className="order-info">
          <span className="order-number">#{order.order_number}</span>
          <OrderTypeIcon type={order.order_type} />
          {order.table_number && (
            <span className="table-number">Mesa {order.table_number}</span>
          )}
          <PriorityBadge priority={order.priority} />
        </div>
        <OrderTimer 
          createdAt={order.created_at} 
          estimatedCompletionTime={order.estimated_completion_time} 
        />
      </div>
      
      <div className="order-customer">
        {order.customer_name && (
          <span className="customer-name">{order.customer_name}</span>
        )}
      </div>
      
      <div className="order-items">
        {order.items.map(item => (
          <div 
            key={item.id} 
            className={`order-item ${item.status}`}
            onClick={() => handleItemStatusChange(item.id, item.status)}
          >
            <div className="item-quantity">{item.quantity}x</div>
            <div className="item-details">
              <div className="item-name">{item.product_name}</div>
              
              {item.customizations && item.customizations.length > 0 && (
                <div className="item-customizations">
                  {item.customizations.map((custom, index) => (
                    <div key={index} className="item-customization">
                      {custom.type === 'remove' ? '- ' : '+ '}
                      {custom.name}
                    </div>
                  ))}
                </div>
              )}
              
              {item.notes && (
                <div className="item-notes">{item.notes}</div>
              )}
            </div>
            <div className="item-status-indicator"></div>
          </div>
        ))}
      </div>
      
      {order.notes && (
        <div className="order-notes">
          <strong>Observações:</strong> {order.notes}
        </div>
      )}
      
      <div className="order-actions">
        <button 
          className={`action-button ${nextStatus}`}
          onClick={handleOrderStatusChange}
        >
          {getActionButtonText()}
        </button>
      </div>
    </div>
  );
};

export default OrderCard;
