// src/components/TableLayoutEditor.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fab,
  Alert,
  Snackbar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  GridOn as GridIcon,
  Visibility as PreviewIcon,
  GetApp as ExportIcon,
  Publish as ImportIcon,
  Palette as TemplateIcon,
  TableRestaurant as TableIcon,
  AspectRatio as AreaIcon
} from '@mui/icons-material';
import { 
  TableLayoutConfigService, 
  RestaurantLayoutConfig, 
  TableConfig, 
  AreaConfig,
  LayoutTemplate 
} from '../services/TableLayoutConfig';

interface TableLayoutEditorProps {
  terminalId: string;
  onSave?: (config: RestaurantLayoutConfig) => void;
  onCancel?: () => void;
  initialConfig?: RestaurantLayoutConfig;
}

interface DragState {
  isDragging: boolean;
  dragType: 'table' | 'area' | null;
  dragId: string | null;
  startPos: { x: number; y: number };
  offset: { x: number; y: number };
}

interface EditorState {
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

const TableLayoutEditor: React.FC<TableLayoutEditorProps> = ({
  terminalId,
  onSave,
  onCancel,
  initialConfig
}) => {
  // Estados principais
  const [config, setConfig] = useState<RestaurantLayoutConfig>(
    initialConfig || TableLayoutConfigService.generateDefaultConfig(terminalId)
  );
  const [selectedItem, setSelectedItem] = useState<{ type: 'table' | 'area'; id: string } | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    dragId: null,
    startPos: { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
  });
  const [editorState, setEditorState] = useState<EditorState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    showGrid: true,
    snapToGrid: true,
    gridSize: 20
  });

  // Estados de diálogos
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Estados de formulários
  const [editingTable, setEditingTable] = useState<Partial<TableConfig>>({});
  const [editingArea, setEditingArea] = useState<Partial<AreaConfig>>({});
  const [importData, setImportData] = useState('');

  // Estados de feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Histórico para undo/redo
  const [history, setHistory] = useState<RestaurantLayoutConfig[]>([config]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Carregar templates
  const [templates] = useState<LayoutTemplate[]>(TableLayoutConfigService.getLayoutTemplates());

  // Efeitos
  useEffect(() => {
    validateConfig();
  }, [config]);

  // Funções de validação
  const validateConfig = useCallback(() => {
    const validation = TableLayoutConfigService.validateConfig(config);
    setValidationErrors(validation.errors);
  }, [config]);

  // Funções de histórico
  const addToHistory = useCallback((newConfig: RestaurantLayoutConfig) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newConfig);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setConfig(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setConfig(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Funções de zoom e pan
  const zoomIn = () => setEditorState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }));
  const zoomOut = () => setEditorState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.3) }));
  const resetView = () => setEditorState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }));

  // Funções de snap to grid
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!editorState.snapToGrid) return { x, y };
    const { gridSize } = editorState;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [editorState.snapToGrid, editorState.gridSize]);

  // Funções de drag and drop
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'table' | 'area', id: string) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - editorState.pan.x) / editorState.zoom;
    const y = (e.clientY - rect.top - editorState.pan.y) / editorState.zoom;

    const item = type === 'table' 
      ? config.tables.find(t => t.id === id)
      : config.areas.find(a => a.id === id);

    if (!item) return;

    const offset = type === 'table'
      ? { x: x - (item as TableConfig).position.x, y: y - (item as TableConfig).position.y }
      : { x: x - (item as AreaConfig).bounds.x, y: y - (item as AreaConfig).bounds.y };

    setDragState({
      isDragging: true,
      dragType: type,
      dragId: id,
      startPos: { x, y },
      offset
    });

    setSelectedItem({ type, id });
  }, [config, editorState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - editorState.pan.x) / editorState.zoom;
    const y = (e.clientY - rect.top - editorState.pan.y) / editorState.zoom;

    const newPos = snapToGrid(x - dragState.offset.x, y - dragState.offset.y);

    if (dragState.dragType === 'table') {
      setConfig(prev => ({
        ...prev,
        tables: prev.tables.map(table =>
          table.id === dragState.dragId
            ? { ...table, position: { x: Math.max(0, newPos.x), y: Math.max(0, newPos.y) } }
            : table
        )
      }));
    } else if (dragState.dragType === 'area') {
      setConfig(prev => ({
        ...prev,
        areas: prev.areas.map(area =>
          area.id === dragState.dragId
            ? { 
                ...area, 
                bounds: { 
                  ...area.bounds, 
                  x: Math.max(0, newPos.x), 
                  y: Math.max(0, newPos.y) 
                } 
              }
            : area
        )
      }));
    }
  }, [dragState, editorState, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      addToHistory(config);
      setDragState({
        isDragging: false,
        dragType: null,
        dragId: null,
        startPos: { x: 0, y: 0 },
        offset: { x: 0, y: 0 }
      });
    }
  }, [dragState.isDragging, config, addToHistory]);

  // Funções de mesa
  const addTable = useCallback(() => {
    const newTable: TableConfig = {
      id: `table_${Date.now()}`,
      number: config.tables.length + 1,
      seats: 4,
      position: { x: 100, y: 100 },
      shape: 'round',
      size: { width: 80, height: 80 },
      area: config.areas[0]?.id || 'main'
    };

    const newConfig = {
      ...config,
      tables: [...config.tables, newTable]
    };

    setConfig(newConfig);
    addToHistory(newConfig);
    setSnackbar({ open: true, message: 'Mesa adicionada com sucesso!', severity: 'success' });
  }, [config, addToHistory]);

  const editTable = useCallback((table: TableConfig) => {
    setEditingTable(table);
    setTableDialogOpen(true);
  }, []);

  const saveTable = useCallback(() => {
    if (!editingTable.id) return;

    const newConfig = {
      ...config,
      tables: config.tables.map(table =>
        table.id === editingTable.id ? { ...table, ...editingTable } : table
      )
    };

    setConfig(newConfig);
    addToHistory(newConfig);
    setTableDialogOpen(false);
    setEditingTable({});
    setSnackbar({ open: true, message: 'Mesa atualizada com sucesso!', severity: 'success' });
  }, [config, editingTable, addToHistory]);

  const deleteTable = useCallback((tableId: string) => {
    const newConfig = {
      ...config,
      tables: config.tables.filter(table => table.id !== tableId)
    };

    setConfig(newConfig);
    addToHistory(newConfig);
    setSnackbar({ open: true, message: 'Mesa removida com sucesso!', severity: 'success' });
  }, [config, addToHistory]);

  // Funções de área
  const addArea = useCallback(() => {
    const newArea: AreaConfig = {
      id: `area_${Date.now()}`,
      name: `Área ${config.areas.length + 1}`,
      color: '#e3f2fd',
      bounds: { x: 50, y: 50, width: 200, height: 150 }
    };

    const newConfig = {
      ...config,
      areas: [...config.areas, newArea]
    };

    setConfig(newConfig);
    addToHistory(newConfig);
    setSnackbar({ open: true, message: 'Área adicionada com sucesso!', severity: 'success' });
  }, [config, addToHistory]);

  const editArea = useCallback((area: AreaConfig) => {
    setEditingArea(area);
    setAreaDialogOpen(true);
  }, []);

  const saveArea = useCallback(() => {
    if (!editingArea.id) return;

    const newConfig = {
      ...config,
      areas: config.areas.map(area =>
        area.id === editingArea.id ? { ...area, ...editingArea } : area
      )
    };

    setConfig(newConfig);
    addToHistory(newConfig);
    setAreaDialogOpen(false);
    setEditingArea({});
    setSnackbar({ open: true, message: 'Área atualizada com sucesso!', severity: 'success' });
  }, [config, editingArea, addToHistory]);

  const deleteArea = useCallback((areaId: string) => {
    // Verificar se há mesas na área
    const tablesInArea = config.tables.filter(table => table.area === areaId);
    if (tablesInArea.length > 0) {
      setSnackbar({ 
        open: true, 
        message: 'Não é possível remover área com mesas. Remova as mesas primeiro.', 
        severity: 'error' 
      });
      return;
    }

    const newConfig = {
      ...config,
      areas: config.areas.filter(area => area.id !== areaId)
    };

    setConfig(newConfig);
    addToHistory(newConfig);
    setSnackbar({ open: true, message: 'Área removida com sucesso!', severity: 'success' });
  }, [config, addToHistory]);

  // Funções de template
  const applyTemplate = useCallback((templateId: string) => {
    try {
      const newConfig = TableLayoutConfigService.applyTemplate(terminalId, templateId);
      setConfig(newConfig);
      addToHistory(newConfig);
      setTemplateDialogOpen(false);
      setSnackbar({ open: true, message: 'Template aplicado com sucesso!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao aplicar template', severity: 'error' });
    }
  }, [terminalId, addToHistory]);

  // Funções de import/export
  const exportConfig = useCallback(() => {
    try {
      const configJson = TableLayoutConfigService.exportLayoutConfig(terminalId);
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `layout_terminal_${terminalId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Configuração exportada com sucesso!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao exportar configuração', severity: 'error' });
    }
  }, [terminalId]);

  const importConfig = useCallback(() => {
    try {
      TableLayoutConfigService.importLayoutConfig(terminalId, importData);
      const newConfig = TableLayoutConfigService.getLayoutConfig(terminalId);
      if (newConfig) {
        setConfig(newConfig);
        addToHistory(newConfig);
        setImportDialogOpen(false);
        setImportData('');
        setSnackbar({ open: true, message: 'Configuração importada com sucesso!', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao importar configuração', severity: 'error' });
    }
  }, [terminalId, importData, addToHistory]);

  // Função de salvar
  const handleSave = useCallback(() => {
    const validation = TableLayoutConfigService.validateConfig(config);
    if (!validation.isValid) {
      setSnackbar({ 
        open: true, 
        message: `Configuração inválida: ${validation.errors.join(', ')}`, 
        severity: 'error' 
      });
      return;
    }

    try {
      TableLayoutConfigService.saveLayoutConfig(terminalId, config);
      onSave?.(config);
      setSnackbar({ open: true, message: 'Layout salvo com sucesso!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao salvar layout', severity: 'error' });
    }
  }, [config, terminalId, onSave]);

  // Renderização das mesas
  const renderTable = useCallback((table: TableConfig) => {
    const isSelected = selectedItem?.type === 'table' && selectedItem.id === table.id;
    const isDragging = dragState.isDragging && dragState.dragId === table.id;

    const style: React.CSSProperties = {
      position: 'absolute',
      left: table.position.x,
      top: table.position.y,
      width: table.size.width,
      height: table.size.height,
      backgroundColor: isSelected ? '#1976d2' : '#fff',
      border: `2px solid ${isSelected ? '#1976d2' : '#ccc'}`,
      borderRadius: table.shape === 'round' ? '50%' : table.shape === 'square' ? '4px' : '8px',
      cursor: isDragging ? 'grabbing' : 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      color: isSelected ? '#fff' : '#333',
      boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: isDragging ? 1000 : 1,
      userSelect: 'none'
    };

    return (
      <div
        key={table.id}
        style={style}
        onMouseDown={(e) => handleMouseDown(e, 'table', table.id)}
        onDoubleClick={() => editTable(table)}
      >
        <div style={{ textAlign: 'center' }}>
          <div>{table.number}</div>
          <div style={{ fontSize: '10px' }}>{table.seats}p</div>
        </div>
      </div>
    );
  }, [selectedItem, dragState, handleMouseDown, editTable]);

  // Renderização das áreas
  const renderArea = useCallback((area: AreaConfig) => {
    const isSelected = selectedItem?.type === 'area' && selectedItem.id === area.id;
    const isDragging = dragState.isDragging && dragState.dragId === area.id;

    const style: React.CSSProperties = {
      position: 'absolute',
      left: area.bounds.x,
      top: area.bounds.y,
      width: area.bounds.width,
      height: area.bounds.height,
      backgroundColor: area.color,
      border: `2px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? '#1976d2' : '#999'}`,
      borderRadius: '8px',
      cursor: isDragging ? 'grabbing' : 'grab',
      opacity: 0.7,
      zIndex: 0,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333',
      userSelect: 'none'
    };

    return (
      <div
        key={area.id}
        style={style}
        onMouseDown={(e) => handleMouseDown(e, 'area', area.id)}
        onDoubleClick={() => editArea(area)}
      >
        {area.name}
      </div>
    );
  }, [selectedItem, dragState, handleMouseDown, editArea]);

  // Renderização da grade
  const renderGrid = useCallback(() => {
    if (!editorState.showGrid) return null;

    const { gridSize } = editorState;
    const { width, height } = config.dimensions;
    const lines = [];

    // Linhas verticais
    for (let x = 0; x <= width; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }

    // Linhas horizontais
    for (let y = 0; y <= height; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        {lines}
      </svg>
    );
  }, [editorState.showGrid, editorState.gridSize, config.dimensions]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6">
              Editor de Layout - Terminal {terminalId}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {config.name} • {config.tables.length} mesas • {config.areas.length} áreas
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Controles de histórico */}
              <Tooltip title="Desfazer">
                <IconButton onClick={undo} disabled={historyIndex === 0}>
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refazer">
                <IconButton onClick={redo} disabled={historyIndex === history.length - 1}>
                  <RedoIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              {/* Controles de zoom */}
              <Tooltip title="Diminuir zoom">
                <IconButton onClick={zoomOut}>
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px', textAlign: 'center' }}>
                {Math.round(editorState.zoom * 100)}%
              </Typography>
              <Tooltip title="Aumentar zoom">
                <IconButton onClick={zoomIn}>
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Centralizar">
                <IconButton onClick={resetView}>
                  <CenterIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              {/* Controles de grade */}
              <Tooltip title="Mostrar/ocultar grade">
                <IconButton 
                  onClick={() => setEditorState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                  color={editorState.showGrid ? 'primary' : 'default'}
                >
                  <GridIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              {/* Ações principais */}
              <Button
                variant="outlined"
                startIcon={<TemplateIcon />}
                onClick={() => setTemplateDialogOpen(true)}
              >
                Templates
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={exportConfig}
              >
                Exportar
              </Button>
              <Button
                variant="outlined"
                startIcon={<ImportIcon />}
                onClick={() => setImportDialogOpen(true)}
              >
                Importar
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={validationErrors.length > 0}
              >
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Alertas de validação */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Problemas encontrados:</Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Paper>

      {/* Área principal */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2 }}>
        {/* Canvas */}
        <Paper sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              cursor: dragState.isDragging ? 'grabbing' : 'default',
              transform: `scale(${editorState.zoom}) translate(${editorState.pan.x}px, ${editorState.pan.y}px)`,
              transformOrigin: '0 0'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Fundo do canvas */}
            <div
              style={{
                width: config.dimensions.width,
                height: config.dimensions.height,
                backgroundColor: '#f5f5f5',
                border: '2px solid #ccc',
                position: 'relative'
              }}
            >
              {renderGrid()}
              
              {/* Áreas */}
              {config.areas.map(renderArea)}
              
              {/* Mesas */}
              {config.tables.map(renderTable)}
            </div>
          </div>

          {/* FABs para adicionar */}
          <Fab
            color="primary"
            size="small"
            sx={{ position: 'absolute', bottom: 16, right: 80 }}
            onClick={addTable}
          >
            <TableIcon />
          </Fab>
          <Fab
            color="secondary"
            size="small"
            sx={{ position: 'absolute', bottom: 16, right: 16 }}
            onClick={addArea}
          >
            <AreaIcon />
          </Fab>
        </Paper>

        {/* Painel lateral */}
        <Paper sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Propriedades
          </Typography>

          {selectedItem ? (
            <Box>
              {selectedItem.type === 'table' ? (
                <Card>
                  <CardContent>
                    {(() => {
                      const table = config.tables.find(t => t.id === selectedItem.id);
                      if (!table) return null;
                      
                      return (
                        <>
                          <Typography variant="subtitle1" gutterBottom>
                            Mesa {table.number}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Assentos: {table.seats}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Formato: {table.shape}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Área: {config.areas.find(a => a.id === table.area)?.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Posição: {table.position.x}, {table.position.y}
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => editTable(table)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => deleteTable(table.id)}
                            >
                              Excluir
                            </Button>
                          </Box>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    {(() => {
                      const area = config.areas.find(a => a.id === selectedItem.id);
                      if (!area) return null;
                      
                      const tablesInArea = config.tables.filter(t => t.area === area.id);
                      
                      return (
                        <>
                          <Typography variant="subtitle1" gutterBottom>
                            {area.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Mesas: {tablesInArea.length}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Dimensões: {area.bounds.width} × {area.bounds.height}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Posição: {area.bounds.x}, {area.bounds.y}
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => editArea(area)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => deleteArea(area.id)}
                              disabled={tablesInArea.length > 0}
                            >
                              Excluir
                            </Button>
                          </Box>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Selecione uma mesa ou área para ver suas propriedades
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Estatísticas */}
          <Typography variant="subtitle2" gutterBottom>
            Estatísticas
          </Typography>
          {(() => {
            const stats = TableLayoutConfigService.getConfigStats(config);
            return (
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Total de Mesas"
                    secondary={stats.totalTables}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total de Assentos"
                    secondary={stats.totalSeats}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Média por Mesa"
                    secondary={`${stats.averageSeatsPerTable} assentos`}
                  />
                </ListItem>
                {stats.areas.map(area => (
                  <ListItem key={area.name}>
                    <ListItemText
                      primary={area.name}
                      secondary={`${area.tables} mesas, ${area.seats} assentos`}
                    />
                  </ListItem>
                ))}
              </List>
            );
          })()}
        </Paper>
      </Box>

      {/* Dialog de edição de mesa */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Mesa</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Número da Mesa"
                type="number"
                value={editingTable.number || ''}
                onChange={(e) => setEditingTable(prev => ({ ...prev, number: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Assentos"
                type="number"
                value={editingTable.seats || ''}
                onChange={(e) => setEditingTable(prev => ({ ...prev, seats: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Formato</InputLabel>
                <Select
                  value={editingTable.shape || 'round'}
                  onChange={(e) => setEditingTable(prev => ({ ...prev, shape: e.target.value as any }))}
                >
                  <MenuItem value="round">Redonda</MenuItem>
                  <MenuItem value="square">Quadrada</MenuItem>
                  <MenuItem value="rectangle">Retangular</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Área</InputLabel>
                <Select
                  value={editingTable.area || ''}
                  onChange={(e) => setEditingTable(prev => ({ ...prev, area: e.target.value }))}
                >
                  {config.areas.map(area => (
                    <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Largura"
                type="number"
                value={editingTable.size?.width || ''}
                onChange={(e) => setEditingTable(prev => ({ 
                  ...prev, 
                  size: { ...prev.size, width: parseInt(e.target.value) } as any
                }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Altura"
                type="number"
                value={editingTable.size?.height || ''}
                onChange={(e) => setEditingTable(prev => ({ 
                  ...prev, 
                  size: { ...prev.size, height: parseInt(e.target.value) } as any
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveTable} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de edição de área */}
      <Dialog open={areaDialogOpen} onClose={() => setAreaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Área</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Área"
                value={editingArea.name || ''}
                onChange={(e) => setEditingArea(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cor"
                type="color"
                value={editingArea.color || '#e3f2fd'}
                onChange={(e) => setEditingArea(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Largura"
                type="number"
                value={editingArea.bounds?.width || ''}
                onChange={(e) => setEditingArea(prev => ({ 
                  ...prev, 
                  bounds: { ...prev.bounds, width: parseInt(e.target.value) } as any
                }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Altura"
                type="number"
                value={editingArea.bounds?.height || ''}
                onChange={(e) => setEditingArea(prev => ({ 
                  ...prev, 
                  bounds: { ...prev.bounds, height: parseInt(e.target.value) } as any
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAreaDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveArea} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de templates */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Escolher Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates.map(template => (
              <Grid item xs={12} md={6} key={template.id}>
                <Card 
                  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                  onClick={() => applyTemplate(template.id)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {template.description}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        label={template.type} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={`${template.config.tables.length} mesas`} 
                        size="small" 
                        sx={{ ml: 1 }} 
                      />
                      <Chip 
                        label={`${template.config.areas.length} áreas`} 
                        size="small" 
                        sx={{ ml: 1 }} 
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de importação */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Importar Configuração</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Cole aqui o JSON da configuração"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
          <Button onClick={importConfig} variant="contained" disabled={!importData.trim()}>
            Importar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TableLayoutEditor;

