// src/services/ConfigService.ts
export interface TerminalConfig {
  terminal_id: string;
  terminal_name: string;
  printer_configs: PrinterConfig[];
  default_printer: string;
  allow_discounts: boolean;
  max_discount_percent: number;
  allow_price_override: boolean;
  allow_returns: boolean;
  default_payment_method: string;
  tax_included: boolean;
  currency_symbol: string;
  decimal_places: number;
}

export interface PrinterConfig {
  name: string;
  type: 'kitchen' | 'receipt' | 'bar';
  model: string;
  connection_type: 'network' | 'usb' | 'bluetooth';
  connection_params: Record<string, any>;
}

class ConfigService {
  private static instance: ConfigService;
  private configCache: Map<string, TerminalConfig> = new Map();
  private availableTerminals: string[] = [];

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Carrega a configuração de um terminal específico
   */
  public async loadTerminalConfig(terminalId: string): Promise<TerminalConfig | null> {
    try {
      // Verificar cache primeiro
      if (this.configCache.has(terminalId)) {
        return this.configCache.get(terminalId)!;
      }

      // Tentar carregar do backend primeiro
      try {
        const response = await fetch(`/api/v1/config/pos/${terminalId}`);
        if (response.ok) {
          const config = await response.json();
          this.configCache.set(terminalId, config);
          return config;
        }
      } catch (error) {
        console.warn(`Erro ao carregar config do backend para terminal ${terminalId}:`, error);
      }

      // Fallback: carregar do arquivo local
      const response = await fetch(`/config/pos/${terminalId}.json`);
      if (!response.ok) {
        console.error(`Configuração não encontrada para terminal ${terminalId}`);
        return null;
      }

      const config: TerminalConfig = await response.json();
      this.configCache.set(terminalId, config);
      return config;
    } catch (error) {
      console.error(`Erro ao carregar configuração do terminal ${terminalId}:`, error);
      return null;
    }
  }

  /**
   * Carrega lista de terminais disponíveis
   */
  public async loadAvailableTerminals(): Promise<string[]> {
    try {
      // Tentar carregar do backend primeiro
      try {
        const response = await fetch('/api/v1/config/pos/terminals');
        if (response.ok) {
          const terminals = await response.json();
          this.availableTerminals = terminals;
          return terminals;
        }
      } catch (error) {
        console.warn('Erro ao carregar terminais do backend:', error);
      }

      // Fallback: verificar arquivos locais
      const terminals: string[] = [];
      for (let i = 1; i <= 10; i++) {
        try {
          const response = await fetch(`/config/pos/${i}.json`);
          if (response.ok) {
            terminals.push(i.toString());
          }
        } catch {
          // Arquivo não existe, continuar
        }
      }

      this.availableTerminals = terminals;
      return terminals;
    } catch (error) {
      console.error('Erro ao carregar terminais disponíveis:', error);
      // Fallback padrão
      return ['1'];
    }
  }

  /**
   * Verifica se um terminal é válido
   */
  public async isValidTerminal(terminalId: string): Promise<boolean> {
    if (this.availableTerminals.length === 0) {
      await this.loadAvailableTerminals();
    }
    return this.availableTerminals.includes(terminalId);
  }

  /**
   * Obtém terminais disponíveis (cache)
   */
  public getAvailableTerminals(): string[] {
    return this.availableTerminals;
  }

  /**
   * Limpa cache de configurações
   */
  public clearCache(): void {
    this.configCache.clear();
    this.availableTerminals = [];
  }

  /**
   * Cria configuração padrão para um novo terminal
   */
  public createDefaultConfig(terminalId: string): TerminalConfig {
    return {
      terminal_id: `POS${terminalId.padStart(3, '0')}`,
      terminal_name: `Caixa ${terminalId}`,
      printer_configs: [
        {
          name: 'Recibo',
          type: 'receipt',
          model: 'Generic Thermal',
          connection_type: 'usb',
          connection_params: { vendor_id: '0x04b8', product_id: '0x0e15' }
        }
      ],
      default_printer: 'Recibo',
      allow_discounts: true,
      max_discount_percent: 15.0,
      allow_price_override: false,
      allow_returns: true,
      default_payment_method: 'cash',
      tax_included: true,
      currency_symbol: 'R$',
      decimal_places: 2
    };
  }

  /**
   * Salva configuração de terminal (para futuro uso)
   */
  public async saveTerminalConfig(terminalId: string, config: TerminalConfig): Promise<boolean> {
    try {
      // Tentar salvar no backend
      const response = await fetch(`/api/v1/config/pos/${terminalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        this.configCache.set(terminalId, config);
        return true;
      }
    } catch (error) {
      console.error(`Erro ao salvar configuração do terminal ${terminalId}:`, error);
    }
    return false;
  }
}

export default ConfigService;

