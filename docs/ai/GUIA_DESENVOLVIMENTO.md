# Guia de Desenvolvimento - Chefia POS

## 📋 Sumário

1. [Antes de Começar](#antes-de-começar)
2. [Padrões de Código](#padrões-de-código)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)
5. [Commits e Versionamento](#commits-e-versionamento)
6. [Testes](#testes)
7. [Documentação](#documentação)
8. [Validação e QA](#validação-e-qa)
9. [Deploy e Release](#deploy-e-release)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Antes de Começar

### Checklist Inicial

```markdown
- [ ] Ambiente de desenvolvimento configurado
- [ ] Acesso ao repositório git
- [ ] Docker e Docker Compose instalados
- [ ] Node.js 20+ e Python 3.11+ instalados
- [ ] IDE configurado (VSCode recomendado)
- [ ] Extensões necessárias instaladas
- [ ] Pre-commit hooks configurados
- [ ] Leu a documentação existente
- [ ] Entendeu a arquitetura do sistema
```

### Setup do Ambiente

```bash
# 1. Clone o repositório
git clone <repository-url>
cd chefia-pos

# 2. Setup Backend
cd src/
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate      # Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3. Setup Frontend
cd ../frontend/
npm install

# 4. Setup Infrastructure
cd ..
docker-compose up -d

# 5. Configure pre-commit hooks
pre-commit install

# 6. Verify setup
make test  # ou npm test && pytest
```

### Configuração do IDE (VSCode)

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/node_modules": true,
    "**/.pytest_cache": true
  }
}
```

---

## 🏆 Padrões de Qualidade e Code Quality (SonarLint)

### 📊 Métricas de Qualidade

O projeto segue padrões rigorosos de qualidade baseados em análises estáticas do SonarQube/SonarLint:

- **Code Coverage**: Mínimo 70% para produção
- **Duplicação**: Máximo 3% de código duplicado
- **Complexidade Ciclomática**: Máximo 15 por método/função
- **Technical Debt**: Máximo 5% do tempo total de desenvolvimento

### 🎯 Regras de Code Quality Implementadas

#### 1. Substituição de console.\* por Logging Centralizado

```typescript
// ❌ Antes: Console statements espalhados
console.log("Processing order:", order);
console.error("Error:", error);
console.warn("Warning: Invalid data");

// ✅ Depois: Logging centralizado com contexto
import { offlineStorage } from "@/services/offlineStorage";

// Para informações/debug
offlineStorage.log("Processing order", {
  orderId: order.id,
  status: order.status,
});

// Para erros (automaticamente inclui stack trace)
offlineStorage.log("Failed to process order", error);

// Para warnings com contexto
offlineStorage.log("Warning: Invalid data detected", {
  data,
  validation: "missing required fields",
});
```

#### 2. Eliminação de TypeScript 'any' Types

```typescript
// ❌ Antes: Tipos 'any' genéricos
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// ✅ Depois: Tipos específicos e seguros
interface DataItem {
  id: string;
  value: number;
  status: "active" | "inactive";
}

interface ProcessedData {
  processedValues: number[];
  totalCount: number;
}

function processData(data: DataItem[]): ProcessedData {
  const processedValues = data.map((item) => item.value);
  return {
    processedValues,
    totalCount: data.length,
  };
}
```

#### 3. Tratamento Robusto de Erros (Eliminação de Empty Catch Blocks)

```typescript
// ❌ Antes: Catch blocks vazios
try {
  const result = await api.getRemoteOrders();
  setOrders(result);
} catch (error) {
  // Silencioso - problema crítico!
}

// ✅ Depois: Tratamento completo de erros
try {
  const result = await api.getRemoteOrders();
  setOrders(result);
} catch (error: unknown) {
  // Log estruturado do erro
  offlineStorage.log("Failed to fetch remote orders", {
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    context: "RemoteOrdersPage.fetchOrders",
  });

  // Feedback ao usuário
  addToast("Erro ao carregar pedidos remotos", "error");

  // Fallback graceful
  setOrders([]);
}
```

#### 4. Extração de Nested Ternary Operations

```typescript
// ❌ Antes: Nested ternary ilegível
const statusIcon =
  order.status === "pending"
    ? "⏳"
    : order.status === "confirmed"
    ? "✅"
    : order.status === "preparing"
    ? "🔥"
    : order.status === "ready"
    ? "📦"
    : "❌";

// ✅ Depois: Função pura e testável
function getOrderStatusIcon(status: OrderStatus): string {
  const iconMap: Record<OrderStatus, string> = {
    pending: "⏳",
    confirmed: "✅",
    preparing: "🔥",
    ready: "📦",
    cancelled: "❌",
  };

  return iconMap[status] || "❓";
}

const statusIcon = getOrderStatusIcon(order.status);

// ✅ Alternativa: IIFE para lógica inline complexa
const statusColor = (() => {
  switch (order.status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "preparing":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
})();
```

#### 5. Melhorias de Acessibilidade (Semantic HTML)

```typescript
// ❌ Antes: div com onClick (não acessível)
<div
  onClick={handleOrderClick}
  className="cursor-pointer hover:bg-gray-50"
>
  Order #{order.id}
</div>

// ✅ Depois: button semântico com acessibilidade
<button
  onClick={handleOrderClick}
  type="button"
  className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
  aria-label={`View details for order ${order.id}`}
>
  Order #{order.id}
</button>

// ✅ Labels com htmlFor adequados
<label
  htmlFor="order-notes"
  className="block text-sm font-medium text-gray-700 mb-1"
>
  Observações do Pedido
</label>
<textarea
  id="order-notes"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  className="w-full border border-gray-300 rounded-md px-3 py-2"
  placeholder="Digite observações especiais..."
/>
```

#### 6. Centralização de Configuração de API

```typescript
// ❌ Antes: URLs hardcoded espalhadas
// Em vários arquivos:
fetch("http://localhost:8001/api/v1/orders");
fetch("http://localhost:8001/api/v1/remote-orders");
fetch("http://localhost:8001/api/v1/products");

// ✅ Depois: config/api.ts centralizado
// config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:8001",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  ENDPOINTS: {
    ORDERS: "/api/v1/orders",
    REMOTE_ORDERS: "/api/v1/remote-orders",
    PRODUCTS: "/api/v1/products",
    CUSTOMERS: "/api/v1/customers",
  },
} as const;

// services/apiClient.ts
import { API_CONFIG } from "@/config/api";

export class ApiClient {
  private baseURL = API_CONFIG.BASE_URL;

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Uso nos components
const orders = await apiClient.get<Order[]>(API_CONFIG.ENDPOINTS.ORDERS);
```

#### 7. Cache para Prevenção de Duplicate API Calls

```typescript
// ❌ Antes: Multiple chamadas desnecessárias
useEffect(() => {
  fetchOrders(); // Chamada 1
}, []);

useEffect(() => {
  fetchOrders(); // Chamada 2 (duplicada)
}, [selectedPlatform]);

// ✅ Depois: Cache inteligente com React Query
import { useQuery } from "@tanstack/react-query";

const {
  data: orders,
  isLoading,
  error,
} = useQuery({
  queryKey: ["orders", selectedPlatform],
  queryFn: () => orderService.getOrders({ platform: selectedPlatform }),
  staleTime: 5 * 60 * 1000, // Fresh por 5 minutos
  cacheTime: 10 * 60 * 1000, // Cache por 10 minutos
  retry: 2,
  refetchOnWindowFocus: false,
});

// ✅ Alternativa: Cache manual simples
const orderCache = new Map<string, { data: Order[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function getCachedOrders(platform: string): Promise<Order[]> {
  const cacheKey = `orders-${platform}`;
  const cached = orderCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const orders = await orderService.getOrders({ platform });
  orderCache.set(cacheKey, { data: orders, timestamp: Date.now() });

  return orders;
}
```

#### 8. Optional Chaining para Acesso Seguro

```typescript
// ❌ Antes: Acesso direto perigoso
const customerName = order.customer.name;
const firstItem = order.items[0].product.name;
const discountAmount = order.payment.discount.amount;

// ✅ Depois: Optional chaining seguro
const customerName = order?.customer?.name ?? "Cliente não identificado";
const firstItem = order?.items?.[0]?.product?.name ?? "Item não encontrado";
const discountAmount = order?.payment?.discount?.amount ?? 0;

// ✅ Com type guards para validação adicional
function isValidOrder(order: unknown): order is Order {
  return (
    typeof order === "object" &&
    order !== null &&
    "id" in order &&
    "status" in order &&
    "items" in order &&
    Array.isArray((order as any).items)
  );
}

if (isValidOrder(orderData)) {
  // orderData é tipado como Order aqui
  const total = orderData.items.reduce((sum, item) => sum + item.price, 0);
}
```

### 🔍 Tools de Qualidade

```bash
# Análise de qualidade completa
npm run lint          # ESLint para padrões
npm run type-check     # TypeScript strict checking
npm run test:coverage  # Coverage de testes
npm run audit          # Vulnerabilidades de segurança

# SonarLint integration (VSCode)
# Instale a extensão SonarLint para análise em tempo real

# Pre-commit hooks para garantir qualidade
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

---

## 💻 Padrões de Código

### ⚠️ REGRAS CRÍTICAS DE CÓDIGO

#### 🏆 PADRÕES DE QUALIDADE SONARQUBE/SONAR LINT

```typescript
// ✅ PADRÃO: Usar logging centralizado ao invés de console
// ❌ NUNCA deixe console.log/console.error
console.log("debug", data); // REMOVER ANTES DO COMMIT
console.warn("test"); // REMOVER ANTES DO COMMIT
console.error("check this"); // REMOVER ANTES DO COMMIT

// ✅ SEMPRE use logging centralizado
import { offlineStorage } from "@/services/offlineStorage";

// Para logs de debug/info
offlineStorage.log("Order processed successfully", { orderId: data.id });

// Para erros (com stack trace)
try {
  processOrder(data);
} catch (error) {
  offlineStorage.log("Error processing order", error);
  // Handle error appropriately
}
```

#### ❌ PROIBIDO NO CÓDIGO DE PRODUÇÃO

```python
# ❌ NUNCA deixe console.log/print de debug
print("debug:", data)  # REMOVER ANTES DO COMMIT

# ❌ NUNCA deixe mocks fora de testes
def get_user():
    # return {"id": 1, "name": "Mock User"}  # NUNCA FAÇA ISSO
    return database.get_user()  # Sempre use dados reais

# ❌ NUNCA ignore tipos/typing
def process_data(data):  # FALTA TIPO
    return data

# ✅ SEMPRE use tipos
def process_data(data: Dict[str, Any]) -> ProcessedData:
    return ProcessedData(data)
```

```typescript
// ❌ NUNCA use any como tipo
let data: any;  // EVITE ANY
function process(input: any): any {  // TIPOS ESPECÍFICOS

// ✅ SEMPRE use tipos específicos
interface OrderData {
  id: string;
  total: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

let data: OrderData;
function process(input: OrderInput): OrderOutput {
  // Implementation
}

// ❌ NUNCA deixe dados mockados
const users = [
  { id: 1, name: 'Test User' }  // APENAS EM TESTES
];

// ✅ Use serviços reais ou factories
const users = await userService.getUsers();

// ❌ NUNCA deixe catch blocks vazios
try {
  const result = await api.getData();
} catch (error) {
  // Silencioso - NUNCA FAÇA ISSO!
}

// ✅ SEMPRE trate erros adequadamente
try {
  const result = await api.getData();
} catch (error) {
  offlineStorage.log('Failed to fetch data', error);
  // Handle error: show notification, retry, etc.
  throw new Error('Unable to fetch data. Please try again.');
}
```

### Python (Backend)

#### Nomenclatura

```python
# ✅ CORRETO
class OrderService:  # PascalCase para classes
    def calculate_total(self):  # snake_case para funções/métodos
        total_amount = 0  # snake_case para variáveis
        TAX_RATE = 0.18  # UPPER_CASE para constantes

# ❌ INCORRETO
class order_service:  # Não use snake_case para classes
    def CalculateTotal(self):  # Não use PascalCase para métodos
        TotalAmount = 0  # Não use PascalCase para variáveis
```

#### Imports

```python
# ✅ CORRETO - Ordem dos imports
# 1. Standard library
import os
import sys
from datetime import datetime
from typing import List, Optional

# 2. Third-party
import pytest
from fastapi import FastAPI
from pydantic import BaseModel

# 3. Local application
from src.core.events import EventBus
from src.order.models import Order
from src.order.services import OrderService

# ❌ INCORRETO - Imports não utilizados ou desordenados
from fastapi import *  # Não use wildcard imports
import unused_module  # Remova imports não utilizados
```

#### Docstrings

```python
# ✅ CORRETO
def calculate_discount(
    price: float,
    discount_percentage: float,
    max_discount: Optional[float] = None
) -> float:
    """
    Calculate discount amount for a given price.

    Args:
        price: Original price before discount
        discount_percentage: Discount percentage (0-100)
        max_discount: Maximum allowed discount amount

    Returns:
        Calculated discount amount

    Raises:
        ValueError: If discount_percentage is negative or > 100

    Example:
        >>> calculate_discount(100, 10)
        10.0
    """
    if not 0 <= discount_percentage <= 100:
        raise ValueError("Discount must be between 0 and 100")

    discount = price * (discount_percentage / 100)
    if max_discount:
        discount = min(discount, max_discount)

    return discount
```

### TypeScript/React (Frontend)

#### Nomenclatura

```typescript
// ✅ CORRETO
interface OrderProps {
  // PascalCase para interfaces/types
  orderId: string; // camelCase para propriedades
  totalAmount: number;
}

const OrderComponent: FC<OrderProps> = ({ orderId, totalAmount }) => {
  const [isLoading, setIsLoading] = useState(false); // camelCase
  const MAX_ITEMS = 100; // UPPER_CASE para constantes

  const handleSubmit = useCallback(() => {
    // camelCase para funções
    // ...
  }, []);
};

// ❌ INCORRETO
interface order_props {
  // Não use snake_case
  OrderId: string; // Não use PascalCase para propriedades
}
```

#### Componentes React

```typescript
// ✅ CORRETO - Componente bem estruturado
import React, { FC, memo, useCallback, useMemo } from "react";
import { useOrder } from "@/hooks/useOrder";
import { formatCurrency } from "@/utils/formatters";
import styles from "./Order.module.css";

interface OrderProps {
  orderId: string;
  onUpdate?: (order: Order) => void;
}

export const Order: FC<OrderProps> = memo(({ orderId, onUpdate }) => {
  // 1. Hooks
  const { order, loading, error } = useOrder(orderId);

  // 2. Computed values
  const formattedTotal = useMemo(
    () => (order ? formatCurrency(order.total) : "0"),
    [order]
  );

  // 3. Handlers
  const handleUpdate = useCallback(() => {
    if (order && onUpdate) {
      onUpdate(order);
    }
  }, [order, onUpdate]);

  // 4. Early returns
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!order) return null;

  // 5. Main render
  return (
    <div className={styles.order} data-testid={`order-${orderId}`}>
      <h2>Order #{order.number}</h2>
      <span>{formattedTotal}</span>
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
});

Order.displayName = "Order";
```

### 🎯 PADRÕES DE CÓDIGO QUALIDADE (SONAR COMPLIANCE)

#### Tratamento de Erros Centralizado

```typescript
// ✅ PADRÃO: Tratamento de erro centralizado
import { offlineStorage } from "@/services/offlineStorage";

try {
  const orders = await remoteOrderService.getOrders();
  return orders;
} catch (error: unknown) {
  // Log centralizado com contexto
  offlineStorage.log("Failed to fetch remote orders", {
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    context: "RemoteOrdersPage",
  });

  // Throw error específico para tratamento upstream
  throw new Error("Unable to load orders. Please check your connection.");
}
```

#### Configuração de API Centralizada

```typescript
// ✅ PADRÃO: config/api.ts para centralizar URLs
// config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:8001",
  ENDPOINTS: {
    ORDERS: "/api/v1/orders",
    REMOTE_ORDERS: "/api/v1/remote-orders",
    PRODUCTS: "/api/v1/products",
  },
  TIMEOUT: 30000,
};

// ❌ NUNCA hardcode URLs nos componentes
const response = await fetch("http://localhost:8001/api/v1/orders");

// ✅ USE configuração centralizada
import { API_CONFIG } from "@/config/api";
const response = await fetch(
  `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`
);
```

#### Evitando Nested Ternary com IIFE

```typescript
// ❌ EVITE: Nested ternary difícil de ler
const statusColor =
  order.status === "pending"
    ? "yellow"
    : order.status === "confirmed"
    ? "green"
    : order.status === "preparing"
    ? "blue"
    : "red";

// ✅ USE: IIFE (Immediately Invoked Function Expression) para lógica complexa
const statusColor = (() => {
  switch (order.status) {
    case "pending":
      return "yellow";
    case "confirmed":
      return "green";
    case "preparing":
      return "blue";
    default:
      return "red";
  }
})();

// ✅ OU: Extract para função nomeada
function getStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    pending: "yellow",
    confirmed: "green",
    preparing: "blue",
    rejected: "red",
  };
  return colorMap[status] || "gray";
}

const statusColor = getStatusColor(order.status);
```

#### Acessibilidade com Elementos Semânticos

```typescript
// ❌ EVITE: div com onClick (não é acessível)
<div onClick={handleClick} className="clickable">
  Clique aqui
</div>

// ✅ USE: button para ações clicáveis
<button
  onClick={handleClick}
  type="button"
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  Clique aqui
</button>

// ✅ USE: htmlFor em labels
<label htmlFor="order-notes" className="block mb-2">
  Observações do Pedido
</label>
<textarea
  id="order-notes"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  className="w-full border rounded px-3 py-2"
/>
```

#### Cache para Evitar Chamadas Duplicadas

```typescript
// ✅ PADRÃO: Cache simples com Map
const orderCache = new Map<string, Order>();

const getOrder = async (orderId: string): Promise<Order> => {
  // Verificar cache primeiro
  if (orderCache.has(orderId)) {
    return orderCache.get(orderId)!;
  }

  try {
    const order = await api.getOrder(orderId);
    // Salvar no cache
    orderCache.set(orderId, order);
    return order;
  } catch (error) {
    offlineStorage.log("Failed to fetch order", { orderId, error });
    throw error;
  }
};

// ✅ PADRÃO: React Query para cache automático (recomendado)
import { useQuery } from "@tanstack/react-query";

const {
  data: order,
  isLoading,
  error,
} = useQuery({
  queryKey: ["order", orderId],
  queryFn: () => orderService.getOrder(orderId),
  staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  cacheTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
});
```

#### Optional Chaining para Segurança

```typescript
// ❌ EVITE: Acesso direto que pode falhar
const customerName = order.customer.name;
const firstItemName = order.items[0].product.name;

// ✅ USE: Optional chaining
const customerName = order?.customer?.name ?? "Cliente não identificado";
const firstItemName =
  order?.items?.[0]?.product?.name ?? "Produto não encontrado";

// ✅ USE: Type guards para validação
function isValidOrder(order: any): order is Order {
  return (
    order &&
    typeof order.id === "string" &&
    Array.isArray(order.items) &&
    order.items.length > 0
  );
}

if (isValidOrder(order)) {
  // order é tipado corretamente aqui
  const total = order.items.reduce((sum, item) => sum + item.price, 0);
}
```

### Limpeza de Código

```bash
# Backend - Remover imports não utilizados
autoflake --in-place --remove-unused-variables src/**/*.py

# Frontend - Remover imports não utilizados
eslint --fix src/**/*.{ts,tsx}

# Formatação automática
black src/  # Python
prettier --write "frontend/**/*.{js,jsx,ts,tsx,css}"  # JavaScript/TypeScript
```

---

## 📁 Estrutura de Pastas

### Backend

```
src/
├── <module_name>/           # Módulo de negócio
│   ├── __init__.py
│   ├── models/              # Modelos de dados
│   │   ├── __init__.py
│   │   ├── domain.py        # Domain models
│   │   └── dto.py           # Data Transfer Objects
│   ├── services/            # Lógica de negócio
│   │   ├── __init__.py
│   │   └── <module>_service.py
│   ├── repositories/        # Acesso a dados
│   │   ├── __init__.py
│   │   └── <module>_repository.py
│   ├── router/              # Endpoints API
│   │   ├── __init__.py
│   │   └── <module>_router.py
│   ├── events/              # Event handlers
│   │   ├── __init__.py
│   │   └── <module>_events.py
│   └── tests/               # Testes do módulo
│       ├── __init__.py
│       ├── test_service.py
│       └── test_router.py
```

### Frontend

```
frontend/
├── apps/
│   └── <app_name>/          # Aplicação específica
│       ├── src/
│       │   ├── components/  # Componentes da app
│       │   ├── pages/       # Páginas/Rotas
│       │   ├── hooks/       # Custom hooks
│       │   ├── services/    # API services
│       │   ├── utils/       # Utilidades
│       │   └── styles/      # Estilos
│       └── package.json
├── common/                  # Código compartilhado
│   ├── components/          # Componentes reutilizáveis
│   ├── hooks/              # Hooks compartilhados
│   ├── services/           # Services compartilhados
│   ├── types/              # TypeScript types
│   └── utils/              # Utilidades compartilhadas
```

### Documentação

```
docs/
├── api/                     # Documentação de APIs
│   ├── endpoints/          # Endpoints por módulo
│   └── schemas/            # Schemas JSON/OpenAPI
├── architecture/           # Diagramas e decisões
├── guides/                 # Guias e tutoriais
├── modules/                # Documentação por módulo
└── deployment/             # Guias de deploy
```

### Configurações

```
config/
├── environments/           # Configs por ambiente
│   ├── development.json
│   ├── staging.json
│   └── production.json
├── docker/                 # Docker configs
├── nginx/                  # Nginx configs
└── README.md              # Documentação das configs
```

---

## 🔄 Workflow de Desenvolvimento

### 🎯 REGRA DE OURO: FOCO E CONCLUSÃO

#### ⚠️ Princípio Fundamental: TERMINE O QUE COMEÇOU

```markdown
❌ NÃO FAÇA ISSO:

- Começar feature A
- "Funciona" mas tem bugs conhecidos
- "Deixa pra corrigir depois"
- Mudar para feature B
- Iniciar refactor C
- Voltar para A (bugs ainda lá + novos problemas)
- Resultado: 3 tarefas "completas" mas quebradas

✅ FAÇA ISSO:

- Começar feature A
- Testar e encontrar bugs
- CORRIGIR todos os bugs ANTES de continuar
- CONCLUIR feature A 100% funcional
- Fazer commit/PR de A
- ENTÃO começar próxima tarefa
- Resultado: 1 tarefa REALMENTE completa e estável
```

#### 🐛 REGRA DE OURO: Definition of Done

```markdown
Uma tarefa NÃO está completa até que:
✅ Código implementado
✅ ZERO bugs conhecidos
✅ Todos os casos de testes da feature implementados e passando
✅ Sem warnings/erros no console
✅ Code review aprovado
✅ Documentação atualizada
✅ Funcionando em ambiente de dev/staging

⚠️ "Funciona mas tem um bugzinho" = NÃO ESTÁ PRONTO
⚠️ "Depois eu corrijo" = NÃO FAÇA COMMIT
⚠️ "É só um warning" = AINDA TEM PROBLEMA
```

#### Método de Trabalho Focado

```markdown
1. ESCOLHA uma única tarefa
2. FOQUE nela até completar
3. TESTE o que foi feito
4. DOCUMENTE se necessário
5. COMMIT com a tarefa completa
6. SÓ ENTÃO passe para a próxima

Exceções permitidas:

- Bloqueio real (dependência externa, aprovação, etc.)
- Bug crítico em produção (prioridade máxima)
- Mas sempre: anote onde parou e o que falta
```

### 1. Planejamento (TODO List)

**SEMPRE crie uma TODO list antes de começar E SIGA A ORDEM:**

```markdown
## TODO: Implementar Sistema de Cupons

### EM PROGRESSO:

- [x] Analisar requisitos e criar design
- [ ] Criar models no backend ← TRABALHANDO NISSO AGORA

### PRÓXIMAS (não toque até terminar a atual):

- [ ] Implementar service layer
- [ ] Criar endpoints da API
- [ ] Adicionar testes unitários
- [ ] Criar componente React
- [ ] Integrar com API
- [ ] Adicionar testes de integração
- [ ] Atualizar documentação
- [ ] Code review

REGRA: Só marque como [x] quando 100% pronto
Só mova para próxima quando atual estiver [x]
NUNCA avance com bugs pendentes!

### BUGS ENCONTRADOS (resolver ANTES de continuar):

🐛 Bug #1: Validação de desconto não funciona com valor zero
Status: ❌ Pendente
🐛 Bug #2: Campo de data aceita valores inválidos
Status: ✅ Corrigido no commit abc123
```

#### Checklist de Conclusão de Tarefa

```markdown
Antes de marcar qualquer tarefa como completa, VERIFIQUE:

- [ ] Funcionalidade implementada conforme especificação
- [ ] ZERO bugs conhecidos (teste em diferentes cenários)
- [ ] Testes unitários escritos e passando
- [ ] Sem console.log, print ou debug code
- [ ] Sem warnings no terminal/console
- [ ] Testado manualmente em pelo menos 3 casos diferentes
- [ ] Edge cases tratados (null, undefined, arrays vazios, etc.)
- [ ] Código revisado por você mesmo
- [ ] Documentação/comentários onde necessário

❌ Se qualquer item acima não estiver ✅, a tarefa NÃO está completa!
```

### 2. Desenvolvimento

#### Sistema de Uma Tarefa por Vez

```bash
# ✅ WORKFLOW CORRETO
git checkout -b feature/coupon-model
# Trabalhe APENAS no model até estar 100% pronto
# Teste o model
# Commit quando COMPLETO
git add .
git commit -m "feat(coupon): implement coupon model with validation"

# AGORA sim, próxima parte
git checkout -b feature/coupon-service
# Trabalhe APENAS no service...

# ❌ WORKFLOW INCORRETO
git checkout -b feature/coupon-system
# Mudanças em 10 arquivos diferentes
# Model incompleto, service pela metade, UI começada
# 500 linhas de código sem testar
# Um commit gigante com tudo misturado
```

```bash
# 1. Criar branch feature
git checkout -b feature/coupon-system

# 2. Desenvolver incrementalmente
# - Faça commits pequenos e frequentes
# - Teste localmente após cada mudança
# - Mantenha a TODO list atualizada

# 3. Executar testes locais
make test  # ou
npm test && pytest

# 4. Verificar linting
make lint  # ou
npm run lint && flake8 src/
```

### 3. Gestão de Foco e Produtividade

#### Técnica Pomodoro Adaptada para Dev

```markdown
1. ESCOLHA uma única tarefa da TODO list
2. TRABALHE 25-45 minutos focado APENAS nela
3. COMMIT incremental (mesmo que parcial)
4. PAUSA 5-10 minutos
5. REPITA até tarefa estar 100% completa
6. SÓ ENTÃO mova para próxima tarefa

🚫 Durante o foco, IGNORE:

- Slack/Teams (exceto emergências)
- Outras tarefas "rápidas"
- Refatorações não relacionadas
- Features "legais" que descobriu
```

#### Tracking de Progresso

```markdown
## Status da Tarefa Atual

**Tarefa**: Implementar modelo de cupons
**Início**: 10:00
**Estimativa**: 2 horas
**Status**: 60% completo

### Concluído:

- [x] Estrutura base do modelo
- [x] Validações de campos
- [x] Métodos de cálculo

### Em progresso:

- [ ] Testes unitários (fazendo agora)

### Bloqueios:

- Nenhum

### Próximo commit em: 15 minutos
```

### 4. Padrão de Branch

```
main                    # Produção
├── develop            # Desenvolvimento
│   ├── feature/xxx    # Nova funcionalidade
│   ├── bugfix/xxx     # Correção de bug
│   ├── hotfix/xxx     # Correção urgente
│   └── refactor/xxx   # Refatoração

REGRA: Uma branch = Uma tarefa específica
       Não misture features na mesma branch
```

### 4. Pull Request Template

```markdown
## Descrição

Breve descrição do que foi feito

## Tipo de Mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar

1. Passo 1
2. Passo 2
3. Resultado esperado

## Checklist

- [ ] Código segue os padrões do projeto
- [ ] Self-review realizado
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem warnings no console
- [ ] Lint passou sem erros
```

---

## 📝 Commits e Versionamento

### Padrão de Mensagens de Commit

**Formato**: `<tipo>(<escopo>): <descrição>`

#### Tipos de Commit

```bash
feat:     # Nova funcionalidade
fix:      # Correção de bug
docs:     # Documentação
style:    # Formatação (não afeta lógica)
refactor: # Refatoração de código
perf:     # Melhoria de performance
test:     # Adição/correção de testes
build:    # Mudanças no build/dependencies
ci:       # Mudanças no CI/CD
chore:    # Outras mudanças
```

#### Exemplos

```bash
# ✅ BONS commits
git commit -m "feat(order): add coupon validation system"
git commit -m "fix(payment): correct tax calculation for services"
git commit -m "docs(api): update order endpoints documentation"
git commit -m "test(product): add unit tests for price calculation"
git commit -m "refactor(auth): simplify token validation logic"

# ❌ MAUS commits
git commit -m "fixed bug"  # Muito vago
git commit -m "WIP"        # Não específico
git commit -m "updates"    # Não descreve o que foi feito
```

### Fluxo de Commit

```bash
# 1. Verificar mudanças
git status
git diff

# 2. Adicionar arquivos
git add .  # ou arquivos específicos

# 3. Verificar o que será commitado
git diff --staged

# 4. Fazer commit com mensagem descritiva
git commit -m "feat(module): description of change"

# 5. Push para branch
git push origin feature/branch-name
```

### Versionamento Semântico

```
MAJOR.MINOR.PATCH

1.0.0 → 2.0.0  # Breaking change
1.0.0 → 1.1.0  # Nova feature (backward compatible)
1.0.0 → 1.0.1  # Bug fix
```

---

## 🧪 Testes

### ⚠️ REGRAS IMPORTANTES PARA TESTES

#### Mocks - Use APENAS em Testes

```python
# ✅ CORRETO - Mock apenas em arquivo de teste
# tests/test_order_service.py
from unittest.mock import Mock, patch

def test_order_creation():
    mock_db = Mock()
    mock_db.save.return_value = {"id": "123"}
    service = OrderService(db=mock_db)
    # ... teste continua

# ❌ INCORRETO - Mock em código de produção
# src/order/service.py
class OrderService:
    def __init__(self):
        # NUNCA FAÇA ISSO EM PRODUÇÃO
        self.db = Mock()  # ❌ ERRADO!
        self.db.save.return_value = {"id": "fake"}
```

```typescript
// ✅ CORRETO - Mock apenas em teste
// Order.test.tsx
jest.mock("@/services/orderService");
const mockOrderService = {
  getOrder: jest.fn().mockResolvedValue(mockOrder),
};

// ❌ INCORRETO - Mock em componente real
// Order.tsx
const Order = () => {
  // NUNCA FAÇA ISSO
  const mockData = { id: 1, name: "Test" }; // ❌ ERRADO!
  // USE DADOS REAIS
  const data = await orderService.getOrder(); // ✅ CORRETO
};
```

### Estratégia de Testes

```
Cobertura Mínima: 70%
- Unit Tests: 80% coverage
- Integration Tests: 60% coverage
- E2E Tests: Critical paths only
```

### Backend - Python

#### Teste Unitário

```python
# tests/test_order_service.py
import pytest
from unittest.mock import Mock, patch
from src.order.services import OrderService
from src.order.models import Order, OrderItem

class TestOrderService:
    """Test suite for OrderService."""

    @pytest.fixture
    def order_service(self):
        """Create OrderService instance with mocked dependencies."""
        mock_repo = Mock()
        mock_event_bus = Mock()
        return OrderService(mock_repo, mock_event_bus)

    @pytest.fixture
    def sample_order(self):
        """Create sample order for testing."""
        return Order(
            id="123",
            items=[
                OrderItem(product_id="1", quantity=2, price=10.0),
                OrderItem(product_id="2", quantity=1, price=20.0)
            ],
            customer_id="cust-123"
        )

    @pytest.mark.asyncio
    async def test_calculate_total_success(self, order_service, sample_order):
        """Test successful total calculation."""
        # Arrange
        expected_total = 40.0

        # Act
        result = await order_service.calculate_total(sample_order)

        # Assert
        assert result == expected_total

    @pytest.mark.asyncio
    async def test_create_order_publishes_event(self, order_service):
        """Test that creating order publishes event."""
        # Arrange
        order_data = {"items": [], "customer_id": "123"}
        order_service.repository.create.return_value = Mock(id="order-123")

        # Act
        await order_service.create_order(order_data)

        # Assert
        order_service.event_bus.publish.assert_called_once()
        event = order_service.event_bus.publish.call_args[0][0]
        assert event.type == "order.created"
```

#### Teste de Integração

```python
# tests/test_order_integration.py
import pytest
from httpx import AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_create_order_endpoint():
    """Test order creation through API."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Arrange
        order_data = {
            "items": [
                {"product_id": "1", "quantity": 2}
            ],
            "customer_id": "customer-123"
        }

        # Act
        response = await client.post("/api/v1/orders", json=order_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["customer_id"] == "customer-123"
```

### Frontend - React/TypeScript

#### Teste de Componente

```typescript
// Order.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Order } from "./Order";
import { useOrder } from "@/hooks/useOrder";

// Mock do hook
jest.mock("@/hooks/useOrder");
const mockUseOrder = useOrder as jest.MockedFunction<typeof useOrder>;

describe("Order Component", () => {
  const defaultProps = {
    orderId: "123",
    onUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading state", () => {
    mockUseOrder.mockReturnValue({
      order: null,
      loading: true,
      error: null,
    });

    render(<Order {...defaultProps} />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("should render order details", async () => {
    const mockOrder = {
      id: "123",
      number: "ORD-001",
      total: 99.9,
      items: [],
    };

    mockUseOrder.mockReturnValue({
      order: mockOrder,
      loading: false,
      error: null,
    });

    render(<Order {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Order #ORD-001")).toBeInTheDocument();
      expect(screen.getByText("R$ 99,90")).toBeInTheDocument();
    });
  });

  it("should call onUpdate when button clicked", async () => {
    const mockOrder = { id: "123", total: 100 };
    mockUseOrder.mockReturnValue({
      order: mockOrder,
      loading: false,
      error: null,
    });

    render(<Order {...defaultProps} />);

    const updateButton = screen.getByText("Update");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(defaultProps.onUpdate).toHaveBeenCalledWith(mockOrder);
    });
  });
});
```

#### Teste de Hook

```typescript
// useOrder.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useOrder } from "./useOrder";
import * as orderService from "@/services/orderService";

jest.mock("@/services/orderService");

describe("useOrder Hook", () => {
  it("should fetch order on mount", async () => {
    const mockOrder = { id: "123", total: 100 };
    jest.spyOn(orderService, "getOrder").mockResolvedValue(mockOrder);

    const { result } = renderHook(() => useOrder("123"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.order).toEqual(mockOrder);
    });
  });

  it("should handle error", async () => {
    const error = new Error("Failed to fetch");
    jest.spyOn(orderService, "getOrder").mockRejectedValue(error);

    const { result } = renderHook(() => useOrder("123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Failed to fetch");
    });
  });
});
```

### Executando Testes

```bash
# Backend
pytest                          # Todos os testes
pytest src/order/              # Testes de um módulo
pytest -v                      # Verbose
pytest --cov=src               # Com coverage
pytest -k "test_create"        # Testes específicos

# Frontend
npm test                       # Todos os testes
npm test Order                 # Arquivo específico
npm test -- --coverage        # Com coverage
npm test -- --watch          # Watch mode

# E2E
npm run test:e2e              # Playwright tests
npm run test:e2e:ui          # Com interface
```

---

## 📚 Documentação

### Onde Documentar

```
docs/
├── api/                      # Documentação de APIs
│   └── order_endpoints.md    # Endpoints do módulo de pedidos
├── modules/                  # Documentação de módulos
│   └── order_module.md       # Lógica de negócio de pedidos
├── guides/                   # Guias e tutoriais
│   └── setup_development.md  # Como configurar ambiente
└── architecture/             # Decisões arquiteturais
    └── adr-001-event-bus.md  # Architecture Decision Record
```

### Formato de Documentação

#### API Documentation

````markdown
# Order API

## Create Order

Creates a new order in the system.

**Endpoint:** `POST /api/v1/orders`

**Headers:**

- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "items": [
    {
      "product_id": "123",
      "quantity": 2,
      "notes": "No onions"
    }
  ],
  "customer_id": "customer-123",
  "table_number": 5
}
```
````

**Response (201 Created):**

```json
{
  "id": "order-456",
  "number": "ORD-2024-001",
  "status": "pending",
  "total": 45.9,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Customer or product not found

````

#### Module Documentation

```markdown
# Order Module

## Overview
The Order module handles all order-related operations including creation,
updates, cancellation, and payment processing.

## Business Rules
1. Orders can only be created during business hours
2. Minimum order value is R$ 10.00
3. Orders auto-cancel after 2 hours without payment

## Architecture
```mermaid
graph LR
    API[Order API] --> Service[Order Service]
    Service --> Repo[Order Repository]
    Service --> Events[Event Bus]
    Repo --> DB[(Database)]
````

## Key Components

- **OrderService**: Business logic implementation
- **OrderRepository**: Data access layer
- **OrderEvents**: Event publishers and handlers

## Dependencies

- Product Module (for product validation)
- Payment Module (for payment processing)
- Customer Module (for customer data)

````

### Docstrings e Comments

```python
# ✅ BOM - Docstring completa
class OrderService:
    """
    Service layer for order management.

    This service handles all business logic related to orders,
    including validation, calculation, and event publishing.

    Attributes:
        repository: Data access layer for orders
        event_bus: Event publishing interface
        validator: Order validation service
    """

    def calculate_discount(
        self,
        order: Order,
        coupon: Optional[Coupon] = None
    ) -> Decimal:
        """
        Calculate applicable discount for an order.

        Applies business rules for discount calculation including:
        - Coupon validation and application
        - Maximum discount limits
        - Product-specific discount restrictions

        Args:
            order: Order to calculate discount for
            coupon: Optional coupon to apply

        Returns:
            Total discount amount in currency

        Raises:
            InvalidCouponError: If coupon is expired or invalid
            DiscountLimitExceeded: If discount exceeds maximum allowed
        """
        # Implementation here
````

```typescript
// ✅ BOM - JSDoc completo
/**
 * Order component for displaying and managing orders.
 *
 * @component
 * @example
 * <Order orderId="123" onUpdate={handleUpdate} />
 */
interface OrderProps {
  /** Unique identifier for the order */
  orderId: string;
  /** Callback fired when order is updated */
  onUpdate?: (order: Order) => void;
  /** Whether to show detailed view */
  detailed?: boolean;
}
```

---

## ✅ Validação e QA

### Checklist Pré-Commit

```bash
#!/bin/bash
# pre-commit.sh - Execute antes de cada commit

echo "🔍 Running pre-commit checks..."

# 1. Check for console.log/print statements
echo "Checking for debug statements..."
# Python
if grep -r "print(" src/ --include="*.py" | grep -v "# noqa" | grep -v "tests/"; then
    echo "❌ Found print() statements in production code!"
    exit 1
fi

# JavaScript/TypeScript
if grep -r "console\." frontend/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "// eslint-disable" | grep -v "tests/" | grep -v ".test."; then
    echo "❌ Found console statements in production code!"
    exit 1
fi

# 2. Check for Mock usage outside tests
echo "Checking for mocks in production..."
if grep -r "Mock\|mock" src/ --include="*.py" | grep -v "tests/" | grep -v "test_"; then
    echo "❌ Found Mock usage outside of tests!"
    exit 1
fi

if grep -r "jest\.mock\|mockImplementation\|mockReturnValue" frontend/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v ".spec."; then
    echo "❌ Found mock usage outside of tests!"
    exit 1
fi

# 3. Check for 'any' type in TypeScript
echo "Checking TypeScript types..."
if grep -r ": any" frontend/apps/ --include="*.ts" --include="*.tsx" | grep -v "// @ts-ignore" | grep -v ".d.ts"; then
    echo "⚠️  Warning: Found 'any' types in TypeScript code"
fi

# 4. Testes
echo "Running tests..."
pytest --quiet || exit 1
npm test -- --silent || exit 1

# 5. Linting
echo "Checking code style..."
flake8 src/ || exit 1
eslint frontend/ || exit 1

# 6. Type checking
echo "Type checking..."
mypy src/ || exit 1
tsc --noEmit || exit 1

# 7. Security scan
echo "Security scan..."
bandit -r src/ || exit 1
npm audit || exit 1

# 8. Check for unused imports
echo "Checking imports..."
autoflake --check src/**/*.py || exit 1

# 9. Check for TODO/FIXME comments
echo "Checking for unresolved TODOs..."
TODO_COUNT=$(grep -r "TODO\|FIXME" src/ frontend/ --include="*.py" --include="*.ts" --include="*.tsx" | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo "⚠️  Found $TODO_COUNT TODO/FIXME comments"
fi

echo "✅ All checks passed!"
```

### Validação Manual

```markdown
## Checklist de Validação

### Funcionalidade

- [ ] Feature funciona conforme especificado
- [ ] ZERO bugs conhecidos na feature atual
- [ ] Todos os bugs encontrados foram corrigidos
- [ ] Edge cases tratados
- [ ] Erros tratados gracefully
- [ ] Performance aceitável
- [ ] Testado com dados reais (não apenas mocks)

### Código

- [ ] Sem warnings no console
- [ ] Sem imports não utilizados
- [ ] Sem variáveis não utilizadas
- [ ] Sem código comentado
- [ ] Sem console.log/print debugs

### Testes

- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Coverage >= 70%
- [ ] Casos de erro testados

### Documentação

- [ ] README atualizado se necessário
- [ ] API docs atualizados
- [ ] Changelog atualizado
- [ ] Comentários em código complexo

### Segurança

- [ ] Sem dados sensíveis hardcoded
- [ ] Input validation implementada
- [ ] SQL injection prevenido
- [ ] XSS prevenido
```

### Testes de Regressão

```bash
# Script para verificar se nada quebrou
#!/bin/bash

echo "🔄 Running regression tests..."

# 1. Backend health check
curl -f http://localhost:8001/health || exit 1

# 2. Critical endpoints
curl -f http://localhost:8001/api/v1/products || exit 1
curl -f http://localhost:8001/api/v1/orders || exit 1

# 3. Frontend build
cd frontend && npm run build || exit 1

# 4. Database migrations
alembic check || exit 1

# 5. E2E critical paths
npm run test:e2e -- --grep="critical" || exit 1

echo "✅ No regressions detected!"
```

---

## 🚀 Deploy e Release

### Processo de Deploy

```markdown
## Deploy Checklist

### Pre-Deploy

- [ ] Todos os testes passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Version bump realizado
- [ ] Changelog atualizado

### Deploy Staging

- [ ] Deploy em staging
- [ ] Smoke tests passando
- [ ] Testes manuais realizados
- [ ] Performance verificada
- [ ] Logs sem erros

### Deploy Production

- [ ] Backup realizado
- [ ] Deploy em horário de baixo movimento
- [ ] Health checks passando
- [ ] Monitoring configurado
- [ ] Rollback plan pronto

### Post-Deploy

- [ ] Verificação de funcionalidades críticas
- [ ] Monitoring por 24h
- [ ] Comunicação com stakeholders
- [ ] Documentação de issues encontradas
```

### Rollback Plan

```bash
#!/bin/bash
# rollback.sh - Script de rollback rápido

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: ./rollback.sh <version>"
    exit 1
fi

echo "⚠️  Rolling back to version $PREVIOUS_VERSION"

# 1. Stop current deployment
docker-compose down

# 2. Checkout previous version
git checkout tags/v$PREVIOUS_VERSION

# 3. Restore database backup
./scripts/restore_db.sh $PREVIOUS_VERSION

# 4. Rebuild and deploy
docker-compose build
docker-compose up -d

# 5. Verify
./scripts/health_check.sh

echo "✅ Rollback complete!"
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### Import Errors

```python
# Problema: ModuleNotFoundError
# Solução:
# 1. Verificar PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:${PWD}"

# 2. Verificar estrutura de imports
# Use imports absolutos desde src/
from src.module.submodule import Component
```

#### Type Errors

```typescript
// Problema: Type 'undefined' is not assignable
// Solução:
// 1. Use optional chaining
const value = data?.property?.subproperty;

// 2. Use default values
const { name = "Default" } = props;

// 3. Type guards
if (isValidOrder(order)) {
  // order is typed correctly here
}
```

#### Performance Issues

```python
# Problema: N+1 queries
# Solução: Use eager loading
# ❌ BAD
orders = db.query(Order).all()
for order in orders:
    customer = db.query(Customer).filter_by(id=order.customer_id).first()

# ✅ GOOD
orders = db.query(Order).options(
    joinedload(Order.customer)
).all()
```

### Debug Tips

```python
# Backend debugging
import pdb; pdb.set_trace()  # Breakpoint
import logging
logging.basicConfig(level=logging.DEBUG)

# SQL query logging
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

```typescript
// Frontend debugging
console.log({ data, state, props }); // Object logging
debugger; // Breakpoint

// React DevTools
if (process.env.NODE_ENV === "development") {
  console.log("Debug info:", { state });
}
```

---

## 📋 Templates Úteis

### Novo Módulo Template

```python
# src/new_module/__init__.py
"""New Module - Brief description."""

from .services import NewModuleService
from .models import NewModel

__all__ = ['NewModuleService', 'NewModel']
```

### Novo Componente Template

```typescript
// NewComponent.tsx
import React, { FC, memo } from "react";
import styles from "./NewComponent.module.css";

interface NewComponentProps {
  // Props definition
}

export const NewComponent: FC<NewComponentProps> = memo((props) => {
  // Implementation
  return <div className={styles.container}>{/* Content */}</div>;
});

NewComponent.displayName = "NewComponent";
```

### Test Template

```python
# test_template.py
import pytest
from unittest.mock import Mock, patch

class TestComponent:
    """Test suite for Component."""

    @pytest.fixture
    def component(self):
        """Create component instance."""
        return Component()

    def test_behavior(self, component):
        """Test expected behavior."""
        # Arrange
        expected = "expected_value"

        # Act
        result = component.method()

        # Assert
        assert result == expected
```

---

## 🎯 Resumo - Regras de Ouro

### Os 32 Mandamentos do Desenvolvedor Chefia POS

1. **TERMINE O QUE COMEÇOU - Uma tarefa por vez, 100% completa**
2. **NUNCA finalize uma tarefa com bugs conhecidos**
3. **Sempre crie TODO list antes de começar**
4. **NUNCA deixe console.log/print no código de produção**
5. **NUNCA use mocks fora de arquivos de teste**
6. **SEMPRE use tipagem forte (evite 'any' em TypeScript)**
7. **Commits pequenos e frequentes com mensagens descritivas**
8. **Teste localmente antes de fazer push**
9. **Documente o que você fez**
10. **Remova código morto e imports não usados observando os lint**
11. **Siga os padrões de código estabelecidos**
12. **Escreva testes para seu código (mocks só em testes!)**
13. **Valide que nada quebrou antes do commit**
14. **Use as pastas corretas para cada tipo de arquivo**
15. **Limpe todos os console.logs antes do commit**
16. **Garanta que tipos estão definidos em todas as funções**
17. **Peça code review antes de merge para main**
18. **Mantenha o padrao no nome de arquivos**
19. **Evite duplicacao de codigo, procure ver se já existe o que voce quer implementar**
20. **Crie codigos da forma mais simples possivel, evitando over-engineering**
21. **Tome cuidado com a questão de segurança do codigo**
22. **Evitar alteracoes em lote por meio de scripts pois se perde o contexto**
23. **Lembrar de ter logs inteligentes no padrão já usado pelo projeto, que é salvo localmente**
24. **Observar as análises de qualidade de código feitas pelos scripts de lint, audit, analize e verificações de sonar**
25. **SEMPRE substitua console.log por offlineStorage.log para logging centralizado**
26. **NUNCA deixe catch blocks vazios - sempre trate erros adequadamente**
27. **Use configuração centralizada (config/api.ts) ao invés de URLs hardcoded**
28. **Extraia nested ternary em funções nomeadas ou use IIFE pattern**
29. **Use elementos semânticos (button ao invés de div clickable)**
30. **Implemente cache para evitar chamadas duplicadas à API**
31. **Use optional chaining (?.) para acesso seguro a propriedades**
32. **Considere o uso de patterns como solid, event driven, domain-driven-design, clean code, saga, microfrontend, mobile first e outros**

### 🚫 Os Pecados Capitais do Desenvolvimento

1. **Multitasking Caótico**: Começar várias tarefas sem terminar nenhuma
2. **Bug Debt**: Deixar bugs "para depois" e nunca corrigir
3. **Console.log Esquecido**: Deixar debug statements em produção
4. **Mock Selvagem**: Usar mocks fora de testes
5. **Any Preguiçoso**: Usar 'any' ao invés de tipos apropriados
6. **Commit Monstro**: Commits gigantes com múltiplas features
7. **Copy-Paste Programming**: Duplicar código ao invés de reutilizar
8. **Documentation Debt**: Não documentar código complexo
9. **"Funciona na Minha Máquina"**: Não testar em ambiente limpo
10. **Catch Silencioso**: Blocos catch vazios que engolem erros
11. **URL Hardcoded**: URLs da API espalhadas pelo código
12. **Nested Ternary Hell**: Operadores ternários aninhados ilegíveis
13. **Div Clickable**: Usar div com onClick ao invés de button
14. **API Spam**: Múltiplas chamadas desnecessárias para a mesma API

### Scripts de Limpeza Automática

```bash
# clean-code.sh - Limpa código antes do commit
#!/bin/bash

echo "🧹 Limpando código..."

# Remove console.logs do TypeScript/JavaScript (preserve arquivos de teste)
find frontend -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
  grep -v node_modules | \
  grep -v ".test." | \
  grep -v ".spec." | \
  xargs sed -i '/console\./d'

# Remove prints do Python (preserve arquivos de teste)
find src -name "*.py" | \
  grep -v tests | \
  grep -v test_ | \
  xargs sed -i '/print(/d'

# Verifica se há catch blocks vazios
echo "🔍 Verificando catch blocks vazios..."
if grep -r "catch.*{[[:space:]]*}" frontend/ --include="*.ts" --include="*.tsx"; then
  echo "❌ Encontrados catch blocks vazios! Adicione tratamento de erro."
fi

# Verifica URLs hardcoded
echo "🔍 Verificando URLs hardcoded..."
if grep -r "http://\|https://" frontend/apps/ --include="*.ts" --include="*.tsx" | grep -v "config/api" | grep -v ".test." | grep -v "README"; then
  echo "⚠️  URLs hardcoded encontradas. Use config/api.ts"
fi

# Remove imports não usados - Python
autoflake --in-place --remove-unused-variables --remove-all-unused-imports src/**/*.py

# Remove imports não usados - TypeScript
eslint frontend --fix --ext .ts,.tsx,.js,.jsx

# Formata código
black src/
prettier --write "frontend/**/*.{js,jsx,ts,tsx,css}"

echo "✅ Código limpo!"
```

### Quick Commands

```bash
# Desenvolvimento diário
make dev          # Inicia ambiente dev
make test         # Roda todos os testes
make lint         # Verifica código
make format       # Formata código
make validate     # Validação completa
make clean        # Limpa console.logs e prints

# Git workflow
git status
git add .
git commit -m "feat(module): description"
git push origin feature/branch

# Validação rápida antes do commit
./scripts/pre-commit.sh  # Roda todas as validações
./scripts/clean-code.sh  # Remove debug statements
```

---

## 💡 Exemplo Prático: Desenvolvimento com Foco

### Cenário: Implementar Sistema de Desconto

```markdown
## ❌ MODO ERRADO (Caótico)

09:00 - Começa a criar modelo de desconto
09:15 - "Ah, deixa eu corrigir esse bug rápido no produto"
09:30 - "Vou aproveitar e refatorar essa função"
10:00 - "Melhor já criar a UI do desconto também"
10:30 - "Esse código de pagamento está feio, vou melhorar"
11:00 - Ainda não terminou NADA, 5 arquivos modificados
12:00 - Tenta fazer commit gigante, testes quebrados
Resultado: 0 features entregues, código instável

## ✅ MODO CORRETO (Focado)

### TODO List Criada:

1. [ ] Criar modelo de Discount
2. [ ] Criar service de cálculo
3. [ ] Adicionar endpoints API
4. [ ] Criar testes
5. [ ] Implementar UI
6. [ ] Integração e testes E2E

### Execução:

09:00 - FOCO: Modelo de Discount

- Cria classe Discount
- Define campos e validações
- Adiciona métodos básicos
  09:45 - Testa modelo isoladamente
  09:50 - 🐛 BUG ENCONTRADO: desconto negativo não é validado
  09:55 - CORRIGE o bug (adiciona validação)
  10:00 - Re-testa: agora sim está OK
  10:05 - Commit: "feat(discount): add discount model with validations"
  Status: Tarefa 1 ✅ COMPLETA (sem bugs pendentes!)

10:15 - FOCO: Service de cálculo

- Implementa lógica de cálculo
- Trata casos especiais
  11:00 - Testa service
  11:05 - 🐛 BUG ENCONTRADO: divisão por zero em edge case
  11:10 - CORRIGE o bug (adiciona guard clause)
  11:15 - Re-testa todos os cenários
  11:20 - Commit: "feat(discount): implement discount calculation service"
  Status: Tarefa 2 ✅ COMPLETA (zero bugs conhecidos!)

Resultado às 12:00:

- 2 tarefas 100% completas
- 2 commits limpos e testados
- Código estável e funcional
- Progresso mensurável
```

### Comandos para Verificar Qualidade

```bash
# focus-check.sh - Verifica se você está focado
#!/bin/bash

# Quantos arquivos modificados?
MODIFIED=$(git status --porcelain | wc -l)

if [ $MODIFIED -gt 5 ]; then
    echo "⚠️  ALERTA: $MODIFIED arquivos modificados!"
    echo "Você pode estar perdendo o foco."
    echo "Considere fazer commit do que está pronto"
    echo "e focar em uma única tarefa."
fi

# Há quanto tempo sem commit?
LAST_COMMIT=$(git log -1 --format="%ar")
echo "📝 Último commit: $LAST_COMMIT"

# Sugestão
echo "💡 Dica: Faça commits a cada 30-60 minutos"
echo "         Mantenha o foco em UMA tarefa por vez"
```

```bash
# bug-check.sh - Verifica bugs pendentes antes de finalizar
#!/bin/bash

echo "🐛 Verificando bugs pendentes..."

# Procura por TODOs relacionados a bugs
BUG_TODOS=$(grep -r "TODO.*bug\|TODO.*fix\|FIXME\|BUG\|HACK" src/ frontend/ --include="*.py" --include="*.ts" --include="*.tsx" | wc -l)

if [ $BUG_TODOS -gt 0 ]; then
    echo "❌ Encontrados $BUG_TODOS comentários sobre bugs!"
    echo "Por favor, resolva antes de finalizar a tarefa."
    grep -r "TODO.*bug\|TODO.*fix\|FIXME\|BUG\|HACK" src/ frontend/ --include="*.py" --include="*.ts" --include="*.tsx"
    exit 1
fi

# Verifica se testes estão passando
echo "🧪 Rodando testes..."
pytest --quiet || { echo "❌ Testes falhando! Corrija antes de continuar."; exit 1; }
npm test -- --silent || { echo "❌ Testes JS falhando!"; exit 1; }

# Verifica console statements (devem usar offlineStorage.log)
if grep -r "console\." frontend/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v ".spec." | grep -v "// eslint-disable"; then
    echo "❌ console.* encontrado! Use offlineStorage.log para logging centralizado."
    echo "Exemplo: offlineStorage.log('Error message', error);"
    exit 1
fi

# Verifica catch blocks vazios
if grep -r "catch.*{[[:space:]]*}" frontend/ --include="*.ts" --include="*.tsx" | grep -v ".test."; then
    echo "❌ Catch blocks vazios encontrados! Sempre trate erros adequadamente."
    exit 1
fi

# Verifica URLs hardcoded
if grep -r "http[s]*://[^'\"]*['\"]" frontend/apps/ --include="*.ts" --include="*.tsx" | grep -v "config/api" | grep -v ".test." | head -5; then
    echo "⚠️  URLs hardcoded encontradas. Centralize em config/api.ts"
fi

echo "✅ Nenhum bug óbvio detectado!"
echo "📋 Lembre-se de testar manualmente:"
echo "   - Casos normais"
echo "   - Edge cases (valores extremos)"
echo "   - Inputs inválidos"
echo "   - Condições de erro"
```

---

## 📞 Contatos e Recursos

- **Documentação**: `/docs`
- **Issues**: GitHub Issues
- **Wiki**: Confluence/Notion
- **Slack**: #chefia-pos-dev

### Leitura Recomendada sobre Produtividade

- "Deep Work" - Cal Newport
- "The Pragmatic Programmer" - David Thomas
- "Clean Code" - Robert C. Martin
- "Getting Things Done" - David Allen

---

_Última atualização: 2024_
_Versão: 1.1.0_
_Changelog: Adicionado foco e gestão de tarefas únicas_
