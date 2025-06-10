# POS Modern - Aplicativo para Garçons (Waiter)

Este módulo contém a aplicação frontend web para garçons do sistema POS Modern, permitindo o gerenciamento de mesas, pedidos e atendimento.

## Funcionalidades

- Visualização do layout de mesas do restaurante
- Gerenciamento de mesas e ocupação
- Criação e edição de pedidos
- Acompanhamento de status de pedidos
- Fechamento de conta

## Estrutura do Projeto

```
waiter/
├── src/
│   ├── ui/                # Componentes de interface do usuário
│   │   ├── WaiterMainPage.jsx      # Página principal do aplicativo
│   │   ├── TableView.jsx           # Visualização de mesas
│   │   ├── OrderEditor.jsx         # Editor de pedidos
│   │   └── BillCalculator.jsx      # Calculadora de conta
│   └── index.jsx          # Ponto de entrada da aplicação
```

## Pré-requisitos

- Node.js 18+
- npm 8+
- Pacote `common` compilado

## Instalação

Este módulo é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd apps/waiter
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173/waiter`.

## Compilação para Produção

```bash
npm run build
```

Os arquivos compilados serão gerados na pasta `dist/`.

## Endpoints de API Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Autenticação de usuário |
| `/api/tables` | GET | Listar mesas |
| `/api/tables/:id` | GET | Detalhes da mesa |
| `/api/tables/:id/orders` | GET | Pedidos da mesa |
| `/api/orders` | POST | Criar novo pedido |
| `/api/orders/:id` | PUT | Atualizar pedido |
| `/api/products` | GET | Listar produtos |
| `/api/categories` | GET | Listar categorias |

Para mais detalhes sobre os endpoints de API, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).

## Integrações

- **Event Bus** - Para receber atualizações em tempo real de status de pedidos
- **TableLayoutEditor** - Componente compartilhado para visualização do layout de mesas

## Hooks Utilizados

- `useAuth` - Gerenciamento de autenticação
- `useOrder` - Gerenciamento de pedidos
- `useWebSocket` - Conexão com WebSocket para atualizações em tempo real

## Diferenças em relação ao Mobile Waiter

Este é o aplicativo web para garçons, projetado para ser usado em tablets ou computadores dentro do restaurante. Existe também uma versão mobile (React Native) que está documentada como dívida técnica e será migrada para um repositório separado.

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
