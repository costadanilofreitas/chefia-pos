# Mobile Waiter App (React Native)

Este módulo contém a aplicação mobile para garçons do sistema POS Modern, desenvolvida em React Native.

## Status: Dívida Técnica

**ATENÇÃO: Este módulo está marcado como dívida técnica e deve ser migrado para um repositório separado.**

O Mobile Waiter App é uma aplicação React Native que não pode ser compilada dentro do monorepo web atual devido às suas dependências nativas específicas. Este módulo deve ser tratado separadamente e migrado para um repositório próprio com sua própria estrutura de build.

## Funcionalidades

- Visualização do layout de mesas do restaurante
- Gerenciamento de mesas e ocupação
- Criação e edição de pedidos
- Acompanhamento de status de pedidos
- Fechamento de conta
- Sincronização offline

## Estrutura do Projeto

```
mobile_waiter/
├── src/
│   ├── screens/           # Telas da aplicação
│   ├── components/        # Componentes reutilizáveis
│   ├── contexts/          # Contextos React
│   ├── navigation/        # Configuração de navegação
│   ├── services/          # Serviços (API, banco de dados local)
│   └── store/             # Estado global (Redux)
```

## Pré-requisitos para Desenvolvimento

- Node.js 18+
- npm 8+
- React Native CLI
- Android Studio / Xcode

## Plano de Migração

1. Criar um novo repositório separado para o Mobile Waiter
2. Migrar o código existente para o novo repositório
3. Configurar o ambiente de build para React Native
4. Implementar integração com a API do POS Modern
5. Configurar CI/CD para builds mobile

## Endpoints de API Utilizados

Os mesmos endpoints utilizados pelo módulo Waiter web:

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

## Funcionalidades Específicas Mobile

- **Sincronização Offline**: Capacidade de trabalhar sem conexão com a internet
- **Notificações Push**: Alertas para novos pedidos e atualizações
- **Scanner de QR Code**: Para identificação rápida de mesas
- **Acesso à Câmera**: Para fotos de problemas ou situações especiais

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
