// /home/ubuntu/pos-modern/src/stock/ui/StockManagementPage.jsx
import React, { useState, useEffect } from 'react';
import './StockManagementPage.css'; // Create this CSS file later

// Mock API functions (replace with actual API calls)
const fetchStockItems = async () => {
    // Replace with: await fetch('/api/v1/stock/items/');
    console.log('Fetching stock items...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // Mock data based on stock_models.py
    return [
        { id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', name: 'Hambúrguer Bovino 150g', unit: 'unidade', current_quantity: 50, low_stock_threshold: 10, last_updated: new Date().toISOString() },
        { id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0', name: 'Pão Brioche', unit: 'unidade', current_quantity: 120, low_stock_threshold: 24, last_updated: new Date().toISOString() },
        { id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01', name: 'Queijo Cheddar Fatiado', unit: 'kg', current_quantity: 5.5, low_stock_threshold: 1.0, last_updated: new Date().toISOString() },
        { id: 'd4e5f6a7-b8c9-0123-4567-890abcdef012', name: 'Batata Palito Congelada', unit: 'kg', current_quantity: 15.0, low_stock_threshold: 5.0, last_updated: new Date().toISOString() },
        { id: 'e5f6a7b8-c9d0-1234-5678-90abcdef0123', name: 'Refrigerante Lata 350ml', unit: 'unidade', current_quantity: 85, low_stock_threshold: 20, last_updated: new Date().toISOString() },
    ];
};

const fetchStockMovements = async (itemId) => {
    // Replace with: await fetch(`/api/v1/stock/movements/?item_id=${itemId}`);
    console.log(`Fetching movements for item ${itemId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock data
    return [
        { id: 'm1', stock_item_id: itemId, quantity: 100, movement_type: 'entry', reason: 'Compra inicial', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: 'm2', stock_item_id: itemId, quantity: -10, movement_type: 'sale', reason: 'Venda #123', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'm3', stock_item_id: itemId, quantity: -5, movement_type: 'adjustment', reason: 'Desperdício', timestamp: new Date().toISOString() },
    ];
};

// --- Components ---

function StockItemRow({ item, onSelect }) {
    const isLow = item.low_stock_threshold !== null && item.current_quantity < item.low_stock_threshold;
    return (
        <tr onClick={() => onSelect(item)} className={isLow ? 'low-stock' : ''}>
            <td>{item.name}</td>
            <td>{item.current_quantity}</td>
            <td>{item.unit}</td>
            <td>{item.low_stock_threshold ?? '-'}</td>
            <td>{new Date(item.last_updated).toLocaleString()}</td>
        </tr>
    );
}

function StockMovementDetails({ movements }) {
    if (!movements || movements.length === 0) {
        return <p>Nenhum histórico de movimentação para este item.</p>;
    }
    return (
        <div className="movement-details">
            <h4>Histórico de Movimentação</h4>
            <table>
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Tipo</th>
                        <th>Quantidade</th>
                        <th>Motivo</th>
                    </tr>
                </thead>
                <tbody>
                    {movements.map(mov => (
                        <tr key={mov.id}>
                            <td>{new Date(mov.timestamp).toLocaleString()}</td>
                            <td>{mov.movement_type}</td>
                            <td>{mov.quantity}</td>
                            <td>{mov.reason ?? '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StockManagementPage() {
    const [stockItems, setStockItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [movements, setMovements] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);

    useEffect(() => {
        loadStockItems();
    }, []);

    const loadStockItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const items = await fetchStockItems();
            setStockItems(items);
        } catch (err) {
            setError('Falha ao carregar itens de estoque.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectItem = async (item) => {
        setSelectedItem(item);
        setIsLoading(true);
        try {
            const itemMovements = await fetchStockMovements(item.id);
            setMovements(itemMovements);
        } catch (err) {
             setError('Falha ao carregar movimentações.');
             console.error(err);
             setMovements([]); // Clear movements on error
        } finally {
            setIsLoading(false);
        }
    };

    // Placeholder functions for modals/actions
    const handleAddItem = () => { console.log('Add item logic'); setShowAddItemModal(false); /* TODO: API call */ };
    const handleAdjustStock = () => { console.log('Adjust stock logic'); setShowAdjustStockModal(false); /* TODO: API call */ };

    return (
        <div className="stock-management-page">
            <h2>Gerenciamento de Estoque</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="stock-actions">
                <button onClick={() => setShowAddItemModal(true)}>Adicionar Item</button>
                <button onClick={() => selectedItem && setShowAdjustStockModal(true)} disabled={!selectedItem}>
                    Registrar Movimentação
                </button>
                 <button onClick={loadStockItems} disabled={isLoading}>Atualizar Lista</button>
            </div>

            {isLoading && <p>Carregando...</p>}

            <div className="stock-layout">
                <div className="stock-list-panel">
                    <h3>Itens em Estoque</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Qtd. Atual</th>
                                <th>Unidade</th>
                                <th>Estoque Mín.</th>
                                <th>Última Atualização</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockItems.map(item => (
                                <StockItemRow key={item.id} item={item} onSelect={handleSelectItem} />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="stock-details-panel">
                    <h3>Detalhes do Item Selecionado</h3>
                    {selectedItem ? (
                        <div>
                            <p><strong>Nome:</strong> {selectedItem.name}</p>
                            <p><strong>ID:</strong> {selectedItem.id}</p>
                            <p><strong>Quantidade Atual:</strong> {selectedItem.current_quantity} {selectedItem.unit}</p>
                            <p><strong>Estoque Mínimo:</strong> {selectedItem.low_stock_threshold ?? 'Não definido'}</p>
                            <StockMovementDetails movements={movements} />
                        </div>
                    ) : (
                        <p>Selecione um item da lista para ver os detalhes e o histórico.</p>
                    )}
                </div>
            </div>

            {/* Modal Placeholders (Implement actual modal components later) */}
            {showAddItemModal && (
                <div className="modal">
                    <h4>Adicionar Novo Item de Estoque</h4>
                    {/* Form fields: name, unit, initial_quantity, low_stock_threshold */}
                    <button onClick={handleAddItem}>Salvar</button>
                    <button onClick={() => setShowAddItemModal(false)}>Cancelar</button>
                </div>
            )}

            {showAdjustStockModal && selectedItem && (
                 <div className="modal">
                    <h4>Registrar Movimentação para: {selectedItem.name}</h4>
                    {/* Form fields: movement_type (entry, exit, adjustment), quantity, reason */}
                    <button onClick={handleAdjustStock}>Registrar</button>
                    <button onClick={() => setShowAdjustStockModal(false)}>Cancelar</button>
                </div>
            )}
        </div>
    );
}

export default StockManagementPage;

