// /home/ubuntu/pos-modern/src/supplier/ui/SupplierManagementPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SupplierManagementPage.css';

const SupplierManagementPage = () => {
  const navigate = useNavigate();
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trading_name: '',
    document: '',
    document_type: 'CNPJ',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'Brasil'
    },
    contacts: [],
    payment_terms: [],
    website: '',
    category: '',
    rating: null,
    is_active: true,
    notes: ''
  });
  const [searchQuery, setSearchQuery] = useState({
    name: '',
    category: '',
    is_active: true,
    state: ''
  });
  const [stats, setStats] = useState(null);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [currentTab, setCurrentTab] = useState('suppliers');
  
  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchStats();
  }, []);
  
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/v1/suppliers/query', {
        name: searchQuery.name || null,
        category: searchQuery.category || null,
        is_active: searchQuery.is_active,
        state: searchQuery.state || null,
        limit: 100,
        offset: 0
      });
      
      setSuppliers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to fetch suppliers. Please try again.');
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/v1/suppliers/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching supplier statistics:', err);
    }
  };
  
  const fetchPurchaseOrders = async (supplierId) => {
    try {
      setLoading(true);
      
      const response = await axios.get('/api/v1/purchase-orders', {
        params: {
          supplier_id: supplierId
        }
      });
      
      setPurchaseOrders(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError('Failed to fetch purchase orders. Please try again.');
      setLoading(false);
    }
  };
  
  const handleSearch = () => {
    fetchSuppliers();
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery({
      ...searchQuery,
      [name]: value
    });
  };
  
  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData(supplier);
    setIsEditing(false);
    setShowPurchaseOrders(false);
  };
  
  const handleShowPurchaseOrders = (supplier) => {
    setSelectedSupplier(supplier);
    setShowPurchaseOrders(true);
    fetchPurchaseOrders(supplier.id);
  };
  
  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    setFormData({
      name: '',
      trading_name: '',
      document: '',
      document_type: 'CNPJ',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'Brasil'
      },
      contacts: [],
      payment_terms: [],
      website: '',
      category: '',
      rating: null,
      is_active: true,
      notes: ''
    });
    setIsCreating(true);
    setIsEditing(true);
  };
  
  const handleEditSupplier = () => {
    setIsEditing(true);
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleAddContact = () => {
    setFormData({
      ...formData,
      contacts: [
        ...formData.contacts,
        {
          name: '',
          role: '',
          email: '',
          phone: '',
          is_primary: formData.contacts.length === 0,
          notes: ''
        }
      ]
    });
  };
  
  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      contacts: updatedContacts
    });
  };
  
  const handleRemoveContact = (index) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts.splice(index, 1);
    
    // Ensure there's a primary contact if there are any contacts
    if (updatedContacts.length > 0 && !updatedContacts.some(c => c.is_primary)) {
      updatedContacts[0].is_primary = true;
    }
    
    setFormData({
      ...formData,
      contacts: updatedContacts
    });
  };
  
  const handleSetPrimaryContact = (index) => {
    const updatedContacts = formData.contacts.map((contact, i) => ({
      ...contact,
      is_primary: i === index
    }));
    
    setFormData({
      ...formData,
      contacts: updatedContacts
    });
  };
  
  const handleAddPaymentTerm = () => {
    setFormData({
      ...formData,
      payment_terms: [
        ...formData.payment_terms,
        {
          days: 30,
          discount_percentage: 0,
          description: ''
        }
      ]
    });
  };
  
  const handlePaymentTermChange = (index, field, value) => {
    const updatedTerms = [...formData.payment_terms];
    updatedTerms[index] = {
      ...updatedTerms[index],
      [field]: field === 'days' ? parseInt(value) : field === 'discount_percentage' ? parseFloat(value) : value
    };
    
    setFormData({
      ...formData,
      payment_terms: updatedTerms
    });
  };
  
  const handleRemovePaymentTerm = (index) => {
    const updatedTerms = [...formData.payment_terms];
    updatedTerms.splice(index, 1);
    
    setFormData({
      ...formData,
      payment_terms: updatedTerms
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (isCreating) {
        // Create new supplier
        await axios.post('/api/v1/suppliers', formData);
      } else {
        // Update existing supplier
        await axios.put(`/api/v1/suppliers/${selectedSupplier.id}`, formData);
      }
      
      // Refresh suppliers list
      fetchSuppliers();
      fetchStats();
      
      // Reset form
      setIsEditing(false);
      setIsCreating(false);
      setSelectedSupplier(null);
      
      setLoading(false);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier. Please check the form and try again.');
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    if (isCreating) {
      setIsCreating(false);
    } else {
      setFormData(selectedSupplier);
      setIsEditing(false);
    }
  };
  
  const handleDeleteSupplier = async () => {
    if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      await axios.delete(`/api/v1/suppliers/${selectedSupplier.id}`);
      
      // Refresh suppliers list
      fetchSuppliers();
      fetchStats();
      
      // Reset selection
      setSelectedSupplier(null);
      
      setLoading(false);
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. It may have active purchase orders.');
      setLoading(false);
    }
  };
  
  const handleCreatePurchaseOrder = () => {
    // Navigate to purchase order creation page with supplier pre-selected
    navigate(`/purchase-orders/new?supplier=${selectedSupplier.id}`);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'draft':
        return 'status-draft';
      case 'sent':
        return 'status-sent';
      case 'confirmed':
        return 'status-confirmed';
      case 'partially_received':
        return 'status-partially-received';
      case 'received':
        return 'status-received';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  return (
    <div className="supplier-management-container">
      <h1>Gestão de Fornecedores</h1>
      
      <div className="tabs">
        <button 
          className={`tab-button ${currentTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setCurrentTab('suppliers')}
        >
          Fornecedores
        </button>
        <button 
          className={`tab-button ${currentTab === 'purchase-orders' ? 'active' : ''}`}
          onClick={() => setCurrentTab('purchase-orders')}
        >
          Pedidos de Compra
        </button>
      </div>
      
      {currentTab === 'suppliers' && (
        <>
          <div className="supplier-dashboard">
            <div className="supplier-search-panel">
              <h2>Buscar Fornecedores</h2>
              <div className="search-form">
                <div className="form-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    name="name"
                    value={searchQuery.name}
                    onChange={handleInputChange}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                
                <div className="form-group">
                  <label>Categoria</label>
                  <input
                    type="text"
                    name="category"
                    value={searchQuery.category}
                    onChange={handleInputChange}
                    placeholder="Categoria"
                  />
                </div>
                
                <div className="form-group">
                  <label>Estado</label>
                  <input
                    type="text"
                    name="state"
                    value={searchQuery.state}
                    onChange={handleInputChange}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={searchQuery.is_active}
                      onChange={(e) => setSearchQuery({
                        ...searchQuery,
                        is_active: e.target.checked
                      })}
                    />
                    Apenas ativos
                  </label>
                </div>
                
                <button className="search-button" onClick={handleSearch}>
                  Buscar
                </button>
              </div>
              
              {stats && (
                <div className="supplier-stats">
                  <h3>Estatísticas</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{stats.total_suppliers}</div>
                      <div className="stat-label">Total de Fornecedores</div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-value">{stats.active_suppliers}</div>
                      <div className="stat-label">Fornecedores Ativos</div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-value">{stats.inactive_suppliers}</div>
                      <div className="stat-label">Fornecedores Inativos</div>
                    </div>
                  </div>
                  
                  {stats.by_category && Object.keys(stats.by_category).length > 0 && (
                    <div className="stat-section">
                      <h4>Por Categoria</h4>
                      <div className="stat-bars">
                        {Object.entries(stats.by_category)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([category, count]) => (
                            <div key={category} className="stat-bar-item">
                              <div className="stat-bar-label">{category}</div>
                              <div className="stat-bar-container">
                                <div 
                                  className="stat-bar" 
                                  style={{ width: `${(count / stats.total_suppliers) * 100}%` }}
                                ></div>
                              </div>
                              <div className="stat-bar-value">{count}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="action-buttons">
                <button className="create-button" onClick={handleCreateSupplier}>
                  Novo Fornecedor
                </button>
              </div>
            </div>
            
            <div className="supplier-list-panel">
              <h2>Fornecedores</h2>
              
              {loading ? (
                <div className="loading">Carregando...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <div className="supplier-list">
                  {suppliers.length === 0 ? (
                    <div className="empty-list">Nenhum fornecedor encontrado.</div>
                  ) : (
                    suppliers.map(supplier => (
                      <div 
                        key={supplier.id} 
                        className={`supplier-card ${selectedSupplier && selectedSupplier.id === supplier.id ? 'selected' : ''} ${!supplier.is_active ? 'inactive' : ''}`}
                        onClick={() => handleSelectSupplier(supplier)}
                      >
                        <div className="supplier-card-header">
                          <h3>{supplier.name}</h3>
                          {supplier.rating && (
                            <div className="supplier-rating">
                              {'★'.repeat(supplier.rating)}
                              {'☆'.repeat(5 - supplier.rating)}
                            </div>
                          )}
                        </div>
                        
                        <div className="supplier-card-content">
                          {supplier.trading_name && (
                            <div className="supplier-field">
                              <span className="field-label">Nome Fantasia:</span>
                              <span className="field-value">{supplier.trading_name}</span>
                            </div>
                          )}
                          
                          <div className="supplier-field">
                            <span className="field-label">CNPJ/CPF:</span>
                            <span className="field-value">{supplier.document}</span>
                          </div>
                          
                          {supplier.category && (
                            <div className="supplier-field">
                              <span className="field-label">Categoria:</span>
                              <span className="field-value">{supplier.category}</span>
                            </div>
                          )}
                          
                          <div className="supplier-field">
                            <span className="field-label">Cidade/UF:</span>
                            <span className="field-value">{supplier.address.city}/{supplier.address.state}</span>
                          </div>
                          
                          {supplier.contacts && supplier.contacts.length > 0 && (
                            <div className="supplier-field">
                              <span className="field-label">Contato:</span>
                              <span className="field-value">
                                {supplier.contacts.find(c => c.is_primary)?.name || supplier.contacts[0].name}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="supplier-card-footer">
                          <button 
                            className="view-orders-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowPurchaseOrders(supplier);
                            }}
                          >
                            Ver Pedidos
                          </button>
                          
                          {!supplier.is_active && (
                            <span className="inactive-badge">Inativo</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {selectedSupplier && !isEditing && !showPurchaseOrders && (
              <div className="supplier-details-panel">
                <h2>Detalhes do Fornecedor</h2>
                
                <div className="supplier-details">
                  <div className="details-header">
                    <h3>{selectedSupplier.name}</h3>
                    {selectedSupplier.rating && (
                      <div className="supplier-rating large">
                        {'★'.repeat(selectedSupplier.rating)}
                        {'☆'.repeat(5 - selectedSupplier.rating)}
                      </div>
                    )}
                    {!selectedSupplier.is_active && (
                      <span className="inactive-badge large">Inativo</span>
                    )}
                  </div>
                  
                  <div className="details-section">
                    <h4>Informações Gerais</h4>
                    
                    <div className="details-grid">
                      {selectedSupplier.trading_name && (
                        <div className="detail-item">
                          <span className="detail-label">Nome Fantasia:</span>
                          <span className="detail-value">{selectedSupplier.trading_name}</span>
                        </div>
                      )}
                      
                      <div className="detail-item">
                        <span className="detail-label">{selectedSupplier.document_type}:</span>
                        <span className="detail-value">{selectedSupplier.document}</span>
                      </div>
                      
                      {selectedSupplier.category && (
                        <div className="detail-item">
                          <span className="detail-label">Categoria:</span>
                          <span className="detail-value">{selectedSupplier.category}</span>
                        </div>
                      )}
                      
                      {selectedSupplier.website && (
                        <div className="detail-item">
                          <span className="detail-label">Website:</span>
                          <span className="detail-value">
                            <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer">
                              {selectedSupplier.website}
                            </a>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="details-section">
                    <h4>Endereço</h4>
                    
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Logradouro:</span>
                        <span className="detail-value">
                          {selectedSupplier.address.street}, {selectedSupplier.address.number}
                          {selectedSupplier.address.complement && ` - ${selectedSupplier.address.complement}`}
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Bairro:</span>
                        <span className="detail-value">{selectedSupplier.address.neighborhood}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Cidade/UF:</span>
                        <span className="detail-value">
                          {selectedSupplier.address.city}/{selectedSupplier.address.state}
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">CEP:</span>
                        <span className="detail-value">{selectedSupplier.address.zip_code}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">País:</span>
                        <span className="detail-value">{selectedSupplier.address.country}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedSupplier.contacts && selectedSupplier.contacts.length > 0 && (
                    <div className="details-section">
                      <h4>Contatos</h4>
                      
                      {selectedSupplier.contacts.map((contact, index) => (
                        <div key={index} className={`contact-card ${contact.is_primary ? 'primary' : ''}`}>
                          <div className="contact-header">
                            <h5>{contact.name}</h5>
                            {contact.is_primary && <span className="primary-badge">Principal</span>}
                          </div>
                          
                          <div className="contact-details">
                            {contact.role && (
                              <div className="contact-field">
                                <span className="field-label">Cargo:</span>
                                <span className="field-value">{contact.role}</span>
                              </div>
                            )}
                            
                            <div className="contact-field">
                              <span className="field-label">Email:</span>
                              <span className="field-value">
                                <a href={`mailto:${contact.email}`}>{contact.email}</a>
                              </span>
                            </div>
                            
                            <div className="contact-field">
                              <span className="field-label">Telefone:</span>
                              <span className="field-value">{contact.phone}</span>
                            </div>
                            
                            {contact.notes && (
                              <div className="contact-field">
                                <span className="field-label">Observações:</span>
                                <span className="field-value">{contact.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedSupplier.payment_terms && selectedSupplier.payment_terms.length > 0 && (
                    <div className="details-section">
                      <h4>Condições de Pagamento</h4>
                      
                      <div className="payment-terms-list">
                        {selectedSupplier.payment_terms.map((term, index) => (
                          <div key={index} className="payment-term-item">
                            <div className="term-days">{term.days} dias</div>
                            {term.discount_percentage > 0 && (
                              <div className="term-discount">{term.discount_percentage}% de desconto</div>
                            )}
                            {term.description && (
                              <div className="term-description">{term.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedSupplier.notes && (
                    <div className="details-section">
                      <h4>Observações</h4>
                      <div className="supplier-notes">{selectedSupplier.notes}</div>
                    </div>
                  )}
                  
                  <div className="details-footer">
                    <button className="edit-button" onClick={handleEditSupplier}>
                      Editar
                    </button>
                    
                    <button className="delete-button" onClick={handleDeleteSupplier}>
                      {selectedSupplier.is_active ? 'Desativar' : 'Excluir'}
                    </button>
                    
                    <button className="create-order-button" onClick={handleCreatePurchaseOrder}>
                      Novo Pedido
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {(isEditing || isCreating) && (
              <div className="supplier-form-panel">
                <h2>{isCreating ? 'Novo Fornecedor' : 'Editar Fornecedor'}</h2>
                
                <form onSubmit={handleSubmit} className="supplier-form">
                  <div className="form-section">
                    <h3>Informações Gerais</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nome *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Nome Fantasia</label>
                        <input
                          type="text"
                          name="trading_name"
                          value={formData.trading_name || ''}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de Documento *</label>
                        <select
                          name="document_type"
                          value={formData.document_type}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="CNPJ">CNPJ</option>
                          <option value="CPF">CPF</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>{formData.document_type} *</label>
                        <input
                          type="text"
                          name="document"
                          value={formData.document}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Categoria</label>
                        <input
                          type="text"
                          name="category"
                          value={formData.category || ''}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Website</label>
                        <input
                          type="url"
                          name="website"
                          value={formData.website || ''}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Avaliação</label>
                        <select
                          name="rating"
                          value={formData.rating || ''}
                          onChange={handleFormChange}
                        >
                          <option value="">Sem avaliação</option>
                          <option value="1">1 estrela</option>
                          <option value="2">2 estrelas</option>
                          <option value="3">3 estrelas</option>
                          <option value="4">4 estrelas</option>
                          <option value="5">5 estrelas</option>
                        </select>
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({
                              ...formData,
                              is_active: e.target.checked
                            })}
                          />
                          Ativo
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <h3>Endereço</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Logradouro *</label>
                        <input
                          type="text"
                          name="address.street"
                          value={formData.address.street}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Número *</label>
                        <input
                          type="text"
                          name="address.number"
                          value={formData.address.number}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Complemento</label>
                        <input
                          type="text"
                          name="address.complement"
                          value={formData.address.complement || ''}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Bairro *</label>
                        <input
                          type="text"
                          name="address.neighborhood"
                          value={formData.address.neighborhood}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Cidade *</label>
                        <input
                          type="text"
                          name="address.city"
                          value={formData.address.city}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Estado *</label>
                        <input
                          type="text"
                          name="address.state"
                          value={formData.address.state}
                          onChange={handleFormChange}
                          maxLength={2}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>CEP *</label>
                        <input
                          type="text"
                          name="address.zip_code"
                          value={formData.address.zip_code}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>País *</label>
                        <input
                          type="text"
                          name="address.country"
                          value={formData.address.country}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <h3>Contatos</h3>
                    
                    {formData.contacts.map((contact, index) => (
                      <div key={index} className="contact-form">
                        <div className="contact-form-header">
                          <h4>Contato #{index + 1}</h4>
                          <button 
                            type="button" 
                            className="remove-button"
                            onClick={() => handleRemoveContact(index)}
                          >
                            Remover
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Nome *</label>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Cargo</label>
                            <input
                              type="text"
                              value={contact.role || ''}
                              onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Email *</label>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Telefone *</label>
                            <input
                              type="text"
                              value={contact.phone}
                              onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group checkbox-group">
                            <label>
                              <input
                                type="checkbox"
                                checked={contact.is_primary}
                                onChange={() => handleSetPrimaryContact(index)}
                              />
                              Contato Principal
                            </label>
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Observações</label>
                            <textarea
                              value={contact.notes || ''}
                              onChange={(e) => handleContactChange(index, 'notes', e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      type="button" 
                      className="add-button"
                      onClick={handleAddContact}
                    >
                      Adicionar Contato
                    </button>
                  </div>
                  
                  <div className="form-section">
                    <h3>Condições de Pagamento</h3>
                    
                    {formData.payment_terms.map((term, index) => (
                      <div key={index} className="payment-term-form">
                        <div className="payment-term-form-header">
                          <h4>Condição #{index + 1}</h4>
                          <button 
                            type="button" 
                            className="remove-button"
                            onClick={() => handleRemovePaymentTerm(index)}
                          >
                            Remover
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Prazo (dias) *</label>
                            <input
                              type="number"
                              min="0"
                              value={term.days}
                              onChange={(e) => handlePaymentTermChange(index, 'days', e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Desconto (%)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={term.discount_percentage}
                              onChange={(e) => handlePaymentTermChange(index, 'discount_percentage', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Descrição</label>
                            <input
                              type="text"
                              value={term.description || ''}
                              onChange={(e) => handlePaymentTermChange(index, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      type="button" 
                      className="add-button"
                      onClick={handleAddPaymentTerm}
                    >
                      Adicionar Condição de Pagamento
                    </button>
                  </div>
                  
                  <div className="form-section">
                    <h3>Observações</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <textarea
                          name="notes"
                          value={formData.notes || ''}
                          onChange={handleFormChange}
                          rows={4}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-footer">
                    <button type="button" className="cancel-button" onClick={handleCancel}>
                      Cancelar
                    </button>
                    
                    <button type="submit" className="save-button" disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {showPurchaseOrders && selectedSupplier && (
              <div className="purchase-orders-panel">
                <h2>Pedidos de Compra - {selectedSupplier.name}</h2>
                
                <button 
                  className="back-button"
                  onClick={() => {
                    setShowPurchaseOrders(false);
                    setSelectedSupplier(null);
                  }}
                >
                  Voltar
                </button>
                
                <button 
                  className="create-order-button"
                  onClick={handleCreatePurchaseOrder}
                >
                  Novo Pedido
                </button>
                
                {loading ? (
                  <div className="loading">Carregando pedidos...</div>
                ) : (
                  <div className="purchase-orders-list">
                    {purchaseOrders.length === 0 ? (
                      <div className="empty-list">Nenhum pedido encontrado para este fornecedor.</div>
                    ) : (
                      <table className="purchase-orders-table">
                        <thead>
                          <tr>
                            <th>Número</th>
                            <th>Data</th>
                            <th>Status</th>
                            <th>Valor Total</th>
                            <th>Entrega Prevista</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseOrders.map(order => (
                            <tr key={order.id}>
                              <td>{order.order_number}</td>
                              <td>{formatDate(order.created_at)}</td>
                              <td>
                                <span className={`status-badge ${getStatusClass(order.status)}`}>
                                  {order.status === 'draft' && 'Rascunho'}
                                  {order.status === 'sent' && 'Enviado'}
                                  {order.status === 'confirmed' && 'Confirmado'}
                                  {order.status === 'partially_received' && 'Recebido Parcialmente'}
                                  {order.status === 'received' && 'Recebido'}
                                  {order.status === 'cancelled' && 'Cancelado'}
                                </span>
                              </td>
                              <td>{formatCurrency(order.total_amount)}</td>
                              <td>{order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '-'}</td>
                              <td>
                                <button 
                                  className="view-button"
                                  onClick={() => navigate(`/purchase-orders/${order.id}`)}
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      {currentTab === 'purchase-orders' && (
        <div className="purchase-orders-dashboard">
          <h2>Implementação em andamento...</h2>
          <p>A visualização completa de pedidos de compra estará disponível em breve.</p>
          <button 
            className="create-button"
            onClick={() => navigate('/purchase-orders/new')}
          >
            Novo Pedido de Compra
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierManagementPage;
