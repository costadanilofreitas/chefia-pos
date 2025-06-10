# ChefIA POS - Sistema Completo de Gestão para Restaurantes

O ChefIA POS é uma solução completa e modular para gestão de restaurantes, oferecendo desde o ponto de venda até integrações avançadas com plataformas de delivery, pagamentos online e análises preditivas com IA.

![ChefIA POS](https://github.com/costadanilofreitas/chefia-pos/raw/main/docs/images/logo.png)

## 🚀 Funcionalidades Implementadas

### 💰 Módulo POS (Ponto de Venda)
- **Terminal de Vendas**: Interface intuitiva para registro de vendas
- **Gestão de Caixa**: Abertura/fechamento, sangria, suprimento
- **Dia Operacional**: Controle de dias de operação
- **Pagamentos**: Dinheiro, cartão, PIX, vouchers
- **Impressão**: Cupons fiscais e não-fiscais

### 🍽️ Sistema de Mesas
- **Layout Visual**: Visualização real do salão com posicionamento exato
- **Formatos de Mesa**: Redonda, quadrada, retangular
- **Status em Tempo Real**: Livre, ocupada, reservada, limpeza
- **Gestão de Áreas**: Salão principal, terraço, área VIP, bar
- **Estatísticas**: Mesas livres, ocupadas, faturamento

### 🚚 Sistema de Delivery
- **Gestão de Pedidos**: Pendentes, prontos, em entrega
- **Controle de Motoboys**: Status, capacidade, rotas
- **Endereços**: Cadastro e validação de endereços
- **Tracking**: Acompanhamento em tempo real
- **Integração**: APIs para plataformas de delivery

### 👨‍🍳 Interface do Garçom
- **Menu Categorizado**: Navegação intuitiva
- **Pedidos por Mesa**: Associação automática
- **Carrinho de Compras**: Gestão de itens
- **Tempo de Preparo**: Estimativas por item
- **Interface Otimizada**: Design para tablets

### 📊 Manager Screen
- **Dashboard**: KPIs em tempo real
- **Relatórios**: Vendas, caixa, produtos
- **Gestão de Funcionários**: Cadastro, permissões
- **Configurações**: Sistema, backup, restauração
- **Análises**: Gráficos e tendências

### 🏆 Sistema de Fidelidade
- **Gestão de Clientes**: Cadastro completo
- **Tiers de Fidelidade**: Bronze, Prata, Ouro, Platina
- **Sistema de Pontos**: Acúmulo por compra
- **Cupons de Desconto**: Percentual, valor fixo, pontos
- **Analytics**: Métricas de fidelidade

### 📋 Módulo Fiscal
- **NFC-e**: Nota Fiscal do Consumidor Eletrônica
- **SAT**: Sistema Autenticador e Transmissor
- **MF-e**: Módulo Fiscal Eletrônico
- **CF-e**: Cupom Fiscal Eletrônico
- **Integração Contabilizei**: Exportação contábil

### 🔄 Funcionalidades Comerciais
- **Modo Offline**: Funcionamento sem internet
- **Sincronização**: Quando volta online
- **PWA**: Instalável como app nativo
- **Multi-Terminal**: Configuração por terminal
- **Error Boundaries**: Tratamento robusto de erros

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18**: Biblioteca UI moderna
- **TypeScript 5**: Tipagem estática
- **Vite 5**: Build tool rápido
- **Material-UI**: Componentes de UI
- **React Router**: Navegação SPA
- **IndexedDB**: Armazenamento offline
- **Service Worker**: PWA e cache
- **Jest**: Testes unitários
- **Playwright**: Testes E2E

### Backend
- **Node.js**: Runtime JavaScript
- **Express**: Framework web
- **MongoDB**: Banco de dados NoSQL
- **Redis**: Cache e filas
- **Socket.IO**: Comunicação em tempo real
- **JWT**: Autenticação segura
- **Swagger**: Documentação API
- **Docker**: Containerização

## 📦 Estrutura do Projeto

```
chefia-pos/
├── frontend/                 # Código-fonte do frontend
│   ├── apps/                 # Aplicações
│   │   ├── pos/              # Terminal POS
│   │   ├── kds/              # Kitchen Display System
│   │   └── backoffice/       # Interface administrativa
│   └── common/               # Componentes compartilhados
├── src/                      # Código-fonte do backend
│   ├── api/                  # API principal
│   ├── auth/                 # Autenticação
│   ├── business_day/         # Gestão de dias de operação
│   ├── cashier/              # Operações de caixa
│   ├── customer/             # Gestão de clientes
│   ├── delivery/             # Sistema de delivery
│   ├── employee/             # Gestão de funcionários
│   ├── fiscal/               # Módulos fiscais
│   ├── inventory/            # Gestão de estoque
│   ├── loyalty/              # Sistema de fidelidade
│   ├── order/                # Gestão de pedidos
│   ├── payment/              # Processamento de pagamentos
│   ├── peripherals/          # Integração com periféricos
│   ├── product/              # Gestão de produtos
│   ├── table/                # Sistema de mesas
│   └── waiter/               # Módulo de garçom
├── e2e/                      # Testes end-to-end
├── docs/                     # Documentação
├── docker/                   # Configurações Docker
└── README.md                 # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+
- npm 9+
- Docker e Docker Compose (opcional)

### Instalação e Execução

#### Usando npm

1. Clone o repositório:
```bash
git clone https://github.com/costadanilofreitas/chefia-pos.git
cd chefia-pos
```

2. Instale as dependências do frontend:
```bash
cd frontend/apps/pos
npm install
```

3. Execute o frontend em modo de desenvolvimento:
```bash
npm run dev
```

4. Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

#### Usando Docker

1. Clone o repositório:
```bash
git clone https://github.com/costadanilofreitas/chefia-pos.git
cd chefia-pos
```

2. Construa e execute os containers:
```bash
docker-compose up -d
```

3. Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

## 🧪 Testes

### Testes Unitários
```bash
cd frontend/apps/pos
npm test
```

### Testes E2E
```bash
cd frontend/apps/pos
npm run test:e2e
```

### Visualizar Relatório de Testes E2E
```bash
cd frontend/apps/pos
npm run test:e2e:report
```

## 🏗️ Build para Produção

### Build Otimizado
```bash
cd frontend/apps/pos
npm run build
```

### Análise de Bundle
```bash
cd frontend/apps/pos
npm run build:analyze
```

### Preview de Produção
```bash
cd frontend/apps/pos
npm run preview
```

## 🐳 Deployment com Docker

1. Construa a imagem Docker:
```bash
docker build -t chefia-pos:latest -f frontend/apps/pos/Dockerfile .
```

2. Execute o container:
```bash
docker run -p 80:80 chefia-pos:latest
```

3. Acesse a aplicação em [http://localhost](http://localhost)

## 📱 Funcionalidades por Dispositivo

### Desktop/Laptop
- Todas as funcionalidades disponíveis
- Interface completa de gerenciamento
- Relatórios detalhados
- Configurações avançadas

### Tablet
- Terminal POS completo
- Interface do garçom
- Layout de mesas
- Gestão de pedidos

### Smartphone
- Visualização de pedidos
- Status de mesas
- Notificações
- Modo offline

## 🔒 Segurança

- **Autenticação**: JWT com refresh tokens
- **Autorização**: RBAC (Role-Based Access Control)
- **Proteção de Dados**: Criptografia em trânsito e em repouso
- **Validação**: Entrada de dados validada
- **Auditoria**: Logs de ações críticas
- **Recuperação**: Backup automático de dados

## 🌐 Multi-Terminal

O sistema suporta múltiplos terminais com configurações independentes:

- **Roteamento Dinâmico**: `/pos/1`, `/pos/2`, etc.
- **Configuração por Terminal**: Cada terminal tem sua própria configuração
- **Sincronização**: Dados compartilhados entre terminais
- **Permissões**: Controle de acesso por terminal

## 📊 Métricas de Performance

- **Bundle Size**: 812KB (otimizado)
- **Tempo de Carregamento**: <2s em conexões 4G
- **Lazy Loading**: Componentes carregados sob demanda
- **Code Splitting**: Chunks separados por funcionalidade
- **Offline First**: Funciona sem internet

## 🔄 Modo Offline

- **Service Worker**: Cache de recursos estáticos
- **IndexedDB**: Armazenamento local de dados
- **Sincronização**: Fila de operações para quando voltar online
- **PWA**: Instalável como aplicativo nativo
- **Fallback**: Páginas de contingência

## 👥 Usuários de Teste

Para facilitar os testes, o sistema vem pré-configurado com os seguintes usuários:

- **Administrador**: username: `admin`, senha: `admin123`
- **Gerente**: username: `gerente`, senha: `gerente123`
- **Caixa**: username: `caixa`, senha: `caixa123`
- **Garçom**: username: `garcom`, senha: `garcom123`

## 📝 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autores

- **Danilo Freitas** - [GitHub](https://github.com/costadanilofreitas)

## 🙏 Agradecimentos

- Equipe de desenvolvimento
- Beta testers
- Comunidade open source

