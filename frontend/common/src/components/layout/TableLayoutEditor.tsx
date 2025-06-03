import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button, Select, Modal, Form, Input, Spin } from 'antd';
import { PlusOutlined, SaveOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';

// Componentes que seriam importados
// import LayoutArea from './LayoutArea';
// import PropertiesPanel from './PropertiesPanel';

const { Option } = Select;

const TableLayoutEditor = ({ 
  initialLayouts = [], 
  onSave, 
  editable = true,
  defaultLayoutId = null
}) => {
  const [layouts, setLayouts] = useState(initialLayouts);
  const [currentLayout, setCurrentLayout] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewLayoutModal, setShowNewLayoutModal] = useState(false);
  const [newLayoutForm] = Form.useForm();
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  // Carregar layouts ao inicializar
  useEffect(() => {
    if (initialLayouts.length > 0) {
      setLayouts(initialLayouts);
      
      if (defaultLayoutId) {
        const defaultLayout = initialLayouts.find(layout => layout.id === defaultLayoutId);
        if (defaultLayout) {
          setCurrentLayout(defaultLayout);
        }
      }
    }
  }, [initialLayouts, defaultLayoutId]);

  // Função para agendar salvamento automático
  const scheduleAutoSave = (layoutToSave) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      saveLayoutToServer(layoutToSave);
    }, 3000);
    
    setAutoSaveTimer(timer);
  };

  // Salvar layout no servidor
  const saveLayoutToServer = (layoutToSave) => {
    if (onSave) {
      onSave(layoutToSave);
    }
  };

  // Selecionar layout
  const handleSelectLayout = (layoutId) => {
    const selectedLayout = layouts.find(layout => layout.id === layoutId);
    if (selectedLayout) {
      setCurrentLayout(selectedLayout);
      setSelectedItem(null);
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  // Criar novo layout
  const handleCreateLayout = () => {
    newLayoutForm.validateFields().then(values => {
      const newLayout = {
        id: `layout_${Date.now()}`,
        name: values.name,
        description: values.description || '',
        background_color: values.background_color || '#FFFFFF',
        tables: [],
        sections: []
      };
      
      setLayouts([...layouts, newLayout]);
      setCurrentLayout(newLayout);
      setSelectedItem(null);
      setUndoStack([]);
      setRedoStack([]);
      setShowNewLayoutModal(false);
      newLayoutForm.resetFields();
      
      // Salvar no servidor
      saveLayoutToServer(newLayout);
    });
  };

  // Adicionar mesa
  const handleAddTable = (position) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    const newTable = {
      id: `table_${Date.now()}`,
      x: position.x,
      y: position.y,
      width: 80,
      height: 80,
      rotation: 0,
      shape: 'circle',
      number: currentLayout.tables.length + 1,
      seats: 4,
      status: 'available'
    };
    
    const updatedLayout = {
      ...currentLayout,
      tables: [...currentLayout.tables, newTable]
    };
    
    setCurrentLayout(updatedLayout);
    setSelectedItem({ id: newTable.id, type: 'table' });
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Adicionar seção
  const handleAddSection = (position) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    const newSection = {
      id: `section_${Date.now()}`,
      x: position.x,
      y: position.y,
      width: 200,
      height: 150,
      name: `Seção ${currentLayout.sections.length + 1}`,
      color: '#f0f0f0',
      border_color: '#d9d9d9'
    };
    
    const updatedLayout = {
      ...currentLayout,
      sections: [...currentLayout.sections, newSection]
    };
    
    setCurrentLayout(updatedLayout);
    setSelectedItem({ id: newSection.id, type: 'section' });
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Mover item
  const handleMoveItem = (id, type, position) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    let updatedLayout;
    
    if (type === 'table') {
      updatedLayout = {
        ...currentLayout,
        tables: currentLayout.tables.map(table => 
          table.id === id ? { ...table, x: position.x, y: position.y } : table
        )
      };
    } else if (type === 'section') {
      updatedLayout = {
        ...currentLayout,
        sections: currentLayout.sections.map(section => 
          section.id === id ? { ...section, x: position.x, y: position.y } : section
        )
      };
    }
    
    setCurrentLayout(updatedLayout);
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Atualizar mesa
  const handleUpdateTable = (id, updates) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    const updatedLayout = {
      ...currentLayout,
      tables: currentLayout.tables.map(table => 
        table.id === id ? { ...table, ...updates } : table
      )
    };
    
    setCurrentLayout(updatedLayout);
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Atualizar seção
  const handleUpdateSection = (id, updates) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    const updatedLayout = {
      ...currentLayout,
      sections: currentLayout.sections.map(section => 
        section.id === id ? { ...section, ...updates } : section
      )
    };
    
    setCurrentLayout(updatedLayout);
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Excluir item
  const handleDeleteItem = (id, type) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    let updatedLayout;
    
    if (type === 'table') {
      updatedLayout = {
        ...currentLayout,
        tables: currentLayout.tables.filter(table => table.id !== id)
      };
    } else if (type === 'section') {
      updatedLayout = {
        ...currentLayout,
        sections: currentLayout.sections.filter(section => section.id !== id)
      };
    }
    
    setCurrentLayout(updatedLayout);
    setSelectedItem(null);
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Rotacionar mesa
  const handleRotateTable = (id, rotation) => {
    if (!currentLayout || !editable) return;
    
    // Adicionar estado atual à pilha de desfazer
    setUndoStack([...undoStack, JSON.parse(JSON.stringify(currentLayout))]);
    
    // Limpar pilha de refazer
    setRedoStack([]);
    
    const updatedLayout = {
      ...currentLayout,
      tables: currentLayout.tables.map(table => 
        table.id === id ? { ...table, rotation } : table
      )
    };
    
    setCurrentLayout(updatedLayout);
    
    // Agendar salvamento automático
    scheduleAutoSave(updatedLayout);
  };

  // Desfazer
  const handleUndo = () => {
    if (undoStack.length === 0 || !editable) return;
    
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
    if (redoStack.length === 0 || !editable) return;
    
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
              {/* Aqui seria renderizado o componente LayoutArea */}
              {/* <LayoutArea
                layout={currentLayout}
                selectedItem={selectedItem}
                onSelectItem={(id, type) => setSelectedItem({ id, type })}
                onMoveItem={handleMoveItem}
                onAddTable={handleAddTable}
                onAddSection={handleAddSection}
                onRotateTable={handleRotateTable}
                editable={editable}
              /> */}
            </div>
            
            <div className="editor-sidebar">
              {/* Aqui seria renderizado o componente PropertiesPanel */}
              {/* <PropertiesPanel
                selectedItem={selectedItem}
                layout={currentLayout}
                onUpdateTable={handleUpdateTable}
                onUpdateSection={handleUpdateSection}
                onDeleteItem={handleDeleteItem}
                editable={editable}
              /> */}
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
