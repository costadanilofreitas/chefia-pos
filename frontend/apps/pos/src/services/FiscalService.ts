/**
 * Serviço para operações fiscais
 */

import { apiInterceptor } from './ApiInterceptor';

export interface FiscalDocument {
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
  issuedAt: Date | string;
  xml: string;
  pdf?: string;
  qrCode?: string;
  errorMessage?: string;
}

export interface FiscalConfig {
  environment: 'production' | 'homologation';
  cnpj: string;
  stateRegistration: string;
  legalName: string;
  tradeName: string;
  certificate: {
    expiresAt: Date | string;
    valid: boolean;
  } | null;
}

export interface FiscalReport {
  type: string;
  startDate: string;
  endDate: string;
  format: 'pdf' | 'xml' | 'csv' | 'xlsx';
}

export interface ContingencyMode {
  active: boolean;
  reason: string;
  startedAt?: Date | string;
}

class FiscalService {
  private baseUrl = '/api/v1/fiscal';

  /**
   * Busca documentos fiscais
   */
  async getDocuments(filters?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<FiscalDocument[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      const response = await apiInterceptor.get(`${this.baseUrl}/documents?${params.toString()}`);
      
      // Se não houver dados, retorna array vazio
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((doc: any) => ({
        ...doc,
        issuedAt: doc.issuedAt || new Date().toISOString()
      }));
    } catch (error: any) {
      console.error('Erro ao buscar documentos fiscais:', error);
      
      // Se for 404 ou sem dados, retorna array vazio
      if (error.response?.status === 404 || error.response?.status === 204) {
        return [];
      }
      
      // Para outros erros, pode lançar ou retornar vazio dependendo do caso
      return [];
    }
  }

  /**
   * Busca documento fiscal específico
   */
  async getDocument(id: string): Promise<FiscalDocument | null> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/documents/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar documento fiscal:', error);
      return null;
    }
  }

  /**
   * Busca configuração fiscal
   */
  async getConfig(): Promise<FiscalConfig> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/config`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar configuração fiscal:', error);
      
      // Retorna configuração padrão se não houver dados
      return {
        environment: 'homologation',
        cnpj: '',
        stateRegistration: '',
        legalName: '',
        tradeName: '',
        certificate: null
      };
    }
  }

  /**
   * Atualiza configuração fiscal
   */
  async updateConfig(config: Partial<FiscalConfig>): Promise<FiscalConfig> {
    try {
      const response = await apiInterceptor.put(`${this.baseUrl}/config`, config);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar configuração fiscal:', error);
      throw error;
    }
  }

  /**
   * Emite documento fiscal
   */
  async emitDocument(orderId: string, type: FiscalDocument['type']): Promise<FiscalDocument> {
    try {
      const response = await apiInterceptor.post(`${this.baseUrl}/documents`, {
        orderId,
        type
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao emitir documento fiscal:', error);
      throw error;
    }
  }

  /**
   * Cancela documento fiscal
   */
  async cancelDocument(documentId: string, reason: string): Promise<FiscalDocument> {
    try {
      const response = await apiInterceptor.post(`${this.baseUrl}/documents/${documentId}/cancel`, {
        reason
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao cancelar documento fiscal:', error);
      throw error;
    }
  }

  /**
   * Reprocessa documento fiscal com erro
   */
  async retryDocument(documentId: string): Promise<FiscalDocument> {
    try {
      const response = await apiInterceptor.post(`${this.baseUrl}/documents/${documentId}/retry`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao reprocessar documento fiscal:', error);
      throw error;
    }
  }

  /**
   * Baixa XML do documento
   */
  async downloadXML(documentId: string): Promise<Blob> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/documents/${documentId}/xml`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao baixar XML:', error);
      throw error;
    }
  }

  /**
   * Baixa DANFE/DANFCE do documento
   */
  async downloadPDF(documentId: string): Promise<Blob> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/documents/${documentId}/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Imprime documento fiscal
   */
  async printDocument(documentId: string, printerId?: string): Promise<void> {
    try {
      await apiInterceptor.post(`${this.baseUrl}/documents/${documentId}/print`, {
        printerId
      });
    } catch (error: any) {
      console.error('Erro ao imprimir documento:', error);
      throw error;
    }
  }

  /**
   * Busca status da contingência
   */
  async getContingencyStatus(): Promise<ContingencyMode> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/contingency`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar status de contingência:', error);
      
      // Retorna status padrão
      return {
        active: false,
        reason: ''
      };
    }
  }

  /**
   * Ativa/desativa modo de contingência
   */
  async toggleContingency(active: boolean, reason?: string): Promise<ContingencyMode> {
    try {
      const response = await apiInterceptor.post(`${this.baseUrl}/contingency`, {
        active,
        reason: active ? reason : undefined
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao alterar modo de contingência:', error);
      throw error;
    }
  }

  /**
   * Gera relatório fiscal
   */
  async generateReport(reportType: string, dateRange: { startDate: string; endDate: string }, format: string = 'pdf'): Promise<Blob> {
    try {
      const response = await apiInterceptor.post(
        `${this.baseUrl}/reports/${reportType}`,
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format
        },
        {
          responseType: 'blob'
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      
      // Se não houver dados, cria um arquivo vazio ou com mensagem
      if (error.response?.status === 404 || error.response?.status === 204) {
        // Cria um PDF vazio ou com mensagem de "sem dados"
        const emptyMessage = `Sem dados para o período de ${dateRange.startDate} até ${dateRange.endDate}`;
        return new Blob([emptyMessage], { type: 'text/plain' });
      }
      
      throw error;
    }
  }

  /**
   * Sincroniza documentos pendentes
   */
  async syncDocuments(): Promise<{ synced: number; failed: number; pending: number }> {
    try {
      const response = await apiInterceptor.post(`${this.baseUrl}/sync`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao sincronizar documentos:', error);
      
      return {
        synced: 0,
        failed: 0,
        pending: 0
      };
    }
  }

  /**
   * Valida certificado digital
   */
  async validateCertificate(): Promise<{ valid: boolean; expiresAt?: string; message?: string }> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/certificate/validate`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao validar certificado:', error);
      
      return {
        valid: false,
        message: 'Não foi possível validar o certificado'
      };
    }
  }

  /**
   * Faz upload de certificado digital
   */
  async uploadCertificate(file: File, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      formData.append('password', password);

      const response = await apiInterceptor.post(`${this.baseUrl}/certificate/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao fazer upload do certificado:', error);
      throw error;
    }
  }

  /**
   * Consulta status SEFAZ
   */
  async checkSEFAZStatus(state?: string): Promise<{ online: boolean; message: string; services: any[] }> {
    try {
      const response = await apiInterceptor.get(`${this.baseUrl}/sefaz/status`, {
        params: { state }
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao consultar status SEFAZ:', error);
      
      return {
        online: false,
        message: 'Não foi possível consultar o status da SEFAZ',
        services: []
      };
    }
  }
}

// Singleton
const fiscalService = new FiscalService();
export default fiscalService;