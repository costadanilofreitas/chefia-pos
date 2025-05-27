# POS Modern - Cardápio Digital (Menu)

Este módulo contém a aplicação frontend para o Cardápio Digital do sistema POS Modern, acessível via QR Code pelos clientes.

## Funcionalidades

- Visualização do cardápio digital
- Busca e filtragem de produtos por categoria
- Exibição de detalhes dos produtos
- Visualização de informações do restaurante
- Interface responsiva para dispositivos móveis

## Estrutura do Projeto

```
menu/
├── src/
│   ├── ui/                # Componentes de interface do usuário
│   │   ├── MenuApp.jsx            # Aplicativo principal do cardápio
│   │   ├── CategoryFilter.jsx     # Filtro de categorias
│   │   ├── ProductList.jsx        # Lista de produtos
│   │   └── ProductDetail.jsx      # Detalhes do produto
│   └── index.jsx          # Ponto de entrada da aplicação
```

## Pré-requisitos

- Node.js 18+
- npm 8+
- Pacote `common` compilado

## Instalação

Este módulo é instalado automaticamente como parte do monorepo. Para instalação manual:

```bash
cd apps/menu
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173/menu`.

## Compilação para Produção

```bash
npm run build
```

Os arquivos compilados serão gerados na pasta `dist/`.

## Endpoints de API Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/restaurant/:id` | GET | Informações do restaurante |
| `/api/products` | GET | Listar produtos |
| `/api/categories` | GET | Listar categorias |

Para mais detalhes sobre os endpoints de API, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).

## Integrações

- **AWS S3** - Para armazenamento e acesso a imagens de produtos

## Utilitários Utilizados

- `formatCurrency` - Formatação de valores monetários

## Implantação

O cardápio digital pode ser hospedado na AWS e acessado via QR Code que é gerado para cada restaurante. O QR Code pode ser impresso em materiais de marketing, mesas, ou exibido na entrada do restaurante.

## Testes

```bash
npm test
```

## Documentação Adicional

Para mais informações sobre a integração com outros módulos, consulte a [documentação de APIs e pontos de integração](../../api-integration-docs.md).
