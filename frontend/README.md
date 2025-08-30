# POS Modern - Frontend Monorepo

Este repositório contém o código frontend do sistema POS Modern, organizado como um monorepo usando npm workspaces.

## Estrutura do Projeto

O monorepo está organizado da seguinte forma:

```
frontend/
├── apps/              # Aplicações frontend específicas
│   ├── pos/           # Terminal de Ponto de Venda
│   ├── kds/           # Kitchen Display System
│   ├── kiosk/         # Terminal de Autoatendimento
│   ├── waiter/        # Aplicativo para Garçons (Web)
└── src/               # Outros módulos
```

## Tecnologias Utilizadas

- React 18
- TypeScript
- Vite
- npm workspaces

## Pré-requisitos

- Node.js 18+
- npm 8+

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/costadanilofreitas/chefia-pos.git
cd chefia-pos/frontend
```

2. Instale as dependências:

```bash
npm install
```

## Executando os Módulos

Cada módulo pode ser executado independentemente:

### POS (Terminal de Ponto de Venda)

```bash
cd apps/pos
npm run dev
```

### KDS (Kitchen Display System)

```bash
cd apps/kds
npm run dev
```

### Kiosk (Terminal de Autoatendimento)

```bash
cd apps/kiosk
npm run dev
```

### Waiter (Aplicativo para Garçons - Web)

```bash
cd apps/waiter
npm run dev
```

## Compilando para Produção

Para compilar todos os módulos para produção:

```bash
npm run build
```

Para compilar um módulo específico:

```bash
cd apps/[módulo]
npm run build
```

## Documentação

- [Documentação de APIs e Pontos de Integração](./api-integration-docs.md)

## Dívidas Técnicas

### Configurações de TypeScript

As configurações de TypeScript foram temporariamente relaxadas para permitir a compilação. É necessário revisar e corrigir os erros de tipo em todo o projeto.

### Implementação de Hooks

Os hooks foram implementados com funcionalidades básicas simuladas. É necessário implementar a lógica real de comunicação com o backend.

## Contribuição

1. Crie um branch para sua feature: `git checkout -b feature/nome-da-feature`
2. Faça commit das suas alterações: `git commit -m 'feat: adiciona nova funcionalidade'`
3. Envie para o branch: `git push origin feature/nome-da-feature`
4. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença [LICENSE] - veja o arquivo LICENSE para detalhes.
