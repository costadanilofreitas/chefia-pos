import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Badge,
  Button,
  ProgressBar,
  ListGroup,
  Alert
} from 'react-bootstrap';
import { formatDistanceToNow, addSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './KDSOrderCard.css';

interface OrderItem {
  item_id: string;
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | string;
  station: string;
  estimated_start_time: string;
  estimated_prep_time: number;
  customizations?: Record<string, string>;
}

interface Order {
  order_id: string;
  order_number: string;
  type: 'delivery' | 'takeout' | 'dinein' | string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  table_number?: string;
  priority: 'high' | 'medium' | 'normal';
  items: OrderItem[];
}

interface KDSOrderCardProps {
  order: Order;
  onItemStatusChange: (
    orderId: string,
    itemId: string,
    newStatus: 'preparing' | 'ready'
  ) => void;
  onOrderComplete: (orderId: string) => void;
  currentStation?: string;
  highlightMode?: 'none' | 'always' | 'auto';
}

const KDSOrderCard: React.FC<KDSOrderCardProps> = ({
  order,
  onItemStatusChange,
  onOrderComplete,
  currentStation,
  highlightMode = 'auto'
}) => {
  const [now, setNow] = useState(new Date());
  const [expandedItems, setExpandedItems] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const waitTime = formatDistanceToNow(new Date(order.created_at), {
    locale: ptBR,
    addSuffix: false
  });

  const getPriorityClass = useCallback(() => {
    const waitTimeMinutes = (now.getTime() - new Date(order.created_at).getTime()) / (1000 * 60);

    if (order.priority === 'high' || waitTimeMinutes > 20) return 'priority-high';
    if (order.priority === 'medium' || waitTimeMinutes > 10) return 'priority-medium';
    return 'priority-normal';
  }, [order.priority, order.created_at, now]);

  const filteredItems = currentStation
    ? order.items.filter(item => item.station === currentStation)
    : order.items;

  const hasItemsToStartNow = filteredItems.some(item => {
    if (item.status !== 'pending') return false;
    const startTime = new Date(item.estimated_start_time);
    const diffSeconds = (startTime.getTime() - now.getTime()) / 1000;
    return diffSeconds <= 0 && diffSeconds > -60;
  });

  const hasDelayedItems = filteredItems.some(item => {
    if (item.status !== 'pending') return false;
    const startTime = new Date(item.estimated_start_time);
    return now > startTime;
  });

  const shouldHighlight = (): boolean => {
    if (highlightMode === 'none') return false;
    if (highlightMode === 'always') return true;
    return hasItemsToStartNow || hasDelayedItems;
  };

  const calculateOrderProgress = (): number => {
    const total = order.items.length;
    if (total === 0) return 0;
    const ready = order.items.filter(i => i.status === 'ready').length;
    const preparing = order.items.filter(i => i.status === 'preparing').length;
    return ((ready + preparing * 0.5) / total) * 100;
  };

  const renderStartTime = (item: OrderItem) => {
    if (item.status !== 'pending') return null;

    const startTime = new Date(item.estimated_start_time);
    const diffSeconds = (startTime.getTime() - now.getTime()) / 1000;

    if (diffSeconds <= 0) {
      return <Badge bg="danger" className="start-now-badge">INICIAR AGORA!</Badge>;
    } else if (diffSeconds < 60) {
      return <Badge bg="warning" className="start-soon-badge">Iniciar em {Math.ceil(diffSeconds)}s</Badge>;
    } else {
      const startAt = addSeconds(now, diffSeconds);
      const timeString = startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return <Badge bg="info" className="start-later-badge">Iniciar às {timeString}</Badge>;
    }
  };

  const renderItemStatus = (item: OrderItem) => {
    switch (item.status) {
      case 'pending':
        return <Badge bg="secondary">Pendente</Badge>;
      case 'preparing':
        return <Badge bg="primary">Preparando</Badge>;
      case 'ready':
        return <Badge bg="success">Pronto</Badge>;
      default:
        return <Badge bg="light" text="dark">{item.status}</Badge>;
    }
  };

  const renderPrepTime = (item: OrderItem) => {
    const minutes = Math.ceil(item.estimated_prep_time / 60);
    return `${minutes} min`;
  };

  const renderItemActions = (item: OrderItem) => {
    if (item.status === 'pending') {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => onItemStatusChange(order.order_id, item.item_id, 'preparing')}
        >
          Iniciar
        </Button>
      );
    } else if (item.status === 'preparing') {
      return (
        <Button
          variant="success"
          size="sm"
          onClick={() => onItemStatusChange(order.order_id, item.item_id, 'ready')}
        >
          Concluir
        </Button>
      );
    }
    return null;
  };

  const allItemsReady = order.items.every(item => item.status === 'ready');

  return (
    <Card className={`kds-order-card ${getPriorityClass()} ${shouldHighlight() ? 'highlight-card' : ''}`}>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <span className="order-number">Pedido #{order.order_number}</span>
            <Badge
              bg={order.type === 'delivery' ? 'danger' : order.type === 'takeout' ? 'warning' : 'info'}
              className="ms-2"
            >
              {order.type === 'delivery' ? 'Delivery' : order.type === 'takeout' ? 'Para Viagem' : 'Mesa'}
            </Badge>
            {order.table_number && (
              <Badge bg="dark" className="ms-2">Mesa {order.table_number}</Badge>
            )}
          </div>
          <div>
            <Badge bg="secondary" className="wait-time-badge">
              Espera: {waitTime}
            </Badge>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <small>Progresso do Pedido</small>
            <small>{Math.round(calculateOrderProgress())}%</small>
          </div>
          <ProgressBar now={calculateOrderProgress()} />
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setExpandedItems(!expandedItems)}
          >
            {expandedItems ? 'Ocultar Itens' : 'Mostrar Itens'}
          </Button>

          {allItemsReady && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onOrderComplete(order.order_id)}
            >
              Finalizar Pedido
            </Button>
          )}
        </div>

        {hasItemsToStartNow && (
          <Alert variant="warning" className="mb-3 py-2">
            <small>Há itens que precisam ser iniciados agora!</small>
          </Alert>
        )}

        {expandedItems && (
          <ListGroup variant="flush" className="kds-item-list">
            {filteredItems.length === 0 ? (
              <Alert variant="info" className="py-2">
                <small>Não há itens para esta estação</small>
              </Alert>
            ) : (
              filteredItems.map(item => (
                <ListGroup.Item
                  key={item.item_id}
                  className={`kds-item ${
                    item.status === 'pending' && new Date(item.estimated_start_time) <= now
                      ? 'item-highlight'
                      : ''
                  }`}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="item-info">
                      <div className="item-name">
                        <span className="quantity">{item.quantity}x</span> {item.name}
                      </div>
                      {item.customizations && Object.keys(item.customizations).length > 0 && (
                        <div className="item-customizations">
                          <small>
                            {Object.entries(item.customizations).map(([key, value]) => (
                              <span key={key}>{key}: {value}; </span>
                            ))}
                          </small>
                        </div>
                      )}
                      <div className="item-meta">
                        <small className="me-2">{renderItemStatus(item)}</small>
                        <small className="me-2">Preparo: {renderPrepTime(item)}</small>
                        <small>{renderStartTime(item)}</small>
                      </div>
                    </div>
                    <div className="item-actions">{renderItemActions(item)}</div>
                  </div>
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        )}
      </Card.Body>

      <Card.Footer className="text-muted">
        <div className="d-flex justify-content-between align-items-center">
          <small>Cliente: {order.customer_name || 'Não identificado'}</small>
          <small>
            Atualizado: {formatDistanceToNow(new Date(order.updated_at), {
              locale: ptBR,
              addSuffix: true
            })}
          </small>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default KDSOrderCard;
