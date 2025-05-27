# POS Modern - Common

Este pacote contém componentes, hooks e utilitários compartilhados entre os diferentes módulos do sistema POS Modern.

## Estrutura do Projeto

```
common/
├── src/
│   ├── components/     # Componentes React compartilhados
│   ├── contexts/       # Contextos e hooks React
│   └── utils/          # Funções utilitárias
```

## Componentes Compartilhados

- `ProductCard` - Exibição de produto
- `TableLayoutEditor` - Editor de layout de mesas
- `OrderCard` - Exibição de pedido
- `PaymentForm` - Formulário de pagamento

## Hooks Compartilhados

- `useAuth` - Gerenciamento de autenticação
- `useBusinessDay` - Gerenciamento do dia de operação
- `useCashier` - Gerenciamento de caixa
- `useOrder` - Gerenciamento de pedidos
- `useWebSocket` - Conexão com WebSocket para atualizações em tempo real
- `useApi` - Chamadas à API com tratamento de erros

## Utilitários Compartilhados

- `formatCurrency` - Formatação de valores monetários
- `formatDateTime` - Formatação de data e hora

## Instalação

Este pacote é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd common
npm install
```

## Compilação

```bash
npm run build
```

## Uso

Para usar os componentes, hooks e utilitários em outros módulos:

```javascript
// Importar componentes
import { ProductCard } from '@common/components';

// Importar hooks
import { useAuth } from '@common/contexts/auth/hooks/useAuth';

// Importar utilitários
import { formatCurrency } from '@common/utils/formatters';
```

## Dívidas Técnicas

1. **Componente MessageQueueTestInterface**
   Este componente foi temporariamente excluído do build devido a incompatibilidades de tipo. Ele precisa ser refatorado para ser compatível com TypeScript.

2. **Implementação de Hooks**
   Os hooks compartilhados foram implementados com funcionalidades básicas simuladas. É necessário implementar a lógica real de comunicação com o backend.

3. **Configurações de TypeScript**
   As configurações de TypeScript foram temporariamente relaxadas para permitir a compilação. É necessário revisar e corrigir os erros de tipo.

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com APIs e outros módulos, consulte a [documentação de APIs e pontos de integração](../api-integration-docs.md).
