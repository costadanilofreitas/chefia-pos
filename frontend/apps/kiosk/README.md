# POS Modern - Terminal de Autoatendimento (Kiosk)

Este módulo contém a aplicação frontend para o Terminal de Autoatendimento (Kiosk) do sistema POS Modern, permitindo que os clientes façam pedidos sem interação com atendentes.

## Funcionalidades

- Visualização do cardápio digital
- Seleção de produtos e personalização
- Carrinho de compras
- Processamento de pagamentos
- Emissão de senha de atendimento

## Estrutura do Projeto

```
kiosk/
├── src/
│   ├── ui/                # Componentes de interface do usuário
│   │   ├── KioskMainPage.jsx       # Página principal do Kiosk
│   │   ├── ProductCard.jsx         # Cartão de produto
│   │   ├── CartSidebar.jsx         # Barra lateral do carrinho
│   │   └── PaymentScreen.jsx       # Tela de pagamento
│   └── index.jsx          # Ponto de entrada da aplicação
```

## Pré-requisitos

- Node.js 18+
- npm 8+
- Pacote `common` compilado

## Instalação

Este módulo é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd apps/kiosk
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173/kiosk`.

## Compilação para Produção

```bash
npm run build
```

Os arquivos compilados serão gerados na pasta `dist/`.

## Endpoints de API Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/products` | GET | Listar produtos |
| `/api/categories` | GET | Listar categorias |
| `/api/orders` | POST | Criar novo pedido |
| `/api/payments/process` | POST | Processar pagamento |

Para mais detalhes sobre os endpoints de API, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).

## Integrações

- **Gateway de Pagamento** - Para processamento de pagamentos com cartão
- **Impressora de Senhas** - Para impressão de senha de atendimento

## Hooks Utilizados

- `useOrder` - Gerenciamento de pedidos

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
