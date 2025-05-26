# Plano de Teste End-to-End do Chatbot WhatsApp

## 1. Visão Geral

Este documento descreve o plano de teste end-to-end para o chatbot WhatsApp do sistema POS Modern, abrangendo todos os fluxos de interação, desde o início da conversa até a finalização do pedido, incluindo pagamento, confirmação, atualizações de status e cenários de reembolso.

## 2. Ambientes de Teste

### 2.1. Ambiente de Desenvolvimento

| Componente | Configuração |
|------------|--------------|
| **AWS Region** | us-east-1 (N. Virginia) |
| **Twilio** | Conta sandbox |
| **Asaas** | Ambiente sandbox |
| **Bedrock** | Modelo Claude 3 Sonnet |
| **Dados** | Restaurantes e menus de teste |

### 2.2. Ambiente de Homologação

| Componente | Configuração |
|------------|--------------|
| **AWS Region** | sa-east-1 (São Paulo) |
| **Twilio** | Conta de produção com número de teste |
| **Asaas** | Ambiente sandbox |
| **Bedrock** | Modelo Claude 3 Sonnet |
| **Dados** | Cópia dos dados de produção |

## 3. Casos de Teste

### 3.1. Fluxo Básico de Pedido

#### TC-001: Pedido Completo com Pagamento em Dinheiro

**Objetivo**: Verificar o fluxo completo de pedido com pagamento na entrega.

**Pré-condições**:
- Cliente cadastrado no sistema
- Restaurante configurado com confirmação automática
- Menu do restaurante disponível

**Passos**:
1. Cliente inicia conversa com "Olá"
2. Chatbot responde com saudação e opções
3. Cliente solicita ver o cardápio
4. Chatbot apresenta categorias do menu
5. Cliente seleciona categoria "Hambúrgueres"
6. Chatbot apresenta itens da categoria
7. Cliente seleciona "Cheese Bacon"
8. Chatbot apresenta detalhes e opções de personalização
9. Cliente adiciona item ao carrinho
10. Cliente solicita finalizar pedido
11. Chatbot confirma itens e solicita endereço
12. Cliente confirma endereço cadastrado
13. Chatbot apresenta opções de pagamento
14. Cliente seleciona "Dinheiro na entrega"
15. Chatbot solicita confirmação final
16. Cliente confirma pedido
17. Chatbot processa pedido e envia para o POS
18. POS confirma recebimento
19. Chatbot envia confirmação ao cliente

**Resultados Esperados**:
- Pedido criado com status "CONFIRMED"
- Pedido enviado corretamente para a fila SQS do restaurante
- Cliente recebe mensagem de confirmação
- Pedido visível no sistema POS com todos os detalhes corretos

#### TC-002: Pedido Completo com Pagamento PIX

**Objetivo**: Verificar o fluxo completo de pedido com pagamento PIX online.

**Pré-condições**:
- Cliente cadastrado no sistema
- Restaurante configurado com confirmação automática
- Menu do restaurante disponível
- Integração com Asaas configurada

**Passos**:
1. Cliente inicia conversa e navega pelo menu
2. Cliente adiciona itens ao carrinho
3. Cliente solicita finalizar pedido
4. Chatbot confirma itens e solicita endereço
5. Cliente confirma endereço cadastrado
6. Chatbot apresenta opções de pagamento
7. Cliente seleciona "PIX"
8. Chatbot processa pedido e gera QR Code PIX
9. Cliente simula pagamento no ambiente sandbox
10. Asaas envia webhook de confirmação de pagamento
11. Chatbot atualiza status do pagamento
12. Chatbot envia confirmação ao cliente
13. POS recebe pedido e atualiza status

**Resultados Esperados**:
- Pedido criado com status "CONFIRMED"
- Pagamento registrado com status "PAID"
- QR Code PIX gerado corretamente
- Webhook do Asaas processado corretamente
- Cliente recebe confirmação de pagamento
- Pedido enviado para o POS após confirmação de pagamento

#### TC-003: Pedido com Confirmação Manual

**Objetivo**: Verificar o fluxo de pedido que requer confirmação manual do restaurante.

**Pré-condições**:
- Cliente cadastrado no sistema
- Restaurante configurado com confirmação manual
- Menu do restaurante disponível

**Passos**:
1. Cliente realiza pedido completo com pagamento em dinheiro
2. Chatbot processa pedido e envia para o POS
3. Chatbot informa cliente que pedido aguarda confirmação
4. Operador do POS visualiza pedido pendente
5. Operador confirma pedido no POS
6. POS envia evento de confirmação via SQS
7. Chatbot recebe confirmação e atualiza status
8. Chatbot notifica cliente sobre confirmação

**Resultados Esperados**:
- Pedido criado com status "PENDING"
- Cliente recebe mensagem informando que pedido aguarda confirmação
- Pedido aparece na lista de pendentes no POS
- Após confirmação, status atualizado para "CONFIRMED"
- Cliente recebe notificação de confirmação

### 3.2. Fluxos de Pagamento

#### TC-004: Pagamento com Cartão de Crédito

**Objetivo**: Verificar o fluxo de pagamento com cartão de crédito.

**Pré-condições**:
- Cliente cadastrado no sistema
- Restaurante com pagamento online habilitado
- Integração com Asaas configurada

**Passos**:
1. Cliente realiza pedido e seleciona "Cartão de Crédito"
2. Chatbot gera link de pagamento do Asaas
3. Cliente acessa link e preenche dados do cartão
4. Cliente finaliza pagamento no ambiente sandbox
5. Asaas envia webhook de confirmação
6. Chatbot atualiza status do pagamento
7. Chatbot notifica cliente sobre confirmação

**Resultados Esperados**:
- Link de pagamento gerado corretamente
- Pagamento processado no ambiente sandbox
- Webhook recebido e processado
- Status de pagamento atualizado para "PAID"
- Cliente recebe confirmação de pagamento

#### TC-005: Falha de Pagamento PIX

**Objetivo**: Verificar o comportamento do sistema quando um pagamento PIX falha.

**Pré-condições**:
- Cliente cadastrado no sistema
- Restaurante com pagamento online habilitado
- Integração com Asaas configurada

**Passos**:
1. Cliente realiza pedido e seleciona "PIX"
2. Chatbot gera QR Code PIX
3. Cliente não realiza o pagamento dentro do tempo limite
4. Asaas envia webhook de expiração
5. Chatbot atualiza status do pagamento
6. Chatbot notifica cliente sobre falha
7. Chatbot oferece opções para tentar novamente

**Resultados Esperados**:
- QR Code PIX gerado corretamente
- Webhook de expiração processado
- Status de pagamento atualizado para "FAILED"
- Cliente recebe notificação sobre falha
- Cliente recebe opções para tentar novamente ou escolher outro método

### 3.3. Fluxos de Confirmação e Cancelamento

#### TC-006: Cancelamento de Pedido pelo Restaurante

**Objetivo**: Verificar o fluxo de cancelamento de pedido pelo restaurante.

**Pré-condições**:
- Pedido criado com status "CONFIRMED"
- Pagamento online realizado (PIX ou cartão)

**Passos**:
1. Operador do POS cancela pedido
2. POS envia evento de cancelamento via SQS
3. Chatbot recebe cancelamento e atualiza status
4. Chatbot inicia processo de reembolso
5. Asaas processa reembolso
6. Asaas envia webhook de confirmação de reembolso
7. Chatbot atualiza status do pagamento
8. Chatbot notifica cliente sobre cancelamento e reembolso

**Resultados Esperados**:
- Status do pedido atualizado para "CANCELLED"
- Processo de reembolso iniciado automaticamente
- Reembolso processado no Asaas
- Status de pagamento atualizado para "REFUNDED"
- Cliente recebe notificação sobre cancelamento e reembolso

#### TC-007: Timeout de Confirmação com Reembolso

**Objetivo**: Verificar o fluxo de timeout de confirmação com reembolso automático.

**Pré-condições**:
- Restaurante configurado com confirmação manual
- Restaurante configurado para reembolso automático
- Pedido criado com pagamento online

**Passos**:
1. Cliente realiza pedido com pagamento PIX
2. Cliente realiza pagamento
3. Pedido aguarda confirmação do restaurante
4. Restaurante não confirma dentro do tempo limite
5. EventBridge dispara verificação de pedidos expirados
6. OrderService identifica pedido expirado
7. OrderService inicia processo de reembolso
8. Asaas processa reembolso
9. Chatbot atualiza status do pedido e pagamento
10. Chatbot notifica cliente sobre cancelamento e reembolso

**Resultados Esperados**:
- Pedido identificado como expirado
- Processo de reembolso iniciado automaticamente
- Reembolso processado no Asaas
- Status do pedido atualizado para "REFUNDED"
- Status do pagamento atualizado para "REFUNDED"
- Cliente recebe notificação sobre cancelamento e reembolso

### 3.4. Fluxos de Atualização de Status

#### TC-008: Ciclo de Vida Completo do Pedido

**Objetivo**: Verificar todas as transições de status do pedido e notificações correspondentes.

**Pré-condições**:
- Pedido confirmado no sistema
- Restaurante configurado para notificar em todas as mudanças de status

**Passos**:
1. Operador do POS atualiza status para "PREPARING"
2. POS envia evento de atualização via SQS
3. Chatbot atualiza status e notifica cliente
4. Operador atualiza status para "READY"
5. POS envia evento de atualização via SQS
6. Chatbot atualiza status e notifica cliente
7. Operador atualiza status para "DELIVERING"
8. POS envia evento de atualização via SQS
9. Chatbot atualiza status e notifica cliente
10. Operador atualiza status para "DELIVERED"
11. POS envia evento de atualização via SQS
12. Chatbot atualiza status e notifica cliente
13. Sistema atualiza automaticamente para "COMPLETED"
14. Chatbot notifica cliente sobre conclusão

**Resultados Esperados**:
- Todas as transições de status processadas corretamente
- Eventos SQS enviados e recebidos para cada atualização
- Cliente recebe notificação para cada mudança de status
- Histórico de status do pedido registrado corretamente
- Status final do pedido é "COMPLETED"

### 3.5. Fluxos de Cliente

#### TC-009: Novo Cliente - Cadastro Durante Pedido

**Objetivo**: Verificar o fluxo de cadastro de novo cliente durante o processo de pedido.

**Pré-condições**:
- Número de telefone não cadastrado no sistema
- Restaurante configurado corretamente

**Passos**:
1. Cliente inicia conversa com número não cadastrado
2. Chatbot identifica cliente como novo
3. Cliente navega pelo menu e adiciona itens
4. Cliente solicita finalizar pedido
5. Chatbot solicita informações de cadastro (nome, email, etc.)
6. Cliente fornece informações
7. Chatbot valida e registra novo cliente
8. Chatbot solicita endereço de entrega
9. Cliente fornece endereço
10. Pedido prossegue normalmente

**Resultados Esperados**:
- Novo cliente criado no sistema
- Dados do cliente validados corretamente
- Endereço registrado e associado ao cliente
- Pedido associado ao novo cliente
- Fluxo de pedido concluído com sucesso

#### TC-010: Cliente Existente - Consulta de Pedidos Anteriores

**Objetivo**: Verificar a funcionalidade de consulta de pedidos anteriores.

**Pré-condições**:
- Cliente cadastrado com histórico de pedidos
- Restaurante configurado corretamente

**Passos**:
1. Cliente inicia conversa
2. Chatbot identifica cliente existente
3. Cliente solicita "ver meus pedidos" ou similar
4. Chatbot consulta histórico de pedidos
5. Chatbot apresenta resumo dos últimos pedidos
6. Cliente solicita detalhes de um pedido específico
7. Chatbot apresenta detalhes completos do pedido

**Resultados Esperados**:
- Cliente identificado corretamente
- Histórico de pedidos recuperado
- Resumo de pedidos apresentado de forma clara
- Detalhes do pedido específico apresentados corretamente

### 3.6. Fluxos Multi-Tenant

#### TC-011: Identificação Correta de Cliente/Loja

**Objetivo**: Verificar que o sistema identifica corretamente o cliente (restaurante) e loja com base no número de telefone.

**Pré-condições**:
- Múltiplos clientes configurados no sistema
- Múltiplas lojas configuradas para um cliente

**Passos**:
1. Usuário final envia mensagem para número do WhatsApp do restaurante A
2. Webhook do Twilio é recebido com número de origem e destino
3. Sistema identifica o restaurante A com base no número de destino
4. Sistema identifica a loja específica com base na configuração
5. Chatbot responde com saudação personalizada do restaurante A
6. Usuário final envia mensagem para número do WhatsApp do restaurante B
7. Sistema identifica corretamente o restaurante B
8. Chatbot responde com saudação personalizada do restaurante B

**Resultados Esperados**:
- Restaurante A identificado corretamente para seu número
- Restaurante B identificado corretamente para seu número
- Loja específica identificada corretamente
- Saudações personalizadas corretas para cada restaurante
- Dados isolados entre os diferentes restaurantes

#### TC-012: Isolamento de Dados Multi-Tenant

**Objetivo**: Verificar que os dados de diferentes clientes (restaurantes) estão isolados.

**Pré-condições**:
- Múltiplos clientes configurados no sistema
- Dados de menu, pedidos e clientes existentes para cada restaurante

**Passos**:
1. Usuário final solicita menu do restaurante A
2. Chatbot apresenta apenas itens do restaurante A
3. Usuário final faz pedido no restaurante A
4. Pedido é enviado apenas para a fila do restaurante A
5. Usuário final solicita histórico de pedidos
6. Chatbot apresenta apenas pedidos feitos no restaurante A
7. Repetir processo com restaurante B

**Resultados Esperados**:
- Menu do restaurante A contém apenas seus próprios itens
- Menu do restaurante B contém apenas seus próprios itens
- Pedido do restaurante A vai apenas para sua fila
- Histórico de pedidos mostra apenas pedidos do restaurante específico
- Nenhum vazamento de dados entre restaurantes

## 4. Testes de Integração

### 4.1. Integração Twilio

#### TC-013: Recebimento de Mensagens do Twilio

**Objetivo**: Verificar que o sistema recebe e processa corretamente mensagens do Twilio.

**Pré-condições**:
- Webhook do Twilio configurado para apontar para o API Gateway
- Conta Twilio configurada corretamente

**Passos**:
1. Enviar mensagem de texto via WhatsApp para o número do Twilio
2. Twilio envia webhook para o API Gateway
3. API Gateway encaminha para o Lambda WebhookHandler
4. WebhookHandler processa a mensagem
5. WebhookHandler invoca AIConversation Lambda
6. AIConversation gera resposta
7. Resposta é enviada de volta ao usuário via Twilio

**Resultados Esperados**:
- Webhook recebido e processado corretamente
- Mensagem extraída e processada
- Resposta gerada e enviada de volta
- Usuário recebe resposta no WhatsApp
- Logs completos da transação disponíveis

#### TC-014: Envio de Mídias (Imagens e QR Codes)

**Objetivo**: Verificar que o sistema pode enviar imagens e QR codes via Twilio.

**Pré-condições**:
- Integração Twilio configurada
- Bucket S3 para armazenamento de mídias configurado

**Passos**:
1. Cliente solicita menu com imagens
2. Sistema recupera URLs de imagens do menu
3. Sistema envia mensagens com imagens via Twilio
4. Cliente solicita pagamento via PIX
5. Sistema gera QR Code PIX
6. Sistema envia QR Code como imagem via Twilio

**Resultados Esperados**:
- Imagens do menu enviadas corretamente
- QR Code PIX gerado corretamente
- Imagens visíveis no WhatsApp do cliente
- QR Code escaneável e funcional

### 4.2. Integração Asaas

#### TC-015: Criação de Pagamento no Asaas

**Objetivo**: Verificar que o sistema cria corretamente pagamentos no Asaas.

**Pré-condições**:
- Integração Asaas configurada
- Ambiente sandbox do Asaas disponível

**Passos**:
1. Cliente realiza pedido e seleciona pagamento PIX
2. Sistema invoca PaymentService Lambda
3. PaymentService cria cliente no Asaas (se necessário)
4. PaymentService cria cobrança no Asaas
5. Asaas retorna detalhes do pagamento
6. Sistema armazena detalhes e envia para cliente

**Resultados Esperados**:
- Cliente criado no Asaas (se novo)
- Cobrança criada com valores corretos
- Detalhes do PIX (QR Code, código) retornados
- Informações armazenadas corretamente no DynamoDB
- Cliente recebe instruções de pagamento

#### TC-016: Processamento de Webhook do Asaas

**Objetivo**: Verificar que o sistema processa corretamente webhooks do Asaas.

**Pré-condições**:
- Webhook do Asaas configurado para apontar para o API Gateway
- Pagamento pendente no Asaas

**Passos**:
1. Simular pagamento no ambiente sandbox do Asaas
2. Asaas envia webhook de confirmação de pagamento
3. API Gateway encaminha para o Lambda WebhookHandler
4. WebhookHandler identifica tipo de webhook (pagamento)
5. WebhookHandler invoca PaymentService Lambda
6. PaymentService atualiza status do pagamento
7. PaymentService notifica OrderService
8. OrderService atualiza status do pedido
9. Cliente é notificado sobre confirmação

**Resultados Esperados**:
- Webhook recebido e processado corretamente
- Status de pagamento atualizado no DynamoDB
- Status de pedido atualizado conforme necessário
- Cliente notificado sobre mudança de status
- Logs completos da transação disponíveis

### 4.3. Integração SQS

#### TC-017: Envio de Pedido para Fila SQS

**Objetivo**: Verificar que o sistema envia corretamente pedidos para as filas SQS específicas de cada restaurante.

**Pré-condições**:
- Filas SQS FIFO criadas para cada restaurante/loja
- Configuração de roteamento no DynamoDB

**Passos**:
1. Cliente finaliza pedido no restaurante A, loja 1
2. OrderService determina fila SQS correta
3. OrderService formata mensagem de pedido
4. OrderService envia mensagem para fila SQS
5. Verificar mensagem na fila SQS do restaurante A, loja 1
6. Repetir processo para restaurante B, loja 2

**Resultados Esperados**:
- Fila SQS correta identificada para cada restaurante/loja
- Mensagem formatada corretamente com todos os detalhes do pedido
- Mensagem enviada com sucesso para a fila
- Mensagem contém ID de grupo para ordenação FIFO
- Mensagem contém ID de deduplicação para evitar duplicatas

#### TC-018: Recebimento de Atualizações de Status via SQS

**Objetivo**: Verificar que o sistema processa corretamente atualizações de status recebidas via SQS.

**Pré-condições**:
- Pedido existente no sistema
- Fila SQS configurada para receber atualizações do POS

**Passos**:
1. Simular envio de atualização de status do POS para SQS
2. Lambda SQSConsumer é acionado pela mensagem
3. SQSConsumer processa a mensagem
4. SQSConsumer invoca OrderService Lambda
5. OrderService atualiza status do pedido
6. OrderService notifica cliente sobre mudança de status

**Resultados Esperados**:
- Mensagem SQS processada corretamente
- Status do pedido atualizado no DynamoDB
- Histórico de status atualizado com nova entrada
- Cliente notificado sobre mudança de status
- Mensagem removida da fila após processamento bem-sucedido

### 4.4. Integração Amazon Bedrock

#### TC-019: Geração de Respostas com IA

**Objetivo**: Verificar que o sistema utiliza corretamente o Amazon Bedrock para gerar respostas contextuais.

**Pré-condições**:
- Integração com Amazon Bedrock configurada
- Modelo Claude 3 Sonnet disponível

**Passos**:
1. Cliente envia mensagem ambígua ou conversacional
2. AIConversation Lambda recupera contexto da conversa
3. AIConversation prepara prompt para o Bedrock
4. AIConversation invoca API do Bedrock
5. Bedrock gera resposta baseada no contexto
6. AIConversation processa resposta e extrai ações
7. AIConversation envia resposta ao cliente

**Resultados Esperados**:
- Contexto da conversa recuperado corretamente
- Prompt formatado com instruções claras
- Resposta gerada relevante ao contexto
- Ações extraídas corretamente da resposta
- Cliente recebe resposta natural e útil

#### TC-020: Análise de Intenção do Usuário

**Objetivo**: Verificar que o sistema identifica corretamente a intenção do usuário através do Bedrock.

**Pré-condições**:
- Integração com Amazon Bedrock configurada
- Modelo Claude 3 Sonnet disponível

**Passos**:
1. Cliente envia mensagem com intenção de ver o menu
   (ex: "quero ver o cardápio", "o que vocês têm?", "quais são as opções?")
2. AIConversation envia mensagem para análise no Bedrock
3. Bedrock identifica intenção como "ver_menu"
4. AIConversation executa ação correspondente
5. Repetir com diferentes intenções (fazer_pedido, ver_status, etc.)

**Resultados Esperados**:
- Intenção identificada corretamente para diferentes fraseologias
- Ação correspondente executada para cada intenção
- Resposta apropriada enviada ao cliente
- Alta precisão na identificação de intenções
- Tratamento adequado de ambiguidades

## 5. Testes de Desempenho

### 5.1. Testes de Carga

#### TC-021: Processamento Simultâneo de Mensagens

**Objetivo**: Verificar que o sistema pode processar múltiplas mensagens simultâneas.

**Pré-condições**:
- Ambiente de teste configurado
- Ferramenta de teste de carga configurada

**Passos**:
1. Simular 100 mensagens simultâneas para diferentes restaurantes
2. Monitorar tempo de resposta para cada mensagem
3. Monitorar uso de recursos (CPU, memória)
4. Verificar se todas as mensagens são processadas corretamente
5. Aumentar para 500 mensagens simultâneas
6. Repetir monitoramento e verificação

**Resultados Esperados**:
- Todas as mensagens processadas corretamente
- Tempo médio de resposta < 2 segundos
- 95º percentil de tempo de resposta < 5 segundos
- Nenhum erro de throttling ou timeout
- Uso de recursos dentro de limites aceitáveis

#### TC-022: Processamento de Pico de Pedidos

**Objetivo**: Verificar que o sistema pode lidar com picos de pedidos em horários de alta demanda.

**Pré-condições**:
- Ambiente de teste configurado
- Ferramenta de teste de carga configurada

**Passos**:
1. Simular 50 pedidos simultâneos para um único restaurante
2. Monitorar tempo de processamento de cada pedido
3. Monitorar entrega de mensagens SQS
4. Verificar se todos os pedidos são processados corretamente
5. Verificar se a ordem FIFO é mantida

**Resultados Esperados**:
- Todos os pedidos processados corretamente
- Tempo médio de processamento < 5 segundos
- Todas as mensagens SQS entregues na ordem correta
- Nenhum erro de throttling ou timeout
- Uso de recursos dentro de limites aceitáveis

### 5.2. Testes de Latência

#### TC-023: Latência de Resposta da IA

**Objetivo**: Verificar a latência de geração de respostas pelo Amazon Bedrock.

**Pré-condições**:
- Integração com Amazon Bedrock configurada
- Ferramenta de medição de tempo configurada

**Passos**:
1. Enviar 100 mensagens diferentes para processamento
2. Medir tempo desde recebimento até envio da resposta
3. Medir especificamente o tempo de chamada ao Bedrock
4. Analisar distribuição de tempos de resposta
5. Identificar fatores que afetam a latência

**Resultados Esperados**:
- Tempo médio de resposta total < 3 segundos
- Tempo médio de chamada ao Bedrock < 1,5 segundos
- 95º percentil de tempo total < 5 segundos
- Identificação clara de fatores que afetam a latência
- Recomendações para otimização

#### TC-024: Latência de Processamento de Pagamento

**Objetivo**: Verificar a latência do processamento de pagamentos via Asaas.

**Pré-condições**:
- Integração com Asaas configurada
- Ferramenta de medição de tempo configurada

**Passos**:
1. Iniciar 50 processos de pagamento PIX
2. Medir tempo desde solicitação até geração do QR Code
3. Simular pagamentos e medir tempo até confirmação
4. Analisar distribuição de tempos de processamento
5. Identificar gargalos no processo

**Resultados Esperados**:
- Tempo médio de geração de QR Code < 2 segundos
- Tempo médio de processamento de webhook < 1 segundo
- 95º percentil de tempo total < 4 segundos
- Identificação clara de gargalos
- Recomendações para otimização

## 6. Testes de Resiliência

### 6.1. Testes de Falha

#### TC-025: Recuperação de Falha do Lambda

**Objetivo**: Verificar que o sistema se recupera adequadamente de falhas do Lambda.

**Pré-condições**:
- Ambiente de teste configurado
- Mecanismo para injetar falhas configurado

**Passos**:
1. Injetar erro no Lambda AIConversation
2. Verificar comportamento do sistema
3. Verificar logs e métricas
4. Verificar se retentativa ocorre automaticamente
5. Verificar se cliente recebe resposta adequada
6. Repetir para outros Lambdas críticos

**Resultados Esperados**:
- Erro registrado corretamente nos logs
- Alarme CloudWatch acionado
- Retentativa automática ocorre conforme configurado
- Cliente recebe mensagem de erro amigável
- Sistema se recupera após resolução do erro

#### TC-026: Indisponibilidade do Asaas

**Objetivo**: Verificar o comportamento do sistema quando o Asaas está indisponível.

**Pré-condições**:
- Ambiente de teste configurado
- Mecanismo para simular indisponibilidade do Asaas

**Passos**:
1. Simular indisponibilidade do Asaas
2. Cliente tenta realizar pagamento
3. Verificar comportamento do sistema
4. Verificar mensagem de erro para o cliente
5. Restaurar disponibilidade do Asaas
6. Verificar recuperação do sistema

**Resultados Esperados**:
- Erro de conexão registrado nos logs
- Alarme CloudWatch acionado
- Cliente recebe mensagem explicando o problema
- Cliente recebe opções alternativas (ex: tentar mais tarde)
- Sistema se recupera quando Asaas volta a funcionar

### 6.2. Testes de Recuperação

#### TC-027: Recuperação de Contexto de Conversa

**Objetivo**: Verificar que o sistema mantém o contexto da conversa após falhas.

**Pré-condições**:
- Conversa em andamento no sistema
- Mecanismo para injetar falhas configurado

**Passos**:
1. Cliente inicia conversa e adiciona itens ao carrinho
2. Injetar falha no Lambda AIConversation
3. Verificar se contexto da conversa é salvo no DynamoDB
4. Sistema se recupera da falha
5. Cliente continua a conversa
6. Verificar se sistema recupera contexto anterior

**Resultados Esperados**:
- Contexto da conversa salvo regularmente no DynamoDB
- Após recuperação, sistema carrega contexto mais recente
- Cliente pode continuar de onde parou
- Carrinho e outras informações de estado preservados
- Experiência do cliente minimamente afetada

#### TC-028: Processamento de Mensagens Atrasadas

**Objetivo**: Verificar que o sistema processa corretamente mensagens que foram atrasadas devido a falhas.

**Pré-condições**:
- Ambiente de teste configurado
- Mecanismo para atrasar mensagens configurado

**Passos**:
1. Simular atraso em mensagens SQS
2. Verificar processamento quando mensagens chegam fora de ordem
3. Verificar tratamento de mensagens duplicadas
4. Verificar comportamento com mensagens muito atrasadas
5. Verificar impacto no status do pedido

**Resultados Esperados**:
- Mensagens processadas na ordem correta (FIFO)
- Mensagens duplicadas identificadas e ignoradas
- Mensagens muito atrasadas tratadas adequadamente
- Status do pedido consistente após processamento
- Logs claros sobre o processamento de mensagens atrasadas

## 7. Testes de Segurança

### 7.1. Testes de Autenticação e Autorização

#### TC-029: Validação de Webhook do Twilio

**Objetivo**: Verificar que o sistema valida corretamente a autenticidade dos webhooks do Twilio.

**Pré-condições**:
- Ambiente de teste configurado
- Conhecimento da assinatura do Twilio

**Passos**:
1. Enviar webhook válido com assinatura correta
2. Verificar que webhook é processado
3. Enviar webhook com assinatura inválida
4. Verificar que webhook é rejeitado
5. Enviar webhook com assinatura expirada
6. Verificar que webhook é rejeitado

**Resultados Esperados**:
- Webhook válido processado corretamente
- Webhook com assinatura inválida rejeitado com erro 403
- Webhook com assinatura expirada rejeitado
- Tentativas de falsificação registradas nos logs
- Alertas de segurança gerados para tentativas inválidas

#### TC-030: Proteção de Dados Sensíveis

**Objetivo**: Verificar que dados sensíveis são protegidos adequadamente.

**Pré-condições**:
- Ambiente de teste configurado
- Dados de teste incluindo informações sensíveis

**Passos**:
1. Processar pedido com dados de cliente sensíveis
2. Verificar armazenamento no DynamoDB
3. Verificar logs do CloudWatch
4. Verificar transmissão de dados para serviços externos
5. Verificar acesso aos dados via console AWS

**Resultados Esperados**:
- Dados sensíveis criptografados no DynamoDB
- Dados sensíveis mascarados nos logs
- Transmissão externa apenas via HTTPS
- Acesso aos dados restrito por políticas IAM
- Nenhum dado sensível exposto em texto claro

### 7.2. Testes de Isolamento Multi-Tenant

#### TC-031: Isolamento de Dados entre Clientes

**Objetivo**: Verificar que não há vazamento de dados entre diferentes clientes (restaurantes).

**Pré-condições**:
- Múltiplos clientes configurados no sistema
- Dados de teste para cada cliente

**Passos**:
1. Criar pedidos para cliente A
2. Tentar acessar dados do cliente A a partir do contexto do cliente B
3. Verificar logs de acesso
4. Verificar políticas de acesso no DynamoDB
5. Verificar isolamento em todas as tabelas

**Resultados Esperados**:
- Tentativas de acesso cruzado bloqueadas
- Logs de acesso mostram apenas acessos legítimos
- Políticas de acesso no DynamoDB funcionando corretamente
- Isolamento completo em todas as tabelas
- Alertas gerados para tentativas de acesso não autorizado

## 8. Matriz de Rastreabilidade

| ID do Teste | Requisito Relacionado | Componentes Testados | Prioridade |
|-------------|------------------------|----------------------|------------|
| TC-001 | Pedido básico | AIConversation, OrderService | Alta |
| TC-002 | Pagamento PIX | AIConversation, OrderService, PaymentService | Alta |
| TC-003 | Confirmação manual | OrderService, SQS | Alta |
| TC-004 | Pagamento cartão | PaymentService, Asaas | Alta |
| TC-005 | Falha pagamento | PaymentService, Asaas | Média |
| TC-006 | Cancelamento | OrderService, PaymentService | Alta |
| TC-007 | Timeout reembolso | OrderService, PaymentService, EventBridge | Alta |
| TC-008 | Ciclo de vida | OrderService, SQS | Média |
| TC-009 | Novo cliente | AIConversation | Média |
| TC-010 | Histórico pedidos | AIConversation, OrderService | Baixa |
| TC-011 | Identificação tenant | WebhookHandler | Alta |
| TC-012 | Isolamento dados | Todos | Alta |
| TC-013 | Webhook Twilio | WebhookHandler, Twilio | Alta |
| TC-014 | Envio mídias | AIConversation, Twilio | Média |
| TC-015 | Criação pagamento | PaymentService, Asaas | Alta |
| TC-016 | Webhook Asaas | WebhookHandler, PaymentService | Alta |
| TC-017 | Envio SQS | OrderService, SQS | Alta |
| TC-018 | Recebimento SQS | SQSConsumer, OrderService | Alta |
| TC-019 | Respostas IA | AIConversation, Bedrock | Alta |
| TC-020 | Análise intenção | AIConversation, Bedrock | Média |
| TC-021 | Carga mensagens | Todos | Média |
| TC-022 | Carga pedidos | OrderService, SQS | Média |
| TC-023 | Latência IA | AIConversation, Bedrock | Média |
| TC-024 | Latência pagamento | PaymentService, Asaas | Média |
| TC-025 | Falha Lambda | Todos | Alta |
| TC-026 | Indisponibilidade | PaymentService | Alta |
| TC-027 | Recuperação contexto | AIConversation, DynamoDB | Alta |
| TC-028 | Mensagens atrasadas | SQSConsumer, OrderService | Média |
| TC-029 | Validação webhook | WebhookHandler | Alta |
| TC-030 | Dados sensíveis | Todos | Alta |
| TC-031 | Isolamento tenant | Todos | Alta |

## 9. Plano de Execução

### 9.1. Ambiente de Desenvolvimento

| Fase | Testes | Duração Estimada |
|------|--------|------------------|
| 1 | TC-001, TC-002, TC-013, TC-019 | 2 dias |
| 2 | TC-003, TC-004, TC-015, TC-016 | 2 dias |
| 3 | TC-005, TC-006, TC-007, TC-017, TC-018 | 3 dias |
| 4 | TC-008, TC-009, TC-010, TC-014 | 2 dias |
| 5 | TC-011, TC-012, TC-020 | 2 dias |
| 6 | TC-025, TC-026, TC-027, TC-028 | 2 dias |
| 7 | TC-029, TC-030, TC-031 | 2 dias |

### 9.2. Ambiente de Homologação

| Fase | Testes | Duração Estimada |
|------|--------|------------------|
| 1 | TC-001 a TC-012 | 3 dias |
| 2 | TC-013 a TC-020 | 2 dias |
| 3 | TC-021 a TC-024 | 2 dias |
| 4 | TC-025 a TC-031 | 3 dias |

### 9.3. Critérios de Aceitação

Para que o sistema seja considerado pronto para produção, os seguintes critérios devem ser atendidos:

1. **Funcionalidade**:
   - 100% dos testes de alta prioridade passando
   - 90% dos testes de média prioridade passando
   - 80% dos testes de baixa prioridade passando

2. **Desempenho**:
   - Tempo médio de resposta < 3 segundos
   - 95º percentil de tempo de resposta < 5 segundos
   - Capacidade de processar 100 mensagens simultâneas

3. **Resiliência**:
   - Recuperação automática de todas as falhas simuladas
   - Zero perda de dados em cenários de falha
   - Processamento correto de mensagens atrasadas

4. **Segurança**:
   - Isolamento completo entre tenants
   - Proteção adequada de dados sensíveis
   - Validação de todas as entradas externas

## 10. Ferramentas de Teste

### 10.1. Automação de Testes

| Ferramenta | Uso |
|------------|-----|
| **Jest** | Testes unitários para Lambdas Node.js |
| **Pytest** | Testes unitários e de integração para Lambdas Python |
| **Postman** | Testes de API e webhooks |
| **Twilio Test Credentials** | Simulação de mensagens WhatsApp |
| **Asaas Sandbox** | Simulação de pagamentos |
| **AWS SAM Local** | Testes locais de Lambdas |
| **LocalStack** | Simulação local de serviços AWS |

### 10.2. Monitoramento de Testes

| Ferramenta | Uso |
|------------|-----|
| **CloudWatch Logs** | Análise de logs durante testes |
| **CloudWatch Metrics** | Monitoramento de performance |
| **X-Ray** | Rastreamento de requisições |
| **AWS CloudWatch Dashboards** | Visualização de métricas em tempo real |
| **JMeter** | Testes de carga e performance |

## 11. Relatórios de Teste

### 11.1. Formato de Relatório

Cada execução de teste gerará um relatório contendo:

1. **Resumo Executivo**:
   - Data e hora da execução
   - Ambiente de teste
   - Número total de testes
   - Taxa de sucesso/falha
   - Bloqueadores encontrados

2. **Detalhes por Caso de Teste**:
   - ID e nome do teste
   - Status (Passou/Falhou/Bloqueado)
   - Tempo de execução
   - Logs relevantes
   - Screenshots ou evidências (quando aplicável)

3. **Métricas de Performance**:
   - Tempos médios de resposta
   - Uso de recursos
   - Gargalos identificados

4. **Problemas Encontrados**:
   - Descrição do problema
   - Severidade
   - Passos para reproduzir
   - Impacto no usuário
   - Recomendação de correção

### 11.2. Critérios de Severidade

| Severidade | Descrição |
|------------|-----------|
| **Crítica** | Impede funcionalidade principal, sem solução alternativa |
| **Alta** | Impacta funcionalidade principal, com solução alternativa |
| **Média** | Impacta funcionalidade secundária |
| **Baixa** | Problemas cosméticos ou melhorias |

## 12. Próximos Passos

1. **Preparação de Ambiente**:
   - Configurar ambientes de desenvolvimento e homologação
   - Preparar dados de teste
   - Configurar ferramentas de automação

2. **Execução de Testes**:
   - Executar testes conforme plano de execução
   - Documentar resultados e problemas
   - Priorizar correções

3. **Validação Final**:
   - Executar testes de regressão após correções
   - Validar critérios de aceitação
   - Preparar relatório final

4. **Preparação para Produção**:
   - Finalizar documentação
   - Preparar plano de implantação
   - Definir estratégia de monitoramento pós-implantação
