// /home/ubuntu/pos-modern/src/customer/ui/CustomerManagementPage.jsx
import React, { useState, useEffect } from 'react';
import './CustomerManagementPage.css'; // Create this CSS file later

// Mock API functions (replace with actual API calls)
const fetchCustomers = async (search = '') => {
    // Replace with: await fetch(`/api/v1/customers/?search=${search}`);
    console.log(`Fetching customers (search: "${search}")...`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // Mock data based on customer_models.py
    const allCustomers = [
        {
            id: 'c1a2b3c4-d5e6-f789-0123-456789abcdef',
            name: 'João Silva',
            phone: '11987654321',
            email: 'joao.silva@email.com',
            addresses: [
                { id: 'addr1', street: 'Rua Principal', number: '123', complement: 'Apto 4B', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zip_code: '01000-000', is_primary: true },
            ],
            loyalty: { points: 150, level: 'Bronze', last_updated: new Date(Date.now() - 86400000 * 2).toISOString() },
            purchase_history: [
                { order_id: 'order1', purchase_date: new Date(Date.now() - 86400000 * 5).toISOString(), total_amount: 55.50, items_summary: '1x X-Burger, 1x Refri' },
                { order_id: 'order2', purchase_date: new Date(Date.now() - 86400000 * 1).toISOString(), total_amount: 32.00, items_summary: '1x Combo Simples' },
            ],
            created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
            last_updated: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
        {
            id: 'd2b3c4d5-e6f7-a890-1234-56789abcdef0',
            name: 'Maria Oliveira',
            phone: '21999998888',
            email: 'maria.o@email.com',
            addresses: [
                { id: 'addr2', street: 'Avenida Copacabana', number: '500', complement: '', neighborhood: 'Copacabana', city: 'Rio de Janeiro', state: 'RJ', zip_code: '22000-000', is_primary: true },
            ],
            loyalty: { points: 50, level: null, last_updated: new Date().toISOString() },
            purchase_history: [
                 { order_id: 'order3', purchase_date: new Date().toISOString(), total_amount: 25.00, items_summary: '1x Salada Caesar' },
            ],
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            last_updated: new Date().toISOString(),
        },
    ];
    if (!search) return allCustomers;
    const lowerSearch = search.toLowerCase();
    return allCustomers.filter(c =>
        c.name.toLowerCase().includes(lowerSearch) ||
        (c.phone && c.phone.includes(lowerSearch)) ||
        (c.email && c.email.toLowerCase().includes(lowerSearch))
    );
};

// --- Components ---

function CustomerRow({ customer, onSelect }) {
    return (
        <tr onClick={() => onSelect(customer)}>
            <td>{customer.name}</td>
            <td>{customer.phone ?? '-'}</td>
            <td>{customer.email ?? '-'}</td>
            <td>{customer.loyalty.points}</td>
        </tr>
    );
}

function CustomerDetails({ customer }) {
    if (!customer) {
        return <p>Selecione um cliente da lista para ver os detalhes.</p>;
    }

    const primaryAddress = customer.addresses.find(addr => addr.is_primary);

    return (
        <div className="customer-details-content">
            <h4>Detalhes de {customer.name}</h4>
            <p><strong>ID:</strong> {customer.id}</p>
            <p><strong>Telefone:</strong> {customer.phone ?? 'Não informado'}</p>
            <p><strong>Email:</strong> {customer.email ?? 'Não informado'}</p>
            <p><strong>Cliente desde:</strong> {new Date(customer.created_at).toLocaleDateString()}</p>
            <p><strong>Última atualização:</strong> {new Date(customer.last_updated).toLocaleString()}</p>

            <div className="detail-section">
                <h5>Endereço Principal</h5>
                {primaryAddress ? (
                    <p>
                        {primaryAddress.street}, {primaryAddress.number} {primaryAddress.complement}<br />
                        {primaryAddress.neighborhood} - {primaryAddress.city}/{primaryAddress.state}<br />
                        CEP: {primaryAddress.zip_code}
                    </p>
                ) : (
                    <p>Nenhum endereço principal cadastrado.</p>
                )}
                {/* Add button to view/manage all addresses */} 
            </div>

            <div className="detail-section">
                <h5>Fidelidade</h5>
                <p><strong>Pontos:</strong> {customer.loyalty.points}</p>
                <p><strong>Nível:</strong> {customer.loyalty.level ?? 'Nenhum'}</p>
                <p><strong>Última atualização:</strong> {new Date(customer.loyalty.last_updated).toLocaleString()}</p>
                 {/* Add button to adjust points */} 
            </div>

            <div className="detail-section">
                <h5>Histórico de Compras ({customer.purchase_history.length})</h5>
                {customer.purchase_history.length > 0 ? (
                    <ul>
                        {customer.purchase_history.slice(0, 5).map(p => ( // Show last 5
                            <li key={p.order_id}>
                                {new Date(p.purchase_date).toLocaleDateString()}: R$ {p.total_amount.toFixed(2)} ({p.items_summary ?? 'Detalhes não disponíveis'})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Nenhuma compra registrada.</p>
                )}
                 {/* Add button to view full history */} 
            </div>
        </div>
    );
}

function CustomerManagementPage() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    // Add states for other modals (edit, add address, etc.)

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async (currentSearch = searchTerm) => {
        setIsLoading(true);
        setError(null);
        setSelectedCustomer(null); // Clear selection on new search/refresh
        try {
            const fetchedCustomers = await fetchCustomers(currentSearch);
            setCustomers(fetchedCustomers);
        } catch (err) {
            setError('Falha ao carregar clientes.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        loadCustomers(searchTerm);
    };

    const handleSelectItem = (customer) => {
        setSelectedCustomer(customer);
    };

    // Placeholder functions for modals/actions
    const handleAddCustomer = () => { console.log('Add customer logic'); setShowAddCustomerModal(false); /* TODO: API call */ };

    return (
        <div className="customer-management-page">
            <h2>Gerenciamento de Clientes</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="customer-actions">
                <form onSubmit={handleSearchSubmit} className="search-form">
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou email..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    <button type="submit" disabled={isLoading}>Buscar</button>
                </form>
                <button onClick={() => setShowAddCustomerModal(true)}>Adicionar Cliente</button>
                <button onClick={() => loadCustomers()} disabled={isLoading}>Atualizar Lista</button>
                 {/* Add buttons for Edit, Add Address, etc., enabled when customer selected */}
            </div>

            {isLoading && <p>Carregando...</p>}

            <div className="customer-layout">
                <div className="customer-list-panel">
                    <h3>Clientes Cadastrados</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Email</th>
                                <th>Pontos Fidelidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(cust => (
                                <CustomerRow key={cust.id} customer={cust} onSelect={handleSelectItem} />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="customer-details-panel">
                    <h3>Detalhes do Cliente</h3>
                    <CustomerDetails customer={selectedCustomer} />
                </div>
            </div>

            {/* Modal Placeholders (Implement actual modal components later) */}
            {showAddCustomerModal && (
                <div className="modal">
                    <h4>Adicionar Novo Cliente</h4>
                    {/* Form fields: name, phone, email, initial address? */}
                    <button onClick={handleAddCustomer}>Salvar</button>
                    <button onClick={() => setShowAddCustomerModal(false)}>Cancelar</button>
                </div>
            )}

             {/* Add other modals here: EditCustomer, ManageAddresses, AdjustLoyalty, ViewFullHistory */}

        </div>
    );
}

export default CustomerManagementPage;

