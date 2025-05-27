# POS Modern - Terminal de Ponto de Venda (POS)

Este módulo contém a aplicação frontend para o Terminal de Ponto de Venda (POS) do sistema POS Modern.

## Funcionalidades

- Autenticação de usuários
- Abertura e fechamento de caixa
- Abertura e fechamento do dia de operação
- Gerenciamento de pedidos
- Processamento de pagamentos
- Emissão de cupom fiscal
- Sangria de caixa

## Estrutura do Projeto

```
pos/
├── src/
│   ├── ui/                # Componentes de interface do usuário
│   │   ├── POSMainPage.jsx           # Página principal do POS
│   │   ├── CashierOpeningClosingPage.jsx # Página de abertura/fechamento de caixa
│   │   ├── BusinessDayPage.jsx       # Página de gerenciamento do dia de operação
│   │   ├── CashWithdrawalPage.jsx    # Página de sangria de caixa
│   │   ├── POSOrderPage.jsx          # Página de gerenciamento de pedidos
│   │   └── POSPaymentPage.jsx        # Página de processamento de pagamentos
│   └── index.jsx          # Ponto de entrada da aplicação
```

## Pré-requisitos

- Node.js 18+
- npm 8+
- Pacote `common` compilado

## Instalação

Este módulo é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd apps/pos
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173/pos`.

## Compilação para Produção

```bash
npm run build
```

Os arquivos compilados serão gerados na pasta `dist/`.

## Endpoints de API Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Autenticação de usuário |
| `/api/business-day/open` | POST | Abertura do dia de operação |
| `/api/business-day/close` | POST | Fechamento do dia de operação |
| `/api/cashier/open` | POST | Abertura de caixa |
| `/api/cashier/close` | POST | Fechamento de caixa |
| `/api/cashier/withdrawal` | POST | Sangria de caixa |
| `/api/orders` | GET/POST | Listar/criar pedidos |
| `/api/orders/:id` | GET | Detalhes do pedido |
| `/api/orders/:id/status` | PUT | Atualizar status do pedido |
| `/api/products` | GET | Listar produtos |
| `/api/categories` | GET | Listar categorias |

Para mais detalhes sobre os endpoints de API, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).

## Integrações

- **Impressora Fiscal** - Para emissão de cupom fiscal
- **Gateway de Pagamento** - Para processamento de pagamentos com cartão
- **SAT/NFC-e** - Para emissão de documentos fiscais

## Hooks Utilizados

- `useAuth` - Gerenciamento de autenticação
- `useBusinessDay` - Gerenciamento do dia de operação
- `useCashier` - Gerenciamento de caixa
- `useOrder` - Gerenciamento de pedidos

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
