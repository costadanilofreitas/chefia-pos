# POS Moderno - Sistema de Autenticação e RBAC

Este projeto implementa o sistema de autenticação e controle de acesso baseado em papéis (RBAC) para o POS Moderno, um sistema de ponto de venda para restaurantes.

## Estrutura do Projeto

```
pos-modern/
├── src/
│   ├── api/
│   │   └── main.py           # Aplicação FastAPI principal
│   ├── auth/
│   │   ├── models.py         # Modelos de dados para autenticação
│   │   ├── router.py         # Endpoints de autenticação
│   │   └── security.py       # Lógica de segurança e RBAC
│   ├── tests/
│   │   └── test_auth.py      # Testes unitários e de integração
│   ├── core/                 # (Futuro) Lógica de negócio principal
│   └── utils/                # (Futuro) Utilitários compartilhados
├── requirements.txt          # Dependências do projeto
├── Dockerfile                # Configuração para containerização
├── docker-compose.yml        # Configuração para ambiente de desenvolvimento
└── README.md                 # Documentação do projeto
```

## Funcionalidades Implementadas

- **Autenticação JWT**: Sistema completo de autenticação usando tokens JWT
- **Controle de Acesso (RBAC)**: Controle granular baseado em papéis e permissões
- **Documentação Automática**: Swagger/OpenAPI integrado
- **Testes Automatizados**: Testes unitários e de integração para fluxos de autenticação

## Papéis e Permissões

O sistema implementa os seguintes papéis:

- **Gerente**: Acesso completo ao sistema
- **Caixa**: Operações de venda e caixa
- **Garçom**: Registro e consulta de pedidos
- **Cozinheiro**: Visualização e atualização de pedidos na cozinha

Cada papel possui um conjunto específico de permissões que determinam quais operações o usuário pode realizar.

## Como Executar

### Usando Docker (Recomendado)

1. Certifique-se de ter Docker e Docker Compose instalados
2. Clone o repositório
3. Execute o comando:

```bash
docker-compose up
```

4. Acesse a API em http://localhost:8000
5. Acesse a documentação Swagger em http://localhost:8000/api/docs

### Sem Docker

1. Certifique-se de ter Python 3.11+ instalado
2. Clone o repositório
3. Crie um ambiente virtual:

```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

4. Instale as dependências:

```bash
pip install -r requirements.txt
```

5. Execute a aplicação:

```bash
cd pos-modern
uvicorn src.api.main:app --reload
```

6. Acesse a API em http://localhost:8000
7. Acesse a documentação Swagger em http://localhost:8000/api/docs

## Como Testar

Execute os testes automatizados com:

```bash
pytest src/tests/
```

## Usuários de Teste

Para facilitar os testes, o sistema vem pré-configurado com os seguintes usuários:

- **Gerente**: username: `gerente`, senha: `senha123`
- **Caixa**: username: `caixa`, senha: `senha123`
- **Garçom**: username: `garcom`, senha: `senha123`
- **Cozinheiro**: username: `cozinheiro`, senha: `senha123`

## Exemplos de Uso

### Autenticação

```bash
curl -X POST "http://localhost:8000/api/v1/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=gerente&password=senha123"
```

### Acessar Endpoint Protegido

```bash
curl -X GET "http://localhost:8000/api/v1/protected" \
  -H "Authorization: Bearer {seu_token_aqui}"
```

## Próximos Passos

- Implementação do módulo de frente de caixa
- Implementação do módulo de estoque
- Implementação do módulo de pedidos
- Integração com sistemas externos (iFood, SAT, SiTef)

## Notas de Desenvolvimento

Este módulo foi desenvolvido seguindo as melhores práticas de segurança e modularidade, visando um sistema leve e rápido para execução local. A arquitetura foi projetada para ser facilmente extensível e manutenível.
