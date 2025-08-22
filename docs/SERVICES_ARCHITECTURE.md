# Arquitetura de Services do Frontend

## 📐 Estrutura de Camadas

```
┌─────────────────────────────────────┐
│         UI Components               │
├─────────────────────────────────────┤
│            Hooks                    │  ← Estado e lógica de negócio
├─────────────────────────────────────┤
│           Services                  │  ← Comunicação com API
├─────────────────────────────────────┤
│        ApiInterceptor               │  ← Interceptador HTTP com auth
├─────────────────────────────────────┤
│         Backend API                 │
└─────────────────────────────────────┘
```

## ✅ Services Implementados

### Services com Arquivos Separados

| Service | Arquivo | Hook Correspondente | Status |
|---------|---------|-------------------|--------|
| AuthService | `AuthService.ts` | useAuth | ✅ Implementado |
| ProductService | `ProductService.ts` | useProduct | ✅ Implementado |
| CustomerService | `CustomerService.ts` | useCustomer | ✅ Implementado |
| OrderService | `OrderService.ts` | useOrder | ✅ Implementado |
| DeliveryService | `DeliveryService.ts` | useDelivery | ✅ Implementado |
| BusinessDayService | `BusinessDayService.ts` | useBusinessDay | ✅ Implementado |
| CashierService | `CashierService.ts` | useCashier | ✅ Implementado |
| EmployeeService | `EmployeeService.ts` | useEmployee | ✅ Implementado |
| BillsService | `BillsService.ts` | useBills | ✅ Implementado |
| CouponsService | `CouponsService.ts` | useCoupons | ✅ Implementado |
| AnalyticsService | `AnalyticsService.ts` | useAnalytics | ✅ Implementado |
| AIService | `AIService.ts` | useAI | ✅ Implementado |
| TableService | `TableService.ts` | useTable | ✅ Criado |
| RemoteOrdersService | `RemoteOrdersService.ts` | useRemoteOrders | ✅ Criado |

### Services Utilitários

| Service | Propósito |
|---------|-----------|
| ApiInterceptor | Gerencia autenticação JWT e intercepta requisições |
| CacheService | Gerencia cache local com localStorage |
| TerminalService | Gerencia configuração de terminal |
| PrinterService | Gerencia impressão local |

## 🏗️ Padrão de Implementação

### Service Típico

```typescript
// services/ExampleService.ts
import { apiInterceptor } from './ApiInterceptor';

export interface ExampleModel {
  id: string;
  name: string;
  // ...
}

class ExampleServiceClass {
  private baseURL = 'http://localhost:8001/api/v1';

  async getItems(): Promise<ExampleModel[]> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/items`);
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      return this.getMockItems(); // Fallback para desenvolvimento
    }
  }

  async createItem(item: Partial<ExampleModel>): Promise<ExampleModel> {
    const response = await apiInterceptor.post(`${this.baseURL}/items`, item);
    return response.data;
  }

  private getMockItems(): ExampleModel[] {
    // Mock data para desenvolvimento
    return [];
  }
}

export const exampleService = new ExampleServiceClass();
```

### Hook Típico

```typescript
// hooks/useExample.ts
import { useState, useEffect, useCallback } from 'react';
import { exampleService, ExampleModel } from '../services/ExampleService';

export const useExample = () => {
  const [items, setItems] = useState<ExampleModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await exampleService.getItems();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
    // outras funções...
  };
};
```

## 🔄 Fluxo de Dados

1. **Componente** chama função do hook
2. **Hook** gerencia estado local e chama service
3. **Service** faz requisição via ApiInterceptor
4. **ApiInterceptor** adiciona token JWT e faz requisição
5. **Backend** processa e retorna resposta
6. **Service** transforma dados se necessário
7. **Hook** atualiza estado
8. **Componente** re-renderiza com novos dados

## 🛡️ Tratamento de Erros

### Níveis de Fallback

1. **Backend disponível**: Dados reais da API
2. **Backend indisponível**: Mock data do service
3. **Erro crítico**: Estado de erro no hook

### Exemplo de Fallback

```typescript
async getItems() {
  try {
    // Tenta buscar do backend
    const response = await apiInterceptor.get('/api/items');
    return response.data;
  } catch (error) {
    // Se falhar, retorna mock data
    console.error('Using mock data:', error);
    return this.getMockItems();
  }
}
```

## 🔐 Autenticação

Todos os services usam `ApiInterceptor` que:
- Adiciona token JWT automaticamente
- Intercepta respostas 401 e redireciona para login
- Gerencia renovação de token
- Armazena token no localStorage

## 📦 Cache Strategy

Services podem usar `CacheService` para:
- Cache de dados estáticos (produtos, categorias)
- Reduzir requisições ao backend
- Melhorar performance

```typescript
const cachedProducts = cacheService.getProducts();
if (cachedProducts) {
  return cachedProducts;
}
// Se não houver cache, busca do backend
```

## 🚀 Boas Práticas

1. **Separação de Responsabilidades**
   - Services: Comunicação com API
   - Hooks: Estado e lógica de negócio
   - Components: Apresentação

2. **Mock Data**
   - Sempre incluir mock data nos services
   - Facilita desenvolvimento sem backend

3. **Type Safety**
   - Interfaces TypeScript em todos os services
   - Compartilhar types entre service e hook

4. **Error Handling**
   - Try/catch em todos os métodos async
   - Logging de erros
   - Fallback para mock data

5. **Singleton Pattern**
   - Services exportados como instâncias únicas
   - Evita múltiplas instâncias desnecessárias

## 📝 Checklist para Novo Service

- [ ] Criar arquivo em `services/`
- [ ] Definir interfaces TypeScript
- [ ] Implementar classe do service
- [ ] Adicionar métodos CRUD
- [ ] Incluir mock data
- [ ] Exportar instância singleton
- [ ] Criar hook correspondente
- [ ] Atualizar este documento

## 🔧 Manutenção

### Para adicionar novo endpoint

1. Adicionar método no service
2. Adicionar função no hook
3. Testar com mock data
4. Integrar com backend real

### Para atualizar URL base

Modificar em cada service:
```typescript
private baseURL = 'http://localhost:8001/api/v1';
```

Ou usar configuração centralizada em `config/api.ts`.