# POS Modern - Kitchen Display System (KDS)

Este módulo contém a aplicação frontend para o Kitchen Display System (KDS) do sistema POS Modern, responsável por exibir os pedidos para a cozinha e gerenciar o fluxo de preparação.

## Funcionalidades

- Visualização de pedidos em tempo real
- Gerenciamento de estações de trabalho (grelha, fritadeira, etc.)
- Atualização de status de pedidos
- Estatísticas de tempo de preparação
- Notificações sonoras para novos pedidos

## Estrutura do Projeto

```
kds/
├── src/
│   ├── ui/                # Componentes de interface do usuário
│   │   ├── KDSMainPage.jsx        # Página principal do KDS
│   │   ├── KDSHeader.jsx          # Cabeçalho com seletor de estações
│   │   ├── StationSelector.jsx    # Seletor de estações de trabalho
│   │   ├── OrderCard.jsx          # Cartão de visualização de pedido
│   │   └── KDSStats.jsx           # Estatísticas de tempo de preparação
│   └── index.jsx          # Ponto de entrada da aplicação
```

## Pré-requisitos

- Node.js 18+
- npm 8+
- Pacote `common` compilado

## Instalação

Este módulo é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd apps/kds
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173/kds`.

## Compilação para Produção

```bash
npm run build
```

Os arquivos compilados serão gerados na pasta `dist/`.

## Endpoints de API Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Autenticação de usuário |
| `/api/orders` | GET | Listar pedidos |
| `/api/orders/:id/status` | PUT | Atualizar status do pedido |
| `/api/stations` | GET | Listar estações de trabalho |

Para mais detalhes sobre os endpoints de API, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).

## Integrações

- **Event Bus** - Para receber atualizações em tempo real de novos pedidos
- **Impressora de Comandas** - Para impressão de comandas na cozinha

## Hooks Utilizados

- `useAuth` - Gerenciamento de autenticação
- `useWebSocket` - Conexão com WebSocket para atualizações em tempo real
- `useOrder` - Gerenciamento de pedidos

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
