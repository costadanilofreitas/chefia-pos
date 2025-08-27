# Arquitetura do Chatbot WhatsApp com IA Generativa na AWS

## 1. Visão Geral

Este documento descreve a arquitetura proposta para um chatbot de WhatsApp com IA generativa, hospedado na AWS. O chatbot interagirá com clientes para receber pedidos, gerenciar itens, coletar dados de clientes, processar pagamentos online e encaminhar pedidos para o sistema POS Modern existente. O sistema será multi-tenant, suportando múltiplos restaurantes/clientes, cada um com sua própria instância de chatbot e configuração.

## 2. Requisitos Chave

- **Interface**: WhatsApp (via Twilio)
- **Inteligência**: IA Generativa (Amazon Bedrock)
- **Funcionalidades**: Interação de menu, gerenciamento de pedidos, cadastro/consulta de clientes, pagamento online (PIX/Cartão via Asaas), roteamento de pedidos.
- **Integração POS**: Event-driven via AWS SQS FIFO (uma fila por cliente/loja).
- **Infraestrutura**: Serverless (AWS Lambda).
- **Multi-tenancy**: Suporte a múltiplos clientes/lojas com configurações independentes.
- **Identificação**: Mapeamento de número de telefone do cliente para restaurante/loja.

## 3. Componentes da Arquitetura

```mermaid
graph TD
    subgraph Cliente
        WA[WhatsApp User]
    end

    subgraph Twilio
        TW_API[Twilio WhatsApp API]
    end

    subgraph AWS Cloud
        APIGW[API Gateway]
        subgraph Lambdas
            L_Webhook[Webhook Handler Lambda]
            L_AI[AI Conversation Service Lambda]
            L_Menu[Menu Service Lambda]
            L_Customer[Customer Service Lambda]
            L_Order[Order Service Lambda]
            L_Payment[Payment Service Lambda]
            L_AsaasWH[Asaas Webhook Handler Lambda]
        end
        Bedrock[Amazon Bedrock]
        SQS[SQS FIFO Queues (per client/store)]
        DDB_State[DynamoDB (Conversation State)]
        DDB_Config[DynamoDB (Client/Store Config)]
    end

    subgraph POS Modern System (Existing)
        POS_Listener[POS SQS Listener]
        POS_Core[POS Core Logic]
        Asaas_API[Asaas Payment Module API]
    end

    subgraph Asaas Platform
        Asaas_Platform[Asaas Payment Platform]
    end

    WA -- Message --> TW_API
    TW_API -- Webhook --> APIGW
    APIGW -- Trigger --> L_Webhook
    L_Webhook -- Identify Client/Store --> DDB_Config
    L_Webhook -- Get/Set State --> DDB_State
    L_Webhook -- Process Message --> L_AI
    L_AI -- Generate Response --> Bedrock
    L_AI -- Get Menu --> L_Menu
    L_AI -- Manage Customer --> L_Customer
    L_AI -- Place Order --> L_Order
    L_AI -- Initiate Payment --> L_Payment
    L_AI -- Get/Set State --> DDB_State
    L_AI -- Send Response --> L_Webhook
    L_Webhook -- Send Reply --> TW_API
    TW_API -- Reply --> WA

    L_Menu -- Fetch Menu Data --> POS_Core(Potentially via SQS/API)
    L_Customer -- Manage Customer Data --> POS_Core(Potentially via SQS/API)
    L_Order -- Publish Order Event --> SQS
    L_Payment -- Call API --> Asaas_API
    Asaas_API -- Process Payment --> Asaas_Platform
    Asaas_Platform -- Webhook --> APIGW(Separate Endpoint)
    APIGW -- Trigger --> L_AsaasWH
    L_AsaasWH -- Update Payment Status --> L_Payment
    L_Payment -- Update Order/Notify --> L_AI

    SQS -- Event --> POS_Listener
    POS_Listener -- Process Order --> POS_Core
```

**Descrição dos Componentes:**

1.  **Twilio WhatsApp API**: Recebe mensagens dos usuários e envia respostas do chatbot. Atua como gateway para a plataforma WhatsApp.
2.  **API Gateway**: Ponto de entrada seguro e escalável para os webhooks do Twilio e do Asaas.
3.  **Lambda - Webhook Handler**: Recebe webhooks do Twilio, identifica o cliente/loja via `DDB_Config`, gerencia o estado da conversa (`DDB_State`) e orquestra a chamada para o `L_AI`.
4.  **Lambda - AI Conversation Service**: Núcleo do chatbot. Gerencia o fluxo da conversa, interage com `Bedrock` para NLU/NLG, chama outros Lambdas de serviço (Menu, Customer, Order, Payment) e gerencia o estado da conversa em `DDB_State`.
5.  **Amazon Bedrock**: Fornece o modelo de IA generativa para compreensão da linguagem natural e geração de respostas contextuais e inteligentes.
6.  **Lambda - Menu Service**: Responsável por buscar informações do menu do restaurante específico. Pode interagir com o POS via SQS ou API (a ser definido).
7.  **Lambda - Customer Service**: Responsável por buscar ou cadastrar dados do cliente no sistema POS (via SQS ou API).
8.  **Lambda - Order Service**: Recebe os detalhes do pedido finalizado do `L_AI`, formata o evento e o publica na fila SQS FIFO correta para o restaurante/loja.
9.  **Lambda - Payment Service**: Interage com a API do `Asaas_API` (exposta pelo sistema POS Modern) para criar cobranças (PIX/Cartão) e verificar status.
10. **Lambda - Asaas Webhook Handler**: Recebe webhooks de status de pagamento do Asaas (via API Gateway) e atualiza o status no sistema (provavelmente chamando o `L_Payment`).
11. **SQS FIFO Queues**: Filas de mensagens (uma por cliente/loja) para garantir o desacoplamento e a entrega ordenada de eventos de pedido para o sistema POS.
12. **DynamoDB (Conversation State)**: Armazena o estado atual da conversa para cada usuário do WhatsApp, permitindo interações contínuas.
13. **DynamoDB (Client/Store Config)**: Armazena a configuração multi-tenant, incluindo mapeamento de número de telefone -> ID do cliente/loja, credenciais do Twilio, ARN da fila SQS, configuração do Asaas, etc.
14. **POS System (Listener & Core)**: O sistema POS existente escuta sua fila SQS específica, recebe os eventos de pedido e os processa internamente.
15. **Asaas Payment Module API**: API exposta pelo sistema POS Modern (ou serviço separado) para que o `L_Payment` possa iniciar e gerenciar pagamentos Asaas.
16. **Asaas Platform**: Plataforma externa do Asaas que processa os pagamentos.

## 4. Fluxo de Dados e Interações

### 4.1. Recebimento de Mensagem

1.  Usuário envia mensagem via WhatsApp.
2.  Twilio encaminha para API Gateway -> `L_Webhook`.
3.  `L_Webhook` identifica cliente/loja (`DDB_Config`), recupera estado (`DDB_State`), chama `L_AI`.

### 4.2. Processamento da Conversa

1.  `L_AI` recebe mensagem e contexto.
2.  `L_AI` interage com `Bedrock` para entender intenção e gerar resposta.
3.  Se necessário, `L_AI` chama `L_Menu`, `L_Customer` para obter dados.
4.  `L_AI` atualiza estado em `DDB_State`.
5.  `L_AI` retorna resposta para `L_Webhook`.
6.  `L_Webhook` envia resposta via Twilio para o usuário.

### 4.3. Criação de Pedido

1.  Conversa chega ao ponto de finalização do pedido.
2.  `L_AI` coleta todos os detalhes do pedido.
3.  `L_AI` chama `L_Order` com os detalhes.
4.  `L_Order` formata o evento e publica na fila SQS FIFO específica do cliente/loja.
5.  POS System (`POS_Listener`) consome o evento da fila e processa o pedido.
6.  `L_AI` confirma o recebimento do pedido ao usuário.

### 4.4. Pagamento Online (PIX/Cartão via Asaas)

1.  Usuário opta por pagamento online.
2.  `L_AI` chama `L_Payment` com detalhes do pedido/valor.
3.  `L_Payment` chama a `Asaas_API` (no POS Modern) para criar a cobrança.
4.  `Asaas_API` interage com a `Asaas_Platform`.
5.  `Asaas_API` retorna detalhes do pagamento (link/QR code PIX, link cartão) para `L_Payment`.
6.  `L_Payment` retorna para `L_AI`.
7.  `L_AI` envia os detalhes/link de pagamento para o usuário via Twilio.
8.  Usuário realiza o pagamento.
9.  `Asaas_Platform` envia webhook para API Gateway -> `L_AsaasWH`.
10. `L_AsaasWH` processa o webhook e atualiza o status (possivelmente chamando `L_Payment`).
11. O sistema POS é notificado da atualização do status do pagamento (via evento ou atualização direta do pedido).

## 5. Multi-tenancy e Identificação

- A tabela `DDB_Config` será a chave para a multi-tenancy.
- O número de telefone do remetente (usuário do WhatsApp) será usado para consultar `DDB_Config` e obter o ID do cliente/loja, ARN da fila SQS, configurações do Asaas, etc.
- Cada Lambda de serviço usará esse ID de cliente/loja para direcionar suas ações (ex: publicar na fila SQS correta).
- As credenciais do Twilio podem ser específicas por cliente/loja, armazenadas em `DDB_Config` ou Secrets Manager.

## 6. Considerações de AWS

- **Computação**: AWS Lambda para processamento serverless e escalável.
- **API**: API Gateway para exposição segura dos endpoints.
- **Mensageria**: SQS FIFO para comunicação assíncrona e ordenada com o POS.
- **Banco de Dados**: DynamoDB para armazenamento rápido e escalável de estado e configuração.
- **IA**: Amazon Bedrock para acesso a modelos de IA generativa.
- **Segurança**: IAM para controle de acesso granular, Secrets Manager para credenciais.
- **Monitoramento**: CloudWatch para logs e métricas.

## 7. Próximos Passos

1.  Refinar o design dos modelos de dados para estado e configuração.
2.  Detalhar as APIs internas entre os Lambdas.
3.  Definir o formato exato dos eventos SQS para o POS.
4.  Planejar a implementação dos fluxos de conversa no `L_AI` com `Bedrock`.
5.  Desenvolver o plano de implantação e provisionamento na AWS (IaC).
6.  Implementar e testar os componentes.
