import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import '../index.css';

interface FiscalDocument {
  id: string;
  type: 'nfe' | 'nfce' | 'sat' | 'mfe';
  number: string;
  series: string;
  status: 'pending' | 'authorized' | 'cancelled' | 'rejected' | 'denied';
  orderId: string;
  customerDocument: string;
  customerName: string;
  totalAmount: number;
  taxAmount: number;
  discount: number;
  accessKey: string;
  protocol: string;
  issuedAt: Date;
  xml: string;
  pdf?: string;
  qrCode?: string;
  errorMessage?: string;
}

interface ContingencyMode {
  active: boolean;
  reason: string;
  startedAt?: Date;
}

export default function FiscalScreenModern() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const [selectedTab, setSelectedTab] = useState<'documents' | 'config' | 'contingency' | 'reports'>('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'nfe' | 'nfce' | 'sat' | 'mfe'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'authorized' | 'cancelled' | 'pending' | 'rejected'>('all');
  const [selectedDocument, setSelectedDocument] = useState<FiscalDocument | null>(null);
  const [contingencyMode, setContingencyMode] = useState<ContingencyMode>({ active: false, reason: '' });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // Use real data from API
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);

  // Load fiscal data on mount
  useEffect(() => {
    // TODO: Load documents from fiscal API
    // loadFiscalDocuments();
    // loadFiscalConfig();
  }, []);

  useEffect(() => {
    if (!terminalId || isNaN(Number(terminalId))) {
      navigate('/');
    }
  }, [terminalId, navigate]);

  // Keyboard shortcuts
  useHotkeys('alt+d', () => setSelectedTab('documents'));
  useHotkeys('alt+c', () => setSelectedTab('config'));
  useHotkeys('alt+r', () => setSelectedTab('reports'));
  useHotkeys('esc', () => setShowDocumentModal(false));

  const getStatusColor = (status: FiscalDocument['status']) => {
    switch (status) {
      case 'authorized': return 'text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-400';
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-400';
      case 'rejected': return 'text-orange-600 bg-orange-50 dark:bg-orange-900 dark:text-orange-400';
      case 'denied': return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: FiscalDocument['status']) => {
    switch (status) {
      case 'authorized': return 'Autorizada';
      case 'cancelled': return 'Cancelada';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitada';
      case 'denied': return 'Denegada';
      default: return status;
    }
  };

  const getDocumentTypeLabel = (type: FiscalDocument['type']) => {
    switch (type) {
      case 'nfe': return 'NF-e';
      case 'nfce': return 'NFC-e';
      case 'sat': return 'SAT';
      case 'mfe': return 'MF-e';
      default: return (type as string).toUpperCase();
    }
  };

  const getDocumentTypeColor = (type: FiscalDocument['type']) => {
    switch (type) {
      case 'nfe': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'nfce': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'sat': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'mfe': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.number.includes(searchTerm) || 
                         doc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.accessKey.includes(searchTerm);
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              Gestão de documentos fiscais eletrônicos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Contingency Mode Indicator */}
            {contingencyMode.active && (
              <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg font-medium text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Contingência Ativa
              </div>
            )}
            
            {/* Environment Badge */}
            <div className={`px-3 py-1.5 rounded-lg font-medium text-sm ${
              fiscalConfig.environment === 'production' 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
            }`}>
              {fiscalConfig.environment === 'production' ? 'Produção' : 'Homologação'}
            </div>
            
            {/* Sync Button */}
            <button className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { key: 'documents', label: 'Documentos', icon: '📄' },
            { key: 'config', label: 'Configurações', icon: '⚙️' },
            { key: 'contingency', label: 'Contingência', icon: '⚠️' },
            { key: 'reports', label: 'Relatórios', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'documents' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Buscar por número, cliente ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 min-w-[300px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="nfe">NF-e</option>
                  <option value="nfce">NFC-e</option>
                  <option value="sat">SAT</option>
                  <option value="mfe">MF-e</option>
                </select>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todos os Status</option>
                  <option value="authorized">Autorizada</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="pending">Pendente</option>
                  <option value="rejected">Rejeitada</option>
                </select>
              </div>
            </div>
            
            {/* Documents List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo/Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getDocumentTypeColor(doc.type)}`}>
                            {getDocumentTypeLabel(doc.type)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {doc.series}-{doc.number}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {doc.customerName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {doc.customerDocument}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(doc.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(doc.status)}`}>
                          {getStatusText(doc.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(doc.issuedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowDocumentModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Visualizar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {doc.status === 'authorized' && (
                            <>
                              <button
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                title="Imprimir"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="Cancelar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {selectedTab === 'config' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Configurações Fiscais
            </h2>
            
            <div className="space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Dados da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CNPJ
                    </label>
                    <p className="text-gray-900 dark:text-white">{fiscalConfig?.cnpj || 'Não configurado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Inscrição Estadual
                    </label>
                    <p className="text-gray-900 dark:text-white">{fiscalConfig?.stateRegistration || 'Não configurado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Razão Social
                    </label>
                    <p className="text-gray-900 dark:text-white">{fiscalConfig?.legalName || 'Não configurado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome Fantasia
                    </label>
                    <p className="text-gray-900 dark:text-white">{fiscalConfig?.tradeName || 'Não configurado'}</p>
                  </div>
                </div>
              </div>
              
              {/* Certificate Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Certificado Digital
                </h3>
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          Certificado Válido
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {fiscalConfig?.certificate?.expiresAt ? `Expira em ${formatDate(fiscalConfig.certificate.expiresAt)}` : 'Não configurado'}
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                      Renovar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {selectedTab === 'contingency' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Modo de Contingência
            </h2>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                contingencyMode.active
                  ? 'bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-300 dark:border-yellow-700'
                  : 'bg-green-50 dark:bg-green-900 border-2 border-green-300 dark:border-green-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {contingencyMode.active ? 'Contingência Ativa' : 'Operação Normal'}
                    </p>
                    {contingencyMode.active && contingencyMode.startedAt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Iniciada em {formatDate(contingencyMode.startedAt)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setContingencyMode({
                      active: !contingencyMode.active,
                      reason: contingencyMode.active ? '' : 'Problema na conexão com SEFAZ',
                      startedAt: contingencyMode.active ? undefined : new Date()
                    })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      contingencyMode.active
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    {contingencyMode.active ? 'Desativar Contingência' : 'Ativar Contingência'}
                  </button>
                </div>
              </div>
              
              {contingencyMode.active && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Motivo da Contingência
                  </label>
                  <textarea
                    value={contingencyMode.reason}
                    onChange={(e) => setContingencyMode({ ...contingencyMode, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {selectedTab === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Relatórios Fiscais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Livro de Entradas', icon: '📥', description: 'Relatório de notas fiscais de entrada' },
                { title: 'Livro de Saídas', icon: '📤', description: 'Relatório de notas fiscais de saída' },
                { title: 'SPED Fiscal', icon: '📊', description: 'Arquivo digital para SPED' },
                { title: 'Apuração ICMS', icon: '💰', description: 'Cálculo e apuração de ICMS' },
                { title: 'Registro de Inventário', icon: '📦', description: 'Controle de estoque fiscal' },
                { title: 'XML Exportação', icon: '📁', description: 'Exportar XMLs do período' }
              ].map((report, index) => (
                <button
                  key={index}
                  className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  <div className="text-3xl mb-3">{report.icon}</div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {report.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Document Details Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {getDocumentTypeLabel(selectedDocument.type)} {selectedDocument.series}-{selectedDocument.number}
                </h2>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chave de Acesso
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {selectedDocument.accessKey}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cliente
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedDocument.customerName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedDocument.customerDocument}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valores
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      Total: {formatCurrency(selectedDocument.totalAmount)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Impostos: {formatCurrency(selectedDocument.taxAmount)}
                    </p>
                  </div>
                </div>
                
                {selectedDocument.qrCode && (
                  <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-32 h-32 bg-white p-2 rounded">
                      {/* QR Code placeholder */}
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                        QR Code
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
                    Baixar XML
                  </button>
                  <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
                    Imprimir DANFE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}