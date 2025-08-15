/**
 * Utilitários para compressão de dados e otimização de armazenamento
 * Reduz uso de espaço em IndexedDB e melhora performance
 */

// Implementação simples de compressão LZ-string like
class SimpleCompression {
  private dictionary: Map<string, number> = new Map();
  private reverseDictionary: Map<number, string> = new Map();
  private nextCode = 256;

  compress(data: string): string {
    if (!data) return data;

    this.reset();
    let result = '';
    let current = '';

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const combined = current + char;

      if (this.dictionary.has(combined)) {
        current = combined;
      } else {
        // Adicionar current ao resultado
        if (current) {
          result += this.encodeChar(current);
        }

        // Adicionar nova sequência ao dicionário
        if (this.nextCode < 4096) { // Limitar tamanho do dicionário
          this.dictionary.set(combined, this.nextCode);
          this.reverseDictionary.set(this.nextCode, combined);
          this.nextCode++;
        }

        current = char;
      }
    }

    // Adicionar último caractere
    if (current) {
      result += this.encodeChar(current);
    }

    return result;
  }

  decompress(compressed: string): string {
    if (!compressed) return compressed;

    this.reset();
    let result = '';
    let i = 0;

    while (i < compressed.length) {
      const { code, nextIndex } = this.decodeChar(compressed, i);
      
      if (code < 256) {
        // Caractere ASCII normal
        const char = String.fromCharCode(code);
        result += char;
        this.addToDictionary(result, char);
      } else if (this.reverseDictionary.has(code)) {
        // Código do dicionário
        const sequence = this.reverseDictionary.get(code)!;
        result += sequence;
        this.addToDictionary(result, sequence);
      }

      i = nextIndex;
    }

    return result;
  }

  private reset() {
    this.dictionary.clear();
    this.reverseDictionary.clear();
    this.nextCode = 256;
  }

  private encodeChar(str: string): string {
    if (str.length === 1) {
      const code = str.charCodeAt(0);
      return String.fromCharCode(code);
    }

    const code = this.dictionary.get(str) || str.charCodeAt(0);
    return String.fromCharCode(code);
  }

  private decodeChar(compressed: string, index: number): { code: number; nextIndex: number } {
    const code = compressed.charCodeAt(index);
    return { code, nextIndex: index + 1 };
  }

  private addToDictionary(result: string, newChar: string) {
    if (result.length > 1 && this.nextCode < 4096) {
      const lastSequence = result.slice(-2, -1);
      const newSequence = lastSequence + newChar;
      
      if (!this.dictionary.has(newSequence)) {
        this.dictionary.set(newSequence, this.nextCode);
        this.reverseDictionary.set(this.nextCode, newSequence);
        this.nextCode++;
      }
    }
  }
}

// Implementação de compressão usando CompressionStream (se disponível)
class ModernCompression {
  async compress(data: string): Promise<Uint8Array> {
    if (!('CompressionStream' in window)) {
      throw new Error('CompressionStream não suportado');
    }

    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Converter string para bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    // Comprimir
    writer.write(bytes);
    writer.close();

    // Ler resultado comprimido
    const chunks: Uint8Array[] = [];
    let result = await reader.read();

    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    // Concatenar chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    return compressed;
  }

  async decompress(compressed: Uint8Array): Promise<string> {
    if (!('DecompressionStream' in window)) {
      throw new Error('DecompressionStream não suportado');
    }

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Descomprimir
    writer.write(compressed);
    writer.close();

    // Ler resultado descomprimido
    const chunks: Uint8Array[] = [];
    let result = await reader.read();

    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    // Concatenar e converter para string
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const decompressed = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return decoder.decode(decompressed);
  }
}

// Manager principal de compressão
export class DataCompressor {
  private simpleCompressor = new SimpleCompression();
  private modernCompressor = new ModernCompression();
  private useModernCompression = 'CompressionStream' in window;

  /**
   * Comprime dados para armazenamento
   */
  async compressData(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      
      // Não comprimir dados muito pequenos (overhead não vale a pena)
      if (jsonString.length < 100) {
        return jsonString;
      }

      if (this.useModernCompression) {
        try {
          const compressed = await this.modernCompressor.compress(jsonString);
          // Converter para base64 para armazenamento
          return 'gzip:' + this.uint8ArrayToBase64(compressed);
        } catch (error) {
          console.warn('[DataCompressor] Fallback para compressão simples:', error);
          this.useModernCompression = false;
        }
      }

      // Fallback para compressão simples
      const compressed = this.simpleCompressor.compress(jsonString);
      return 'simple:' + compressed;

    } catch (error) {
      console.error('[DataCompressor] Erro na compressão, retornando dados originais:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Descomprime dados armazenados
   */
  async decompressData<T = any>(compressedData: string): Promise<T> {
    try {
      if (!compressedData) {
        throw new Error('Dados comprimidos vazios');
      }

      let jsonString: string;

      if (compressedData.startsWith('gzip:')) {
        // Dados comprimidos com gzip
        const base64Data = compressedData.substring(5);
        const compressed = this.base64ToUint8Array(base64Data);
        jsonString = await this.modernCompressor.decompress(compressed);
      } else if (compressedData.startsWith('simple:')) {
        // Dados comprimidos com algoritmo simples
        const compressedContent = compressedData.substring(7);
        jsonString = this.simpleCompressor.decompress(compressedContent);
      } else {
        // Dados não comprimidos (compatibilidade)
        jsonString = compressedData;
      }

      return JSON.parse(jsonString);
    } catch (error) {
      console.error('[DataCompressor] Erro na descompressão:', error);
      throw error;
    }
  }

  /**
   * Calcula taxa de compressão
   */
  calculateCompressionRatio(original: string, compressed: string): number {
    return compressed.length / original.length;
  }

  /**
   * Verifica se dados estão comprimidos
   */
  isCompressed(data: string): boolean {
    return data.startsWith('gzip:') || data.startsWith('simple:');
  }

  /**
   * Estima tamanho após compressão
   */
  estimateCompressedSize(data: any): number {
    const jsonString = JSON.stringify(data);
    
    if (jsonString.length < 100) {
      return jsonString.length;
    }

    // Estimativa baseada em análise de entropia simples
    const uniqueChars = new Set(jsonString).size;
    const entropy = uniqueChars / 256;
    const estimatedRatio = Math.max(0.3, entropy * 0.8); // Entre 30% e 64%
    
    return Math.floor(jsonString.length * estimatedRatio);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

// Instância singleton
export const dataCompressor = new DataCompressor();

// Hook React para uso fácil
export function useDataCompression() {
  return {
    compress: dataCompressor.compressData.bind(dataCompressor),
    decompress: dataCompressor.decompressData.bind(dataCompressor),
    calculateRatio: dataCompressor.calculateCompressionRatio.bind(dataCompressor),
    isCompressed: dataCompressor.isCompressed.bind(dataCompressor),
    estimateSize: dataCompressor.estimateCompressedSize.bind(dataCompressor)
  };
}

// Utilitários para análise de dados
export class DataAnalyzer {
  /**
   * Analisa padrões nos dados para otimizar compressão
   */
  static analyzeData(data: any): {
    size: number;
    complexity: number;
    recommendCompression: boolean;
    estimatedSavings: number;
  } {
    const jsonString = JSON.stringify(data);
    const size = jsonString.length;
    
    // Calcular complexidade baseada na repetição de padrões
    const patterns = new Map<string, number>();
    
    for (let i = 0; i < jsonString.length - 2; i++) {
      const pattern = jsonString.substring(i, i + 3);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
    
    // Calcular entropia
    const totalPatterns = patterns.size;
    let entropy = 0;
    
    for (const count of patterns.values()) {
      const probability = count / totalPatterns;
      entropy -= probability * Math.log2(probability);
    }
    
    const complexity = entropy / Math.log2(totalPatterns || 1);
    const estimatedSavings = size * (1 - Math.max(0.3, complexity * 0.8));
    
    return {
      size,
      complexity,
      recommendCompression: size > 100 && complexity < 0.8,
      estimatedSavings
    };
  }

  /**
   * Sugere estratégia de armazenamento baseada na análise
   */
  static suggestStorageStrategy(data: any): {
    strategy: 'compress' | 'raw' | 'split';
    reason: string;
  } {
    const analysis = this.analyzeData(data);
    
    if (analysis.size < 100) {
      return {
        strategy: 'raw',
        reason: 'Dados muito pequenos para comprimir'
      };
    }
    
    if (analysis.size > 1000000) { // 1MB
      return {
        strategy: 'split',
        reason: 'Dados muito grandes, dividir em chunks'
      };
    }
    
    if (analysis.recommendCompression) {
      return {
        strategy: 'compress',
        reason: `Economia estimada: ${Math.round(analysis.estimatedSavings)} bytes`
      };
    }
    
    return {
      strategy: 'raw',
      reason: 'Dados com alta entropia, compressão não eficiente'
    };
  }
}