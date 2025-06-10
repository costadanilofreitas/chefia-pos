// src/services/TableLayoutConfig.ts
export interface TableConfig {
  id: string;
  number: number;
  seats: number;
  position: {
    x: number;
    y: number;
  };
  shape: 'round' | 'square' | 'rectangle';
  size: {
    width: number;
    height: number;
  };
  area: string;
  rotation?: number;
}

export interface AreaConfig {
  id: string;
  name: string;
  color: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RestaurantLayoutConfig {
  id: string;
  name: string;
  description: string;
  terminalId: string;
  dimensions: {
    width: number;
    height: number;
  };
  areas: AreaConfig[];
  tables: TableConfig[];
  metadata: {
    restaurantType: 'traditional' | 'fastfood' | 'cafe' | 'bar' | 'foodtruck' | 'custom';
    capacity: number;
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  type: 'traditional' | 'fastfood' | 'cafe' | 'bar' | 'foodtruck';
  preview: string;
  config: Omit<RestaurantLayoutConfig, 'id' | 'terminalId' | 'metadata'>;
}

export class TableLayoutConfigService {
  private static readonly STORAGE_KEY = 'restaurant_layout_config';
  private static readonly TEMPLATES_KEY = 'layout_templates';

  // Salvar configuração do layout
  static saveLayoutConfig(terminalId: string, config: RestaurantLayoutConfig): void {
    try {
      const existingConfigs = this.getAllLayoutConfigs();
      existingConfigs[terminalId] = {
        ...config,
        metadata: {
          ...config.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingConfigs));
    } catch (error) {
      console.error('Erro ao salvar configuração de layout:', error);
      throw new Error('Falha ao salvar configuração de layout');
    }
  }

  // Carregar configuração do layout
  static getLayoutConfig(terminalId: string): RestaurantLayoutConfig | null {
    try {
      const configs = this.getAllLayoutConfigs();
      return configs[terminalId] || null;
    } catch (error) {
      console.error('Erro ao carregar configuração de layout:', error);
      return null;
    }
  }

  // Obter todas as configurações
  static getAllLayoutConfigs(): Record<string, RestaurantLayoutConfig> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return {};
    }
  }

  // Deletar configuração
  static deleteLayoutConfig(terminalId: string): void {
    try {
      const configs = this.getAllLayoutConfigs();
      delete configs[terminalId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Erro ao deletar configuração:', error);
      throw new Error('Falha ao deletar configuração');
    }
  }

  // Exportar configuração
  static exportLayoutConfig(terminalId: string): string {
    const config = this.getLayoutConfig(terminalId);
    if (!config) {
      throw new Error('Configuração não encontrada');
    }
    return JSON.stringify(config, null, 2);
  }

  // Importar configuração
  static importLayoutConfig(terminalId: string, configJson: string): void {
    try {
      const config: RestaurantLayoutConfig = JSON.parse(configJson);
      
      // Validar estrutura básica
      if (!config.areas || !config.tables || !config.dimensions) {
        throw new Error('Configuração inválida: estrutura incompleta');
      }

      // Atualizar IDs
      config.id = `layout_${terminalId}_${Date.now()}`;
      config.terminalId = terminalId;
      config.metadata.updatedAt = new Date().toISOString();

      this.saveLayoutConfig(terminalId, config);
    } catch (error) {
      console.error('Erro ao importar configuração:', error);
      throw new Error('Falha ao importar configuração: formato inválido');
    }
  }

  // Obter templates pré-definidos
  static getLayoutTemplates(): LayoutTemplate[] {
    return [
      {
        id: 'traditional_restaurant',
        name: 'Restaurante Tradicional',
        description: 'Layout clássico com áreas bem definidas e mesas variadas',
        type: 'traditional',
        preview: '/templates/traditional.png',
        config: {
          name: 'Restaurante Tradicional',
          description: 'Layout padrão para restaurantes tradicionais',
          dimensions: { width: 1000, height: 700 },
          areas: [
            {
              id: 'main',
              name: 'Área Principal',
              color: '#e3f2fd',
              bounds: { x: 50, y: 50, width: 600, height: 400 }
            },
            {
              id: 'terrace',
              name: 'Terraço',
              color: '#f3e5f5',
              bounds: { x: 700, y: 50, width: 250, height: 300 }
            },
            {
              id: 'vip',
              name: 'Área VIP',
              color: '#fff3e0',
              bounds: { x: 50, y: 500, width: 400, height: 150 }
            },
            {
              id: 'bar',
              name: 'Bar',
              color: '#e8f5e8',
              bounds: { x: 500, y: 500, width: 450, height: 150 }
            }
          ],
          tables: [
            // Área Principal
            { id: '1', number: 1, seats: 4, position: { x: 100, y: 100 }, shape: 'round', size: { width: 80, height: 80 }, area: 'main' },
            { id: '2', number: 2, seats: 2, position: { x: 250, y: 100 }, shape: 'square', size: { width: 60, height: 60 }, area: 'main' },
            { id: '3', number: 3, seats: 6, position: { x: 400, y: 100 }, shape: 'rectangle', size: { width: 120, height: 80 }, area: 'main' },
            { id: '4', number: 4, seats: 4, position: { x: 100, y: 250 }, shape: 'round', size: { width: 80, height: 80 }, area: 'main' },
            { id: '5', number: 5, seats: 4, position: { x: 250, y: 250 }, shape: 'round', size: { width: 80, height: 80 }, area: 'main' },
            { id: '6', number: 6, seats: 2, position: { x: 400, y: 250 }, shape: 'square', size: { width: 60, height: 60 }, area: 'main' },
            { id: '7', number: 7, seats: 8, position: { x: 150, y: 350 }, shape: 'rectangle', size: { width: 160, height: 80 }, area: 'main' },
            
            // Terraço
            { id: '8', number: 8, seats: 2, position: { x: 720, y: 80 }, shape: 'square', size: { width: 60, height: 60 }, area: 'terrace' },
            { id: '9', number: 9, seats: 2, position: { x: 820, y: 80 }, shape: 'square', size: { width: 60, height: 60 }, area: 'terrace' },
            { id: '10', number: 10, seats: 4, position: { x: 720, y: 180 }, shape: 'round', size: { width: 80, height: 80 }, area: 'terrace' },
            { id: '11', number: 11, seats: 4, position: { x: 820, y: 180 }, shape: 'round', size: { width: 80, height: 80 }, area: 'terrace' },
            
            // VIP
            { id: '12', number: 12, seats: 6, position: { x: 100, y: 530 }, shape: 'rectangle', size: { width: 120, height: 80 }, area: 'vip' },
            { id: '13', number: 13, seats: 4, position: { x: 280, y: 530 }, shape: 'round', size: { width: 80, height: 80 }, area: 'vip' },
            
            // Bar
            { id: '14', number: 14, seats: 2, position: { x: 520, y: 530 }, shape: 'square', size: { width: 60, height: 60 }, area: 'bar' },
            { id: '15', number: 15, seats: 2, position: { x: 620, y: 530 }, shape: 'square', size: { width: 60, height: 60 }, area: 'bar' },
            { id: '16', number: 16, seats: 4, position: { x: 720, y: 530 }, shape: 'round', size: { width: 80, height: 80 }, area: 'bar' },
            { id: '17', number: 17, seats: 2, position: { x: 850, y: 530 }, shape: 'square', size: { width: 60, height: 60 }, area: 'bar' }
          ]
        }
      },
      {
        id: 'fastfood_layout',
        name: 'Fast Food',
        description: 'Layout otimizado para fast food com mesas pequenas e fluxo rápido',
        type: 'fastfood',
        preview: '/templates/fastfood.png',
        config: {
          name: 'Fast Food',
          description: 'Layout para estabelecimentos de fast food',
          dimensions: { width: 800, height: 600 },
          areas: [
            {
              id: 'dining',
              name: 'Área de Alimentação',
              color: '#ffebee',
              bounds: { x: 50, y: 50, width: 700, height: 500 }
            }
          ],
          tables: [
            // Layout em grid para fast food
            { id: '1', number: 1, seats: 2, position: { x: 100, y: 100 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '2', number: 2, seats: 2, position: { x: 200, y: 100 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '3', number: 3, seats: 2, position: { x: 300, y: 100 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '4', number: 4, seats: 2, position: { x: 400, y: 100 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '5', number: 5, seats: 2, position: { x: 500, y: 100 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '6', number: 6, seats: 2, position: { x: 600, y: 100 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            
            { id: '7', number: 7, seats: 4, position: { x: 100, y: 200 }, shape: 'square', size: { width: 70, height: 70 }, area: 'dining' },
            { id: '8', number: 8, seats: 4, position: { x: 220, y: 200 }, shape: 'square', size: { width: 70, height: 70 }, area: 'dining' },
            { id: '9', number: 9, seats: 4, position: { x: 340, y: 200 }, shape: 'square', size: { width: 70, height: 70 }, area: 'dining' },
            { id: '10', number: 10, seats: 4, position: { x: 460, y: 200 }, shape: 'square', size: { width: 70, height: 70 }, area: 'dining' },
            { id: '11', number: 11, seats: 4, position: { x: 580, y: 200 }, shape: 'square', size: { width: 70, height: 70 }, area: 'dining' },
            
            { id: '12', number: 12, seats: 2, position: { x: 100, y: 320 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '13', number: 13, seats: 2, position: { x: 200, y: 320 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '14', number: 14, seats: 2, position: { x: 300, y: 320 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '15', number: 15, seats: 2, position: { x: 400, y: 320 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '16', number: 16, seats: 2, position: { x: 500, y: 320 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            { id: '17', number: 17, seats: 2, position: { x: 600, y: 320 }, shape: 'square', size: { width: 50, height: 50 }, area: 'dining' },
            
            { id: '18', number: 18, seats: 6, position: { x: 200, y: 420 }, shape: 'rectangle', size: { width: 120, height: 80 }, area: 'dining' },
            { id: '19', number: 19, seats: 6, position: { x: 400, y: 420 }, shape: 'rectangle', size: { width: 120, height: 80 }, area: 'dining' }
          ]
        }
      },
      {
        id: 'cafe_layout',
        name: 'Café/Bistro',
        description: 'Layout aconchegante para cafés e bistrôs',
        type: 'cafe',
        preview: '/templates/cafe.png',
        config: {
          name: 'Café/Bistro',
          description: 'Layout para cafés e bistrôs',
          dimensions: { width: 700, height: 500 },
          areas: [
            {
              id: 'indoor',
              name: 'Área Interna',
              color: '#f9fbe7',
              bounds: { x: 50, y: 50, width: 400, height: 400 }
            },
            {
              id: 'outdoor',
              name: 'Área Externa',
              color: '#e0f2f1',
              bounds: { x: 500, y: 50, width: 150, height: 400 }
            }
          ],
          tables: [
            // Área Interna
            { id: '1', number: 1, seats: 2, position: { x: 80, y: 80 }, shape: 'round', size: { width: 60, height: 60 }, area: 'indoor' },
            { id: '2', number: 2, seats: 2, position: { x: 180, y: 80 }, shape: 'round', size: { width: 60, height: 60 }, area: 'indoor' },
            { id: '3', number: 3, seats: 2, position: { x: 280, y: 80 }, shape: 'round', size: { width: 60, height: 60 }, area: 'indoor' },
            { id: '4', number: 4, seats: 2, position: { x: 380, y: 80 }, shape: 'round', size: { width: 60, height: 60 }, area: 'indoor' },
            
            { id: '5', number: 5, seats: 4, position: { x: 80, y: 180 }, shape: 'square', size: { width: 80, height: 80 }, area: 'indoor' },
            { id: '6', number: 6, seats: 4, position: { x: 200, y: 180 }, shape: 'square', size: { width: 80, height: 80 }, area: 'indoor' },
            { id: '7', number: 7, seats: 4, position: { x: 320, y: 180 }, shape: 'square', size: { width: 80, height: 80 }, area: 'indoor' },
            
            { id: '8', number: 8, seats: 2, position: { x: 80, y: 300 }, shape: 'round', size: { width: 60, height: 60 }, area: 'indoor' },
            { id: '9', number: 9, seats: 2, position: { x: 180, y: 300 }, shape: 'round', size: { width: 60, height: 60 }, area: 'indoor' },
            { id: '10', number: 10, seats: 6, position: { x: 280, y: 320 }, shape: 'rectangle', size: { width: 120, height: 80 }, area: 'indoor' },
            
            // Área Externa
            { id: '11', number: 11, seats: 2, position: { x: 520, y: 80 }, shape: 'round', size: { width: 50, height: 50 }, area: 'outdoor' },
            { id: '12', number: 12, seats: 2, position: { x: 580, y: 80 }, shape: 'round', size: { width: 50, height: 50 }, area: 'outdoor' },
            { id: '13', number: 13, seats: 2, position: { x: 520, y: 150 }, shape: 'round', size: { width: 50, height: 50 }, area: 'outdoor' },
            { id: '14', number: 14, seats: 2, position: { x: 580, y: 150 }, shape: 'round', size: { width: 50, height: 50 }, area: 'outdoor' },
            { id: '15', number: 15, seats: 4, position: { x: 520, y: 220 }, shape: 'square', size: { width: 70, height: 70 }, area: 'outdoor' },
            { id: '16', number: 16, seats: 2, position: { x: 520, y: 320 }, shape: 'round', size: { width: 50, height: 50 }, area: 'outdoor' },
            { id: '17', number: 17, seats: 2, position: { x: 580, y: 320 }, shape: 'round', size: { width: 50, height: 50 }, area: 'outdoor' }
          ]
        }
      }
    ];
  }

  // Aplicar template
  static applyTemplate(terminalId: string, templateId: string): RestaurantLayoutConfig {
    const templates = this.getLayoutTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template não encontrado');
    }

    const config: RestaurantLayoutConfig = {
      id: `layout_${terminalId}_${Date.now()}`,
      terminalId,
      ...template.config,
      metadata: {
        restaurantType: template.type,
        capacity: template.config.tables.reduce((sum, table) => sum + table.seats, 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    this.saveLayoutConfig(terminalId, config);
    return config;
  }

  // Validar configuração
  static validateConfig(config: RestaurantLayoutConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar dimensões
    if (!config.dimensions || config.dimensions.width <= 0 || config.dimensions.height <= 0) {
      errors.push('Dimensões inválidas');
    }

    // Validar áreas
    if (!config.areas || config.areas.length === 0) {
      errors.push('Pelo menos uma área deve ser definida');
    }

    // Validar mesas
    if (!config.tables || config.tables.length === 0) {
      errors.push('Pelo menos uma mesa deve ser definida');
    }

    // Validar posições das mesas
    config.tables?.forEach((table, index) => {
      if (table.position.x < 0 || table.position.y < 0) {
        errors.push(`Mesa ${table.number}: posição inválida`);
      }
      
      if (table.position.x + table.size.width > config.dimensions.width ||
          table.position.y + table.size.height > config.dimensions.height) {
        errors.push(`Mesa ${table.number}: posição fora dos limites`);
      }

      if (table.seats <= 0) {
        errors.push(`Mesa ${table.number}: número de assentos inválido`);
      }
    });

    // Verificar sobreposição de mesas
    for (let i = 0; i < config.tables.length; i++) {
      for (let j = i + 1; j < config.tables.length; j++) {
        const table1 = config.tables[i];
        const table2 = config.tables[j];
        
        if (this.tablesOverlap(table1, table2)) {
          errors.push(`Mesas ${table1.number} e ${table2.number} estão sobrepostas`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Verificar sobreposição de mesas
  private static tablesOverlap(table1: TableConfig, table2: TableConfig): boolean {
    const margin = 10; // Margem mínima entre mesas
    
    return !(
      table1.position.x + table1.size.width + margin <= table2.position.x ||
      table2.position.x + table2.size.width + margin <= table1.position.x ||
      table1.position.y + table1.size.height + margin <= table2.position.y ||
      table2.position.y + table2.size.height + margin <= table1.position.y
    );
  }

  // Gerar configuração padrão
  static generateDefaultConfig(terminalId: string): RestaurantLayoutConfig {
    return this.applyTemplate(terminalId, 'traditional_restaurant');
  }

  // Obter estatísticas da configuração
  static getConfigStats(config: RestaurantLayoutConfig) {
    const totalTables = config.tables.length;
    const totalSeats = config.tables.reduce((sum, table) => sum + table.seats, 0);
    const areaStats = config.areas.map(area => ({
      name: area.name,
      tables: config.tables.filter(table => table.area === area.id).length,
      seats: config.tables
        .filter(table => table.area === area.id)
        .reduce((sum, table) => sum + table.seats, 0)
    }));

    return {
      totalTables,
      totalSeats,
      areas: areaStats,
      averageSeatsPerTable: Math.round(totalSeats / totalTables * 10) / 10
    };
  }
}

