# POS Modern - Sistema de Gerenciamento (Backoffice)

Este módulo contém a aplicação frontend para o Sistema de Gerenciamento (Backoffice) do sistema POS Modern, permitindo o gerenciamento remoto do restaurante.

## Funcionalidades

- Dashboard com indicadores de desempenho
- Gerenciamento de cardápio (produtos e categorias)
- Controle de estoque
- Gerenciamento de clientes
- Geração de relatórios
- Configurações do restaurante

## Estrutura do Projeto

```
backoffice/
├── src/
│   ├── ui/                # Componentes de interface do usuário
│   │   ├── BackofficeApp.jsx      # Aplicativo principal do backoffice
│   │   ├── Dashboard.jsx          # Dashboard com indicadores
│   │   ├── MenuManager.jsx        # Gerenciador de cardápio
│   │   ├── InventoryControl.jsx   # Controle de estoque
│   │   ├── CustomerManager.jsx    # Gerenciador de clientes
│   │   ├── ReportGenerator.jsx    # Gerador de relatórios
│   │   └── Settings.jsx           # Configurações do sistema
│   └── index.jsx          # Ponto de entrada da aplicação
```

## Pré-requisitos

- Node.js 18+
- npm 8+
- Pacote `common` compilado

## Instalação

Este módulo é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd src/backoffice
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173/backoffice`.

## Compilação para Produção

```bash
npm run build
```

Os arquivos compilados serão gerados na pasta `dist/`.

## Endpoints de API Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Autenticação de usuário |
| `/api/restaurants` | GET | Listar restaurantes |
| `/api/restaurants/:id` | GET | Detalhes do restaurante |
| `/api/restaurants/:id/stats` | GET | Estatísticas do restaurante |
| `/api/products` | GET/POST/PUT | Gerenciar produtos |
| `/api/categories` | GET/POST | Gerenciar categorias |
| `/api/inventory` | GET | Listar itens de estoque |
| `/api/customers` | GET | Listar clientes |
| `/api/reports/sales` | GET | Relatório de vendas |
| `/api/reports/inventory` | GET | Relatório de estoque |

Para mais detalhes sobre os endpoints de API, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).

## Integrações

- **AWS S3** - Para armazenamento e acesso a imagens de produtos
- **Serviço de Relatórios** - Para geração de relatórios em PDF

## Hooks Utilizados

- `useAuth` - Gerenciamento de autenticação
- `useApi` - Chamadas à API com tratamento de erros

## Implantação

O backoffice pode ser hospedado na AWS para acesso remoto pelos gerentes do restaurante. Isso permite o gerenciamento do sistema a partir de qualquer local com acesso à internet.

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
