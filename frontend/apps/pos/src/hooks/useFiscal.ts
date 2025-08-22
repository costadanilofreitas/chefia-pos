/**
 * Hook para gerenciar operações fiscais
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import fiscalService, { FiscalDocument, FiscalConfig, ContingencyMode } from '../services/FiscalService';
import { useToast } from './useToast';

interface UseFiscalReturn {
  // Estados
  documents: FiscalDocument[];
  config: FiscalConfig;
  contingency: ContingencyMode;
  loading: boolean;
  error: string | null;
  
  // Ações de documentos
  loadDocuments: (filters?: any) => Promise<void>;
  emitDocument: (orderId: string, type: FiscalDocument['type']) => Promise<void>;
  cancelDocument: (documentId: string, reason: string) => Promise<void>;
  retryDocument: (documentId: string) => Promise<void>;
  downloadXML: (documentId: string) => Promise<void>;
  downloadPDF: (documentId: string) => Promise<void>;
  printDocument: (documentId: string) => Promise<void>;
  
  // Ações de configuração
  loadConfig: () => Promise<void>;
  updateConfig: (config: Partial<FiscalConfig>) => Promise<void>;
  
  // Ações de contingência
  toggleContingency: (active: boolean, reason?: string) => Promise<void>;
  
  // Ações de relatórios
  generateReport: (reportType: string, dateRange: { startDate: string; endDate: string }) => Promise<void>;
  
  // Ações de sincronização
  syncDocuments: () => Promise<void>;
}

export const useFiscal = (): UseFiscalReturn => {
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [config, setConfig] = useState<FiscalConfig>({
    environment: 'homologation',
    cnpj: '',
    stateRegistration: '',
    legalName: '',
    tradeName: '',
    certificate: null
  });
  const [contingency, setContingency] = useState<ContingencyMode>({
    active: false,
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError, info } = useToast();
  
  // Use ref to track first load to avoid re-creating callback
  const isFirstLoadRef = useRef(true);
  const hasShownEmptyMessageRef = useRef(false);

  // Carrega documentos
  const loadDocuments = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const docs = await fiscalService.getDocuments(filters);
      setDocuments(docs);
      
      // Only show message once on the very first load without filters
      if (docs.length === 0 && 
          !hasShownEmptyMessageRef.current && 
          (!filters || Object.keys(filters).length === 0)) {
        info('Nenhum documento fiscal encontrado');
        hasShownEmptyMessageRef.current = true;
      }
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar documentos';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [info, showError]);

  // Carrega configuração
  const loadConfig = useCallback(async () => {
    try {
      const fiscalConfig = await fiscalService.getConfig();
      setConfig(fiscalConfig);
      
      // Verifica status da contingência
      const contingencyStatus = await fiscalService.getContingencyStatus();
      setContingency(contingencyStatus);
    } catch (err: any) {
      // Usa valores padrão se falhar
    }
  }, []);

  // Emite documento fiscal
  const emitDocument = useCallback(async (orderId: string, type: FiscalDocument['type']) => {
    try {
      setLoading(true);
      const doc = await fiscalService.emitDocument(orderId, type);
      
      // Adiciona à lista
      setDocuments(prev => [doc, ...prev]);
      
      success(`Documento fiscal ${doc.number} emitido com sucesso`);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao emitir documento fiscal';
      showError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  // Cancela documento
  const cancelDocument = useCallback(async (documentId: string, reason: string) => {
    try {
      setLoading(true);
      const doc = await fiscalService.cancelDocument(documentId, reason);
      
      // Atualiza na lista
      setDocuments(prev => prev.map(d => d.id === documentId ? doc : d));
      
      success('Documento cancelado com sucesso');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao cancelar documento';
      showError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  // Reprocessa documento
  const retryDocument = useCallback(async (documentId: string) => {
    try {
      setLoading(true);
      const doc = await fiscalService.retryDocument(documentId);
      
      // Atualiza na lista
      setDocuments(prev => prev.map(d => d.id === documentId ? doc : d));
      
      success('Documento reprocessado com sucesso');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao reprocessar documento';
      showError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  // Download XML
  const downloadXML = useCallback(async (documentId: string) => {
    try {
      const blob = await fiscalService.downloadXML(documentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documento_${documentId}.xml`;
      link.click();
      URL.revokeObjectURL(url);
      
      success('XML baixado com sucesso');
    } catch (err: any) {
      showError('Erro ao baixar XML');
    }
  }, [success, showError]);

  // Download PDF
  const downloadPDF = useCallback(async (documentId: string) => {
    try {
      const blob = await fiscalService.downloadPDF(documentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documento_${documentId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      success('PDF baixado com sucesso');
    } catch (err: any) {
      showError('Erro ao baixar PDF');
    }
  }, [success, showError]);

  // Imprime documento
  const printDocument = useCallback(async (documentId: string) => {
    try {
      await fiscalService.printDocument(documentId);
      success('Documento enviado para impressão');
    } catch (err: any) {
      showError('Erro ao imprimir documento');
    }
  }, [success, showError]);

  // Atualiza configuração
  const updateConfig = useCallback(async (newConfig: Partial<FiscalConfig>) => {
    try {
      setLoading(true);
      const updated = await fiscalService.updateConfig(newConfig);
      setConfig(updated);
      success('Configuração atualizada com sucesso');
    } catch (err: any) {
      showError('Erro ao atualizar configuração');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  // Alterna contingência
  const toggleContingency = useCallback(async (active: boolean, reason?: string) => {
    try {
      setLoading(true);
      const status = await fiscalService.toggleContingency(active, reason);
      setContingency(status);
      
      if (active) {
        info('Modo de contingência ativado');
      } else {
        success('Modo de contingência desativado');
      }
    } catch (err: any) {
      showError('Erro ao alterar modo de contingência');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, info, showError]);

  // Gera relatório
  const generateReport = useCallback(async (
    reportType: string,
    dateRange: { startDate: string; endDate: string }
  ) => {
    try {
      setLoading(true);
      info('Gerando relatório...');
      
      const blob = await fiscalService.generateReport(reportType, dateRange);
      
      // Faz download do arquivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const reportNames: { [key: string]: string } = {
        'book_entries': 'Livro_Entradas',
        'book_outputs': 'Livro_Saidas',
        'sped_fiscal': 'SPED_Fiscal',
        'icms_calculation': 'Apuracao_ICMS',
        'inventory_register': 'Registro_Inventario',
        'xml_export': 'XMLs_Exportados'
      };
      
      const fileName = `${reportNames[reportType] || 'Relatorio'}_${dateRange.startDate}_${dateRange.endDate}.pdf`;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      success('Relatório gerado com sucesso');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao gerar relatório';
      showError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [info, success, showError]);

  // Sincroniza documentos
  const syncDocuments = useCallback(async () => {
    try {
      setLoading(true);
      info('Sincronizando documentos...');
      
      const result = await fiscalService.syncDocuments();
      
      if (result.synced > 0) {
        success(`${result.synced} documentos sincronizados`);
      }
      
      if (result.failed > 0) {
        showError(`${result.failed} documentos falharam na sincronização`);
      }
      
      if (result.pending > 0) {
        info(`${result.pending} documentos pendentes`);
      }
      
      // Recarrega documentos
      await loadDocuments();
    } catch (err: any) {
      showError('Erro ao sincronizar documentos');
    } finally {
      setLoading(false);
    }
  }, [info, success, showError, loadDocuments]);

  // Carrega apenas configuração inicial (documentos serão carregados pelo componente)
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    // Estados
    documents,
    config,
    contingency,
    loading,
    error,
    
    // Ações
    loadDocuments,
    emitDocument,
    cancelDocument,
    retryDocument,
    downloadXML,
    downloadPDF,
    printDocument,
    loadConfig,
    updateConfig,
    toggleContingency,
    generateReport,
    syncDocuments
  };
};

export default useFiscal;