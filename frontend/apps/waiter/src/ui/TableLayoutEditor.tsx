import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button, Card, Modal, Form, Input, Select, ColorPicker, Tabs, message, Spin, Tooltip, Slider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, EyeOutlined, 
         UserOutlined, ShoppingCartOutlined, ClockCircleOutlined, CheckCircleOutlined,
         RotateLeftOutlined, RotateRightOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import axios from 'axios';
import './TableLayoutEditor.css';

const { TabPane } = Tabs;
const { Option } = Select;

// Tipos de itens arrastáveis
const ItemTypes = {
  TABLE: 'table',
  SECTION: 'section'
};

// Componente de Mesa
const Table = ({ table, isSelected, onClick, onStatusChange, onOrderAssign, onWaiterAssign, editable, onRotate }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TABLE,
    item: { id: table.id, type: 'table' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: editable
  }));

  // Determinar a cor com base no status
  const getStatusColor = () => {
    switch (table.status) {
      case 'available': return '#4CAF50'; // Verde
      case 'occupied': return '#F44336';  // Vermelho
      case 'reserved': return '#2196F3';  // Azul
      case 'dirty': return '#FF9800';     // Laranja
      case 'inactive': return '#9E9E9E';  // Cinza
      default: return '#4CAF50';
    }
  };

  // Renderizar forma da mesa
  const renderTableShape = () => {
    const style = {
      width: '100%',
      height: '100%',
      backgroundColor: getStatusColor(),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontWeight: 'bold',
      border: isSelected ? '2px solid #1890ff' : 'none',
      opacity: isDragging ? 0.5 : 1,
      cursor: editable ? 'move' : 'pointer',
    };

    switch (table.shape) {
      case 'circle':
        return <div style={{ ...style, borderRadius: '50%' }}>{table.number}</div>;
      case 'ellipse':
        return <div style={{ ...style, borderRadius: '50%' }}>{table.number}</div>;
      case 'square':
        return <div style={{ ...style, borderRadius: '4px' }}>{table.number}</div>;
      case 'rectangle':
      default:
        return <div style={{ ...style, borderRadius: '4px' }}>{table.number}</div>;
    }
  };

  // Renderizar ícones de status
  const renderStatusIcons = () => {
    return (
      <div className="table-status-icons">
        {table.waiter_id && (
          <Tooltip title="Garçom atribuído">
            <UserOutlined />
          </Tooltip>
        )}
        {table.current_order_id && (
          <Tooltip title="Pedido em andamento">
            <ShoppingCartOutlined />
          </Tooltip>
        )}
      </div>
    );
  };

  // Renderizar controles de rotação quando selecionado e editável
  const renderRotationControls = () => {
    if (isSelected && editable) {
      return (
        <div className="table-rotation-controls">
          <Button 
            icon={<RotateLeftOutlined />} 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(table.id, -15);
            }}
          />
          <Button 
            icon={<RotateRightOutlined />} 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(table.id, 15);
            }}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={drag}
      className="table-item"
      style={{
        position: 'absolute',
        left: `${table.position.x}%`,
        top: `${table.position.y}%`,
        width: `${table.position.width}%`,
        height: `${table.position.height}%`,
        transform: `rotate(${table.position.rotation}deg)`,
      }}
      onClick={onClick}
    >
      {renderTableShape()}
      {!editable && renderStatusIcons()}
      {renderRotationControls()}
    </div>
  );
};

// Componente de Seção
const Section = ({ section, isSelected, onClick, editable }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SECTION,
    item: { id: section.id, type: 'section' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: editable
  }));

  return (
    <div
      ref={drag}
      className="section-item"
      style={{
        position: 'absolute',
        left: `${section.position.x}%`,
        top: `${section.position.y}%`,
        width: `${section.position.width}%`,
        height: `${section.position.height}%`,
        backgroundColor: section.background_color,
        backgroundImage: section.background_image ? `url(${section.background_image})` : 'none',
        backgroundSize: 'cover',
        border: isSelected ? '2px solid #1890ff' : '1px dashed #d9d9d9',
        opacity: isDragging ? 0.5 : 0.7,
        cursor: editable ? 'move' : 'pointer',
        zIndex: 0
      }}
      onClick={onClick}
    >
      <div className="section-label">{section.name}</div>
    </div>
  );
};

// Área de Layout
const LayoutArea = ({ 
  layout, 
  selectedItem, 
  onSelectItem, 
  onMoveItem, 
  onAddTable, 
  onAddSection,
  onRotateTable,
  editable 
}) => {
  const ref = useRef(null);

  const [, drop] = useDrop(() => ({
    accept: [ItemTypes.TABLE, ItemTypes.SECTION],
    drop: (item, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const delta = monitor.getDifferenceFromInitialOffset();
      const rect = ref.current.getBoundingClientRect();
      
      // Converter delta de pixels para porcentagem
      const deltaXPercent = (delta.x / rect.width) * 100;
      const deltaYPercent = (delta.y / rect.height) * 100;
      
      onMoveItem(item.id, item.type, deltaXPercent, deltaYPercent);
    },
    canDrop: () => editable
  }));

  // Manipulador de clique para adicionar mesa
  const handleAddTable = (e) => {
    if (!editable) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onAddTable(x, y);
  };

  // Manipulador de clique para adicionar seção
  const handleAddSection = (e) => {
    if (!editable) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onAddSection(x, y);
  };

  drop(ref);

  return (
    <div 
      ref={ref} 
      className="layout-area"
      style={{
        width: '100%',
        height: '600px',
        position: 'relative',
        backgroundColor: layout.background_color,
        backgroundImage: layout.background_image ? `url(${layout.background_image})` : 'none',
        backgroundSize: 'cover',
        border: '1px solid #d9d9d9',
        overflow: 'hidden'
      }}
      onDoubleClick={editable ? handleAddTable : undefined}
      onContextMenu={(e) => {
        if (editable) {
          e.preventDefault();
          handleAddSection(e);
        }
      }}
    >
      {/* Renderizar seções */}
      {layout.sections.map(section => (
        <Section
          key={section.id}
          section={section}
          isSelected={selectedItem && selectedItem.id === section.id && selectedItem.type === 'section'}
          onClick={() => onSelectItem(section.id, 'section')}
          editable={editable}
        />
      ))}
      
      {/* Renderizar mesas */}
      {layout.tables.map(table => (
        <Table
          key={table.id}
          table={table}
          isSelected={selectedItem && selectedItem.id === table.id && selectedItem.type === 'table'}
          onClick={() => onSelectItem(table.id, 'table')}
          onRotate={onRotateTable}
          editable={editable}
        />
      ))}
      
      {editable && (
        <div className="layout-instructions">
          <p>Duplo clique para adicionar mesa</p>
          <p>Clique direito para adicionar seção</p>
          <p>Arraste para mover itens</p>
          <p>Selecione uma mesa e use os controles para rotacionar</p>
        </div>
      )}
    </div>
  );
};

// Painel de Propriedades
const PropertiesPanel = ({ 
  selectedItem, 
  layout, 
  onUpdateTable, 
  onUpdateSection, 
  onDeleteItem,
  editable 
}) => {
  const [form] = Form.useForm();
  
  useEffect(() => {
    if (selectedItem) {
      let item;
      if (selectedItem.type === 'table') {
        item = layout.tables.find(t => t.id === selectedItem.id);
        if (item) {
          form.setFieldsValue({
            number: item.number,
            shape: item.shape,
            capacity: item.capacity,
            status: item.status,
            width: item.position.width,
            height: item.position.height,
            rotation: item.position.rotation
          });
        }
      } else if (selectedItem.type === 'section') {
        item = layout.sections.find(s => s.id === selectedItem.id);
        if (item) {
          form.setFieldsValue({
            name: item.name,
            description: item.description,
            background_color: item.background_color,
            width: item.position.width,
            height: item.position.height
          });
        }
      }
    } else {
      form.resetFields();
    }
  }, [selectedItem, layout, form]);

  const handleFormSubmit = (values) => {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'table') {
      onUpdateTable(selectedItem.id, {
        number: values.number,
        shape: values.shape,
        capacity: values.capacity,
        status: values.status,
        position: {
          ...layout.tables.find(t => t.id === selectedItem.id).position,
          width: values.width,
          height: values.height,
          rotation: values.rotation
        }
      });
    } else if (selectedItem.type === 'section') {
      onUpdateSection(selectedItem.id, {
        name: values.name,
        description: values.description,
        background_color: values.background_color,
        position: {
          ...layout.sections.find(s => s.id === selectedItem.id).position,
          width: values.width,
          height: values.height
        }
      });
    }
  };

  // Manipulador para alterações no slider de rotação
  const handleRotationChange = (value) => {
    if (!selectedItem || selectedItem.type !== 'table') return;
    
    form.setFieldsValue({ rotation: value });
    
    // Atualizar mesa em tempo real
    onUpdateTable(selectedItem.id, {
      position: {
        ...layout.tables.find(t => t.id === selectedItem.id).position,
        rotation: value
      }
    });
  };

  if (!selectedItem) {
    return (
      <div className="properties-panel">
        <div className="properties-empty">
          <p>Selecione um item para editar suas propriedades</p>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h3>{selectedItem.type === 'table' ? 'Propriedades da Mesa' : 'Propriedades da Seção'}</h3>
        {editable && (
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => onDeleteItem(selectedItem.id, selectedItem.type)}
          />
        )}
      </div>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFormSubmit}
        disabled={!editable}
        onValuesChange={(changedValues, allValues) => {
          // Auto-save para alterações simples
          if (editable && 
              (changedValues.hasOwnProperty('width') || 
               changedValues.hasOwnProperty('height') || 
               changedValues.hasOwnProperty('background_color'))) {
            handleFormSubmit(allValues);
          }
        }}
      >
        {selectedItem.type === 'table' ? (
          <>
            <Form.Item name="number" label="Número da Mesa" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            
            <Form.Item name="shape" label="Formato">
              <Select>
                <Option value="rectangle">Retângulo</Option>
                <Option value="square">Quadrado</Option>
                <Option value="circle">Círculo</Option>
                <Option value="ellipse">Elipse</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="capacity" label="Capacidade">
              <Input type="number" min={1} />
            </Form.Item>
            
            <Form.Item name="status" label="Status">
              <Select>
                <Option value="available">Disponível</Option>
                <Option value="occupied">Ocupada</Option>
                <Option value="reserved">Reservada</Option>
                <Option value="dirty">Suja</Option>
                <Option value="inactive">Inativa</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="width" label="Largura (%)">
              <Input type="number" min={1} max={100} />
            </Form.Item>
            
            <Form.Item name="height" label="Altura (%)">
              <Input type="number" min={1} max={100} />
            </Form.Item>
            
            <Form.Item name="rotation" label="Rotação (graus)">
              <Slider 
                min={0} 
                max={360} 
                onChange={handleRotationChange}
                marks={{
                  0: '0°',
                  90: '90°',
                  180: '180°',
                  270: '270°',
                  360: '360°'
                }}
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="name" label="Nome da Seção" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            
            <Form.Item name="description" label="Descrição">
              <Input.TextArea rows={2} />
            </Form.Item>
            
            <Form.Item name="background_color" label="Cor de Fundo">
              <Input type="color" />
            </Form.Item>
            
            <Form.Item name="width" label="Largura (%)">
              <Input type="number" min={1} max={100} />
            </Form.Item>
            
            <Form.Item name="height" label="Altura (%)">
              <Input type="number" min={1} max={100} />
            </Form.Item>
          </>
        )}
        
        {editable && (
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              Salvar Alterações
            </Button>
          </Form.Item>
        )}
      </Form>
    </div>
  );
};

// Componente principal do Editor de Layout
const TableLayoutEditor = ({ restaurantId, storeId, mode = 'edit' }) => {
  const [layouts, setLayouts] = useState([]);
  const [currentLayout, setCurrentLayout] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewLayoutModal, setShowNewLayoutModal] = useState(false);
  const [newLayoutForm] = Form.useForm();
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  
  const editable = mode === 'edit';

  // Carregar layouts ao iniciar
  useEffect(() => {
    fetchLayouts();
    
    // Limpar timer de auto-save ao desmontar
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [restaurantId, storeId]);

  // Buscar layouts do servidor
  const fetchLayouts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/waiter/tables/layouts?restaurant_id=${restaurantId}&store_id=${storeId}`);
      setLayouts(response.data);
      
      // Buscar layout ativo
      const activeResponse = await axios.get(`/api/waiter/tables/layouts/active?restaurant_id=${restaurantId}&store_id=${storeId}`);
      setCurrentLayout(activeResponse.data);
      
      // Limpar histórico de desfazer/refazer
      setUndoStack([]);
      setRedoStack([]);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar layouts:', error);
      message.error('Não foi possível carregar os layouts de mesa');
      setLoading(false);
    }
  };

  // Selecionar um layout
  const handleSelectLayout = async (layoutId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/waiter/tables/layouts/${layoutId}`);
      setCurrentLayout(response.data);
      setSelectedItem(null);
      
      // Limpar histórico de desfazer/refazer
      setUndoStack([]);
      setRedoStack([]);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar layout:', error);
      message.error('Não foi possível carregar o layout selecionado');
      setLoading(false);
    }
  };

  // Criar novo layout
  const handleCreateLayout = async () => {
    try {
      const values = await newLayoutForm.validateFields();
      
      setLoading(true);
      const response = await axios.post('/api/waiter/tables/layouts', {
        restaurant_id: restaurantId,
        store_id: storeId,
        name: values.name,
        description: values.description,
        background_color: values.background_color || '#FFFFFF',
        width: 1000,
        height: 800
      });
      
      setLayouts([...layouts, response.data]);
      setCurrentLayout(response.data);
      setShowNewLayoutModal(false);
      newLayoutForm.resetFields();
      setLoading(false);
      
      message.success('Layout criado com sucesso');
    } catch (error) {
      console.error('Erro ao criar layout:', error);
      message.error('Não foi possível criar o layout');
      setLoading(false);
    }
  };

  // Definir layout como ativo
  const handleSetActiveLayout = async (layoutId) => {
    try {
      setLoading(true);
      await axios.post(`/api/waiter/tables/layouts/${layoutId}/activate?restaurant_id=${restaurantId}&store_id=${storeId}`);
      
      message.success('Layout definido como ativo');
      setLoading(false);
    } catch (error) {
      console.error('Erro ao definir layout ativo:', error);
      message.error('Não foi possível definir o layout como ativo');
      setLoading(false);
    }
  };

  // Excluir layout
  const handleDeleteLayout = async (layoutId) => {
    try {
      setLoading(true);
      await axios.delete(`/api/waiter/tables/layouts/${layoutId}`);
      
      // Atualizar lista de layouts
      const updatedLayouts = layouts.filter(layout => layout.id !== layoutId);
      setLayouts(updatedLayouts);
      
      // Se o layout atual foi excluído, selecionar outro
      if (currentLayout && currentLayout.id === layoutId) {
        if (updatedLayouts.length > 0) {
          await handleSelectLayout(updatedLayouts[0].id);
        } else {
          setCurrentLayout(null);
        }
      }
      
      setLoading(false);
      message.success('Layout excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir layout:', error);
      message.error('Não foi possível excluir o layout. Verifique se não é o layout ativo.');
      setLoading(false);
    }
  };

  // Adicionar mesa ao layout
  const handleAddTable = async (x, y) => {
    if (!currentLayout || !editable) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    // Gerar ID único
    const tableId = `table_${Date.now()}`;
    
    // Criar nova mesa
    const newTable = {
      id: tableId,
      number: `${currentLayout.tables.length + 1}`,
      shape: 'rectangle',
      position: {
        x,
        y,
        width: 10,
        height: 10,
        rotation: 0
      },
      status: 'available',
      capacity: 4
    };
    
    // Atualizar layout localmente
    const updatedLayout = {
      ...currentLayout,
      tables: [...currentLayout.tables, newTable],
      updated_at: new Date().toISOString()
    };
    
    setCurrentLayout(updatedLayout);
    setSelectedItem({ id: tableId, type: 'table' });
    
    // Salvar no servidor com atraso para evitar muitas requisições
    scheduleAutoSave(updatedLayout);
  };

  // Adicionar seção ao layout
  const handleAddSection = async (x, y) => {
    if (!currentLayout || !editable) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    // Gerar ID único
    const sectionId = `section_${Date.now()}`;
    
    // Criar nova seção
    const newSection = {
      id: sectionId,
      name: `Seção ${currentLayout.sections.length + 1}`,
      description: '',
      background_color: '#f0f0f0',
      position: {
        x,
        y,
        width: 20,
        height: 20
      }
    };
    
    // Atualizar layout localmente
    const updatedLayout = {
      ...currentLayout,
      sections: [...currentLayout.sections, newSection],
      updated_at: new Date().toISOString()
    };
    
    setCurrentLayout(updatedLayout);
    setSelectedItem({ id: sectionId, type: 'section' });
    
    // Salvar no servidor com atraso para evitar muitas requisições
    scheduleAutoSave(updatedLayout);
  };

  // Mover item no layout
  const handleMoveItem = (itemId, itemType, deltaX, deltaY) => {
    if (!currentLayout || !editable) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    let updatedLayout;
    
    if (itemType === 'table') {
      // Encontrar a mesa
      const tableIndex = currentLayout.tables.findIndex(table => table.id === itemId);
      if (tableIndex === -1) return;
      
      // Criar cópia das mesas
      const updatedTables = [...currentLayout.tables];
      
      // Atualizar posição
      updatedTables[tableIndex] = {
        ...updatedTables[tableIndex],
        position: {
          ...updatedTables[tableIndex].position,
          x: Math.max(0, Math.min(100 - updatedTables[tableIndex].position.width, updatedTables[tableIndex].position.x + deltaX)),
          y: Math.max(0, Math.min(100 - updatedTables[tableIndex].position.height, updatedTables[tableIndex].position.y + deltaY))
        }
      };
      
      // Atualizar layout
      updatedLayout = {
        ...currentLayout,
        tables: updatedTables,
        updated_at: new Date().toISOString()
      };
    } else if (itemType === 'section') {
      // Encontrar a seção
      const sectionIndex = currentLayout.sections.findIndex(section => section.id === itemId);
      if (sectionIndex === -1) return;
      
      // Criar cópia das seções
      const updatedSections = [...currentLayout.sections];
      
      // Atualizar posição
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        position: {
          ...updatedSections[sectionIndex].position,
          x: Math.max(0, Math.min(100 - updatedSections[sectionIndex].position.width, updatedSections[sectionIndex].position.x + deltaX)),
          y: Math.max(0, Math.min(100 - updatedSections[sectionIndex].position.height, updatedSections[sectionIndex].position.y + deltaY))
        }
      };
      
      // Atualizar layout
      updatedLayout = {
        ...currentLayout,
        sections: updatedSections,
        updated_at: new Date().toISOString()
      };
    }
    
    if (updatedLayout) {
      setCurrentLayout(updatedLayout);
      
      // Salvar no servidor com atraso para evitar muitas requisições
      scheduleAutoSave(updatedLayout);
    }
  };

  // Rotacionar mesa
  const handleRotateTable = (tableId, deltaRotation) => {
    if (!currentLayout || !editable) return;
    
    // Encontrar a mesa
    const tableIndex = currentLayout.tables.findIndex(table => table.id === tableId);
    if (tableIndex === -1) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    // Criar cópia das mesas
    const updatedTables = [...currentLayout.tables];
    
    // Calcular nova rotação (0-360)
    let newRotation = (updatedTables[tableIndex].position.rotation + deltaRotation) % 360;
    if (newRotation < 0) newRotation += 360;
    
    // Atualizar rotação
    updatedTables[tableIndex] = {
      ...updatedTables[tableIndex],
      position: {
        ...updatedTables[tableIndex].position,
        rotation: newRotation
      }
    };
    
    // Atualizar layout
    const updatedLayout = {
      ...currentLayout,
      tables: updatedTables,
      updated_at: new Date().toISOString()
    };
    
    setCurrentLayout(updatedLayout);
    
    // Salvar no servidor com atraso para evitar muitas requisições
    scheduleAutoSave(updatedLayout);
  };

  // Atualizar mesa
  const handleUpdateTable = async (tableId, tableData) => {
    if (!currentLayout || !editable) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    // Encontrar a mesa
    const tableIndex = currentLayout.tables.findIndex(table => table.id === tableId);
    if (tableIndex === -1) return;
    
    // Criar cópia das mesas
    const updatedTables = [...currentLayout.tables];
    
    // Atualizar mesa
    updatedTables[tableIndex] = {
      ...updatedTables[tableIndex],
      ...tableData
    };
    
    // Atualizar layout
    const updatedLayout = {
      ...currentLayout,
      tables: updatedTables,
      updated_at: new Date().toISOString()
    };
    
    setCurrentLayout(updatedLayout);
    
    // Salvar no servidor com atraso para evitar muitas requisições
    scheduleAutoSave(updatedLayout);
  };

  // Atualizar seção
  const handleUpdateSection = async (sectionId, sectionData) => {
    if (!currentLayout || !editable) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    // Encontrar a seção
    const sectionIndex = currentLayout.sections.findIndex(section => section.id === sectionId);
    if (sectionIndex === -1) return;
    
    // Criar cópia das seções
    const updatedSections = [...currentLayout.sections];
    
    // Atualizar seção
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      ...sectionData
    };
    
    // Atualizar layout
    const updatedLayout = {
      ...currentLayout,
      sections: updatedSections,
      updated_at: new Date().toISOString()
    };
    
    setCurrentLayout(updatedLayout);
    
    // Salvar no servidor com atraso para evitar muitas requisições
    scheduleAutoSave(updatedLayout);
  };

  // Excluir item
  const handleDeleteItem = async (itemId, itemType) => {
    if (!currentLayout || !editable) return;
    
    // Salvar estado atual para desfazer
    saveStateForUndo();
    
    let updatedLayout;
    
    if (itemType === 'table') {
      // Filtrar mesas
      const updatedTables = currentLayout.tables.filter(table => table.id !== itemId);
      
      // Atualizar layout
      updatedLayout = {
        ...currentLayout,
        tables: updatedTables,
        updated_at: new Date().toISOString()
      };
    } else if (itemType === 'section') {
      // Filtrar seções
      const updatedSections = currentLayout.sections.filter(section => section.id !== itemId);
      
      // Atualizar layout
      updatedLayout = {
        ...currentLayout,
        sections: updatedSections,
        updated_at: new Date().toISOString()
      };
    }
    
    if (updatedLayout) {
      setCurrentLayout(updatedLayout);
      setSelectedItem(null);
      
      // Salvar no servidor
      await saveLayoutToServer(updatedLayout);
    }
  };

  // Salvar layout no servidor
  const saveLayoutToServer = async (layout) => {
    try {
      await axios.put(`/api/waiter/tables/layouts/${layout.id}`, layout);
      message.success('Layout salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      message.error('Não foi possível salvar o layout');
    }
  };

  // Agendar auto-save
  const scheduleAutoSave = (layout) => {
    // Cancelar timer anterior
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    // Criar novo timer
    const timer = setTimeout(() => {
      saveLayoutToServer(layout);
    }, 2000); // 2 segundos de atraso
    
    setAutoSaveTimer(timer);
  };

  // Salvar estado atual para desfazer
  const saveStateForUndo = () => {
    if (!currentLayout) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
  };

  // Desfazer
  const handleUndo = () => {
    if (undoStack.length === 0 || !currentLayout) return;
    
    // Obter último estado
    const lastState = undoStack[undoStack.length - 1];
    
    // Adicionar estado atual à pilha de refazer
    setRedoStack([...redoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Atualizar layout
    setCurrentLayout(lastState);
    
    // Remover último estado da pilha de desfazer
    setUndoStack(undoStack.slice(0, -1));
    
    // Salvar no servidor
    scheduleAutoSave(lastState);
  };

  // Refazer
  const handleRedo = () => {
    if (redoStack.length === 0 || !currentLayout) return;
    
    // Obter último estado
    const lastState = redoStack[redoStack.length - 1];
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Atualizar layout
    setCurrentLayout(lastState);
    
    // Remover último estado da pilha de refazer
    setRedoStack(redoStack.slice(0, -1));
    
    // Salvar no servidor
    scheduleAutoSave(lastState);
  };

  // Renderizar modal de novo layout
  const renderNewLayoutModal = () => {
    return (
      <Modal
        title="Criar Novo Layout"
        open={showNewLayoutModal}
        onOk={handleCreateLayout}
        onCancel={() => setShowNewLayoutModal(false)}
      >
        <Form form={newLayoutForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nome do Layout"
            rules={[{ required: true, message: 'Por favor, informe o nome do layout' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={3} />
          </Form.Item>
          
          <Form.Item name="background_color" label="Cor de Fundo">
            <Input type="color" defaultValue="#FFFFFF" />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="table-layout-editor">
        <div className="editor-header">
          <h2>Editor de Layout de Mesas</h2>
          
          <div className="layout-selector">
            <Select
              style={{ width: 200 }}
              placeholder="Selecione um layout"
              value={currentLayout ? currentLayout.id : undefined}
              onChange={handleSelectLayout}
            >
              {layouts.map(layout => (
                <Option key={layout.id} value={layout.id}>
                  {layout.name}
                </Option>
              ))}
            </Select>
            
            {editable && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowNewLayoutModal(true)}
                >
                  Novo Layout
                </Button>
                
                {currentLayout && (
                  <>
                    <Button
                      type="default"
                      icon={<SaveOutlined />}
                      onClick={() => saveLayoutToServer(currentLayout)}
                    >
                      Salvar
                    </Button>
                    
                    <Button
                      type="default"
                      icon={<UndoOutlined />}
                      disabled={undoStack.length === 0}
                      onClick={handleUndo}
                    >
                      Desfazer
                    </Button>
                    
                    <Button
                      type="default"
                      icon={<RedoOutlined />}
                      disabled={redoStack.length === 0}
                      onClick={handleRedo}
                    >
                      Refazer
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
            <p>Carregando layout...</p>
          </div>
        ) : currentLayout ? (
          <div className="editor-content">
            <div className="editor-main">
              <LayoutArea
                layout={currentLayout}
                selectedItem={selectedItem}
                onSelectItem={(id, type) => setSelectedItem({ id, type })}
                onMoveItem={handleMoveItem}
                onAddTable={handleAddTable}
                onAddSection={handleAddSection}
                onRotateTable={handleRotateTable}
                editable={editable}
              />
            </div>
            
            <div className="editor-sidebar">
              <PropertiesPanel
                selectedItem={selectedItem}
                layout={currentLayout}
                onUpdateTable={handleUpdateTable}
                onUpdateSection={handleUpdateSection}
                onDeleteItem={handleDeleteItem}
                editable={editable}
              />
            </div>
          </div>
        ) : (
          <div className="empty-container">
            <p>Nenhum layout selecionado</p>
            {editable && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowNewLayoutModal(true)}
              >
                Criar Novo Layout
              </Button>
            )}
          </div>
        )}
        
        {renderNewLayoutModal()}
      </div>
    </DndProvider>
  );
};

export default TableLayoutEditor;
