# Documentação do Monorepo Frontend - POS Modern

## Visão Geral

Este documento fornece uma visão geral da arquitetura, estrutura e padrões de desenvolvimento do monorepo frontend do sistema POS Modern.

## Arquitetura

O frontend do POS Modern é organizado como um monorepo usando npm workspaces, permitindo o compartilhamento de código entre diferentes módulos enquanto mantém a separação de responsabilidades. A arquitetura segue os seguintes princípios:

1. **Modularidade**: Cada aplicação frontend é um módulo independente
2. **Reutilização**: Componentes, hooks e utilitários comuns são compartilhados via pacote `common`
3. **Consistência**: Padrões de design e UX consistentes em todos os módulos
4. **Escalabilidade**: Facilidade para adicionar novos módulos ou funcionalidades

### Diagrama de Arquitetura

```
+-----------------------------------+
|            Frontend               |
+-----------------------------------+
|                                   |
|  +-----------------------------+  |
|  |          Common            |  |
|  | (Componentes, Hooks, Utils)|  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  |           Apps             |  |
|  | +-------------------------+ |  |
|  | |          POS           | |  |
|  | +-------------------------+ |  |
|  | |          KDS           | |  |
|  | +-------------------------+ |  |
|  | |         Kiosk          | |  |
|  | +-------------------------+ |  |
|  | |         Waiter         | |  |
|  | +-------------------------+ |  |
|  | |          Menu          | |  |
|  | +-------------------------+ |  |
|  | |     Mobile Waiter      | |  |
|  | +-------------------------+ |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  |        Backoffice          |  |
|  +-----------------------------+  |
|                                   |
+-----------------------------------+
           |            |
           v            v
+----------------+ +----------------+
|  Backend API   | |   Event Bus    |
+----------------+ +----------------+
```

## Estrutura do Monorepo

```
frontend/
├── common/            # Componentes, hooks e utilitários compartilhados
│   ├── src/
│   │   ├── components/  # Componentes React compartilhados
│   │   ├── contexts/    # Contextos e hooks React
│   │   └── utils/       # Funções utilitárias
│   ├── package.json
│   └── tsconfig.json
├── apps/              # Aplicações frontend específicas
│   ├── pos/           # Terminal de Ponto de Venda
│   ├── kds/           # Kitchen Display System
│   ├── kiosk/         # Terminal de Autoatendimento
│   ├── waiter/        # Aplicativo para Garçons (Web)
│   ├── menu/          # Cardápio Digital (QR Code)
│   └── mobile_waiter/ # Aplicativo para Garçons (React Native) - Em migração
├── src/               # Outros módulos
│   └── backoffice/    # Sistema de Gerenciamento (Backoffice)
├── package.json       # Configuração do workspace
└── tsconfig.json      # Configuração base do TypeScript
```

## Tecnologias Utilizadas

- **React 18**: Biblioteca para construção de interfaces
- **TypeScript**: Superset tipado de JavaScript
- **Material UI**: Biblioteca de componentes UI
- **Vite**: Ferramenta de build e desenvolvimento
- **npm workspaces**: Gerenciamento de monorepo
- **React Router**: Roteamento de aplicações
- **Context API**: Gerenciamento de estado
- **WebSockets**: Comunicação em tempo real

## Padrões de Desenvolvimento

### Estrutura de Módulos

Cada módulo frontend segue uma estrutura consistente:

```
module/
├── src/
│   ├── ui/            # Componentes de interface do usuário
│   └── index.jsx      # Ponto de entrada da aplicação
├── index.html         # Template HTML
├── package.json       # Dependências e scripts
├── tsconfig.json      # Configuração TypeScript
└── vite.config.js     # Configuração do Vite
```

### Importações

Para importar componentes, hooks e utilitários do pacote common:

```javascript
// Importar componentes
import { ProductCard } from '@common/components';

// Importar hooks
import { useAuth } from '@common/contexts/auth/hooks/useAuth';

// Importar utilitários
import { formatCurrency } from '@common/utils/formatters';
```

### Aliases de Importação

Os seguintes aliases estão configurados para facilitar as importações:

- `@common/`: Aponta para `frontend/common/src/`
- `@/`: Aponta para o diretório `src/` do módulo atual

### Convenções de Nomenclatura

- **Arquivos de Componentes**: PascalCase com extensão .jsx ou .tsx
- **Arquivos de Hooks**: camelCase com prefixo "use" e extensão .js ou .ts
- **Arquivos de Utilitários**: camelCase com extensão .js ou .ts
- **Diretórios**: camelCase

### Gerenciamento de Estado

- **Estado Local**: useState para estado de componentes
- **Estado Compartilhado**: Context API com hooks personalizados
- **Estado Global**: Context API para autenticação, configurações, etc.

## Fluxo de Desenvolvimento

1. **Instalação**: Instalar dependências do monorepo
   ```bash
   npm install
   ```

2. **Compilar Common**: Compilar o pacote common antes de iniciar o desenvolvimento
   ```bash
   cd common && npm run build
   ```

3. **Desenvolvimento**: Iniciar o servidor de desenvolvimento para um módulo específico
   ```bash
   cd apps/[módulo] && npm run dev
   ```

4. **Build**: Compilar um módulo para produção
   ```bash
   cd apps/[módulo] && npm run build
   ```

5. **Testes**: Executar testes para um módulo específico
   ```bash
   cd apps/[módulo] && npm test
   ```

## Integração com Backend

Os módulos frontend se comunicam com o backend através de uma API REST. Os endpoints específicos para cada módulo estão documentados em [api-integration-docs.md](./api-integration-docs.md).

## Integração com Event Bus

Para comunicação em tempo real entre os módulos, o sistema utiliza um event bus baseado em RabbitMQ. Os eventos e seus produtores/consumidores estão documentados em [api-integration-docs.md](./api-integration-docs.md).

## Implantação

### Desenvolvimento Local

Para executar o sistema completo localmente:

1. Iniciar o backend e o event bus
2. Compilar o pacote common
   ```bash
   cd common && npm run build
   ```
3. Iniciar os módulos frontend desejados
   ```bash
   cd apps/[módulo] && npm run dev
   ```

### Produção

Para implantação em produção:

1. Compilar todos os módulos
   ```bash
   npm run build
   ```
2. Implantar os arquivos estáticos gerados em um servidor web ou CDN
3. Configurar as URLs de API e event bus para apontar para os servidores de produção

## Dívidas Técnicas

As seguintes dívidas técnicas foram identificadas durante a migração para a estrutura de monorepo:

1. **Mobile Waiter**: O módulo Mobile Waiter é um aplicativo React Native que precisa ser migrado para um repositório próprio.

2. **Configurações de TypeScript**: As configurações de TypeScript foram temporariamente relaxadas para permitir a compilação. É necessário revisar e corrigir os erros de tipo em todo o projeto.

3. **Implementação de Hooks**: Os hooks compartilhados foram implementados com funcionalidades básicas simuladas. É necessário implementar a lógica real de comunicação com o backend.

4. **Componente MessageQueueTestInterface**: Este componente foi temporariamente excluído do build devido a incompatibilidades de tipo. Ele precisa ser refatorado para ser compatível com TypeScript.

## Recursos Adicionais

- [README do Monorepo](./README.md)
- [Documentação de APIs e Pontos de Integração](./api-integration-docs.md)
- [Plano de Migração](./migration-plan.md)
- [Status da Migração UI](./ui-migration-status.md)

## Contribuição

Para contribuir com o desenvolvimento do frontend do POS Modern, consulte o [README do Monorepo](./README.md) para instruções detalhadas.
