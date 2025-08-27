/**
 * Serviço para operações fiscais
 */

import { buildApiUrl } from "../config/api";
import { apiInterceptor } from "./ApiInterceptor";
import logger, { LogSource } from "./LocalLoggerService";

export interface FiscalDocument {
  id: string;
  type: "nfe" | "nfce" | "sat" | "mfe";
  number: string;
  series: string;
  status: "pending" | "authorized" | "cancelled" | "rejected" | "denied";
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
  environment: "production" | "homologation";
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
  format: "pdf" | "xml" | "csv" | "xlsx";
}

export interface ContingencyMode {
  active: boolean;
  reason: string;
  startedAt?: Date | string;
}

class FiscalService {
  private readonly baseUrl = buildApiUrl("/api/v1/fical");

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
      await logger.debug(
        "Buscando documentos fiscais",
        { filters },
        "FiscalService",
        LogSource.FISCAL
      );

      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      const response = await apiInterceptor.get(
        `${this.baseUrl}/documents?${params.toString()}`
      );

      // Se não houver dados, retorna array vazio
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      const documents = response.data.map((doc) => ({
        ...doc,
        issuedAt: doc.issuedAt || new Date().toISOString(),
      }));

      await logger.debug(
        `${documents.length} documentos fiscais encontrados`,
        { count: documents.length },
        "FiscalService",
        LogSource.FISCAL
      );
      return documents;
    } catch (error) {
      await logger.error(
        "Erro ao buscar documentos fiscais",
        { filters, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Sincroniza documentos pendentes
   */
  async syncDocuments(): Promise<{
    synced: number;
    failed: number;
    pending: number;
  }> {
    try {
      await logger.info(
        "Sincronizando documentos fiscais pendentes",
        {},
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.post<{
        synced: number;
        failed: number;
        pending: number;
      }>(`${this.baseUrl}/sync`);

      await logger.info(
        "Sincronização de documentos fiscais concluída",
        response.data,
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.critical(
        "Erro crítico ao sincronizar documentos fiscais",
        error,
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Consulta status SEFAZ
   */
  async checkSEFAZStatus(
    state?: string
  ): Promise<{ online: boolean; message: string; services: Array<unknown> }> {
    try {
      await logger.debug(
        "Consultando status SEFAZ",
        { state },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.get<{
        online: boolean;
        message: string;
        services: Array<unknown>;
      }>(`${this.baseUrl}/sefaz/status`, {
        params: { state },
      });

      await logger.info(
        "Status SEFAZ obtido",
        response.data,
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao consultar status SEFAZ",
        { state, error },
        "FiscalService",
        LogSource.FISCAL
      );

      return {
        online: false,
        message: "Não foi possível consultar o status da SEFAZ",
        services: [],
      };
    }
  }

  /**
   * Busca configuração fiscal
   */
  async getConfig(): Promise<FiscalConfig> {
    try {
      await logger.debug(
        "Buscando configuração fiscal",
        {},
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.get<FiscalConfig>(
        `${this.baseUrl}/config`
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao buscar configuração fiscal",
        error,
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Busca status de contingência
   */
  async getContingencyStatus(): Promise<ContingencyMode> {
    try {
      await logger.debug(
        "Buscando status de contingência",
        {},
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.get<ContingencyMode>(
        `${this.baseUrl}/contingency`
      );

      if (response.data.active) {
        await logger.warn(
          "Sistema em modo de contingência",
          response.data,
          "FiscalService",
          LogSource.FISCAL
        );
      }

      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao buscar status de contingência",
        error,
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Emite documento fiscal
   */
  async emitDocument(orderId: string, type: string): Promise<FiscalDocument> {
    try {
      await logger.info(
        "Emitindo documento fiscal",
        { orderId, type },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.post<FiscalDocument>(
        `${this.baseUrl}/emit`,
        { orderId, type }
      );

      await logger.info(
        "Documento fiscal emitido com sucesso",
        {
          documentId: response.data.id,
          number: response.data.number,
          accessKey: response.data.accessKey,
        },
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.critical(
        "Erro crítico ao emitir documento fiscal",
        { orderId, type, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Cancela documento fiscal
   */
  async cancelDocument(
    documentId: string,
    reason: string
  ): Promise<FiscalDocument> {
    try {
      await logger.warn(
        "Cancelando documento fiscal",
        { documentId, reason },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.post<FiscalDocument>(
        `${this.baseUrl}/documents/${documentId}/cancel`,
        { reason }
      );

      await logger.info(
        "Documento fiscal cancelado",
        { documentId, protocol: response.data.protocol },
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.critical(
        "Erro crítico ao cancelar documento fiscal",
        { documentId, reason, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Reemite documento fiscal
   */
  async retryDocument(documentId: string): Promise<FiscalDocument> {
    try {
      await logger.info(
        "Reemitindo documento fiscal",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.post<FiscalDocument>(
        `${this.baseUrl}/documents/${documentId}/retry`
      );

      await logger.info(
        "Documento fiscal reemitido com sucesso",
        { documentId, status: response.data.status },
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao reemitir documento fiscal",
        { documentId, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Download XML do documento
   */
  async downloadXML(documentId: string): Promise<Blob> {
    try {
      await logger.debug(
        "Fazendo download de XML",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.get<Blob>(
        `${this.baseUrl}/documents/${documentId}/xml`,
        {
          responseType: "blob",
        }
      );

      await logger.debug(
        "XML baixado com sucesso",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao baixar XML do documento",
        { documentId, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Download PDF do documento
   */
  async downloadPDF(documentId: string): Promise<Blob> {
    try {
      await logger.debug(
        "Fazendo download de PDF",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.get<Blob>(
        `${this.baseUrl}/documents/${documentId}/pdf`,
        {
          responseType: "blob",
        }
      );

      await logger.debug(
        "PDF baixado com sucesso",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao baixar PDF do documento",
        { documentId, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Imprime documento fiscal
   */
  async printDocument(documentId: string): Promise<void> {
    try {
      await logger.info(
        "Imprimindo documento fiscal",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );

      await apiInterceptor.post(
        `${this.baseUrl}/documents/${documentId}/print`
      );

      await logger.info(
        "Documento fiscal enviado para impressão",
        { documentId },
        "FiscalService",
        LogSource.FISCAL
      );
    } catch (error) {
      await logger.error(
        "Erro ao imprimir documento fiscal",
        { documentId, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Atualiza configuração fiscal
   */
  async updateConfig(config: Partial<FiscalConfig>): Promise<FiscalConfig> {
    try {
      await logger.info(
        "Atualizando configuração fiscal",
        config,
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.put<FiscalConfig>(
        `${this.baseUrl}/config`,
        config
      );

      await logger.info(
        "Configuração fiscal atualizada",
        response.data,
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.critical(
        "Erro crítico ao atualizar configuração fiscal",
        { config, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Alterna modo de contingência
   */
  async toggleContingency(reason?: string): Promise<ContingencyMode> {
    try {
      await logger.warn(
        "Alternando modo de contingência",
        { reason },
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.post<ContingencyMode>(
        `${this.baseUrl}/contingency/toggle`,
        { reason }
      );

      await logger.warn(
        `Modo de contingência ${response.data.active ? "ATIVADO" : "DESATIVADO"}`,
        response.data,
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.critical(
        "Erro crítico ao alternar modo de contingência",
        { reason, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }

  /**
   * Gera relatório fiscal
   */
  async generateReport(params: FiscalReport): Promise<Blob> {
    try {
      await logger.info(
        "Gerando relatório fiscal",
        params,
        "FiscalService",
        LogSource.FISCAL
      );

      const response = await apiInterceptor.post<Blob>(
        `${this.baseUrl}/reports`,
        params,
        {
          responseType: "blob",
        }
      );

      await logger.info(
        "Relatório fiscal gerado com sucesso",
        { type: params.type, format: params.format },
        "FiscalService",
        LogSource.FISCAL
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao gerar relatório fiscal",
        { params, error },
        "FiscalService",
        LogSource.FISCAL
      );
      throw error;
    }
  }
}

// Singleton
const fiscalService = new FiscalService();
export default fiscalService;
