# Agent Workflows Guide

## 🎯 Objetivo
Este guia fornece prompts e workflows otimizados para usar múltiplos agents de forma eficiente no desenvolvimento do Chefia POS.

---

## 📋 Workflows Principais

### 1. 🚀 Workflow de Nova Feature Completa
**Agents envolvidos:** feature-planner → database-architect → test-generator → code-best-practices-reviewer → docs-writer

```
Prompt Exemplo:
"Preciso implementar um sistema de [NOME DA FEATURE]. 
1. Use o feature-planner para quebrar em tarefas
2. Use o database-architect para modelar os dados necessários
3. Implemente a feature
4. Use o test-generator para criar testes
5. Use o code-best-practices-reviewer para validar o código
6. Use o docs-writer para documentar"
```

### 2. 🐛 Workflow de Correção de Bug
**Agents envolvidos:** bug-fixer → test-generator → code-best-practices-reviewer

```
Prompt Exemplo:
"Estou com o seguinte erro: [DESCRIÇÃO DO ERRO]
1. Use o bug-fixer para diagnosticar e corrigir
2. Use o test-generator para criar testes que previnam regressão
3. Use o code-best-practices-reviewer para garantir qualidade"
```

### 3. 📊 Workflow de Análise e Otimização
**Agents envolvidos:** data-insights-expert → code-simplifier → code-best-practices-reviewer

```
Prompt Exemplo:
"Preciso otimizar [ÁREA DO CÓDIGO/FEATURE]
1. Use o data-insights-expert para analisar métricas de performance
2. Use o code-simplifier para refatorar código complexo
3. Use o code-best-practices-reviewer para validar melhorias"
```

### 4. 🎨 Workflow de UI/UX Review
**Agents envolvidos:** ui-ux-reviewer → test-generator → docs-writer

```
Prompt Exemplo:
"Acabei de implementar [NOME DA TELA/COMPONENTE]
1. Use o ui-ux-reviewer para avaliar a interface
2. Implemente as melhorias sugeridas
3. Use o test-generator para criar testes de UI
4. Use o docs-writer para documentar padrões de UI"
```

### 5. 🗄️ Workflow de Database e Backend
**Agents envolvidos:** database-architect → test-generator → docs-writer

```
Prompt Exemplo:
"Preciso criar/modificar estrutura de dados para [FUNCIONALIDADE]
1. Use o database-architect para modelar schema
2. Implemente migrations e models
3. Use o test-generator para criar testes de integração
4. Use o docs-writer para documentar API"
```

### 6. 🚢 Workflow de Deploy e DevOps
**Agents envolvidos:** local-devops-manager → test-generator → docs-writer

```
Prompt Exemplo:
"Preciso configurar/debugar [AMBIENTE/SERVIÇO]
1. Use o local-devops-manager para configurar ambiente
2. Execute testes com o ambiente configurado
3. Use o docs-writer para documentar setup"
```

---

## 🎭 Prompts Específicos por Agent

### feature-planner
```
"Planeje a implementação de [FEATURE] considerando:
- Arquitetura atual do projeto
- Integração com módulos existentes
- Estimativa de complexidade
- Dependências e riscos"
```

### database-architect
```
"Modele o banco de dados para [FEATURE] incluindo:
- Tabelas e relacionamentos
- Índices necessários
- Estratégia de migração
- Considerações de performance"
```

### test-generator
```
"Crie testes abrangentes para [MÓDULO/FEATURE]:
- Testes unitários
- Testes de integração
- Testes E2E se aplicável
- Casos extremos e validações"
```

### code-best-practices-reviewer
```
"Revise o código recém implementado verificando:
- Padrões do projeto
- Code smells
- Performance
- Segurança
- Acessibilidade"
```

### ui-ux-reviewer
```
"Avalie a UI/UX de [COMPONENTE/TELA] considerando:
- Usabilidade
- Acessibilidade (WCAG)
- Responsividade
- Consistência visual
- Performance de renderização"
```

### bug-fixer
```
"Debug e corrija o seguinte problema:
[ERRO/STACK TRACE]
Contexto: [QUANDO OCORRE]
Comportamento esperado: [O QUE DEVERIA ACONTECER]"
```

### local-devops-manager
```
"Configure/gerencie [SERVIÇO/AMBIENTE]:
- Setup inicial
- Troubleshooting
- Otimização
- Automação de tarefas"
```

### docs-writer
```
"Documente [FEATURE/API/COMPONENTE]:
- README se necessário
- Comentários inline
- API documentation
- Guias de uso"
```

### data-insights-expert
```
"Analise [DADOS/MÉTRICAS] para:
- Identificar padrões
- Sugerir otimizações
- Prever tendências
- Recomendar KPIs"
```

### code-simplifier
```
"Refatore [CÓDIGO/COMPONENTE] para:
- Reduzir complexidade
- Melhorar legibilidade
- Eliminar duplicação
- Aplicar design patterns"
```

---

## 💡 Dicas de Uso

### Executar Agents em Paralelo
Quando possível, execute agents independentes simultaneamente:
```
"Execute em paralelo:
1. test-generator para criar testes do módulo X
2. docs-writer para documentar módulo Y
3. ui-ux-reviewer para revisar tela Z"
```

### Combinar Agents para Tarefas Complexas
```
"Para implementar sistema de notificações:
1. feature-planner: crie roadmap detalhado
2. database-architect: modele estrutura de dados
3. Implemente backend seguindo o plano
4. ui-ux-reviewer: revise componentes de UI
5. test-generator: crie suite de testes
6. code-best-practices-reviewer: valide implementação
7. docs-writer: documente API e componentes"
```

### Usar Agents Proativamente
```
"Após implementar [FEATURE], automaticamente:
- Execute code-best-practices-reviewer
- Execute test-generator para gaps de teste
- Execute ui-ux-reviewer se houver UI"
```

---

## 📊 Matriz de Decisão de Agents

| Situação | Agents Recomendados | Ordem |
|----------|-------------------|--------|
| Nova feature complexa | feature-planner → database-architect → test-generator → code-best-practices-reviewer | Sequencial |
| Bug crítico | bug-fixer → test-generator | Sequencial |
| Refatoração | code-simplifier → test-generator → code-best-practices-reviewer | Sequencial |
| Nova UI | ui-ux-reviewer → test-generator | Paralelo possível |
| Otimização de performance | data-insights-expert → code-simplifier | Sequencial |
| Setup de ambiente | local-devops-manager → docs-writer | Sequencial |
| Documentação pendente | docs-writer | Independente |
| Code review completo | code-best-practices-reviewer → ui-ux-reviewer → test-generator | Paralelo possível |

---

## 🔄 Workflow de CI/CD

### Pre-commit
```
"Antes de commitar:
1. code-best-practices-reviewer: valide mudanças
2. test-generator: verifique cobertura
3. Execute linting e testes"
```

### Pre-deploy
```
"Antes do deploy:
1. local-devops-manager: valide configurações
2. test-generator: execute suite completa
3. docs-writer: atualize changelog"
```

---

## 📝 Templates de Prompt

### Template Feature Completa
```
Vou implementar [NOME DA FEATURE] que [DESCRIÇÃO].

Requisitos:
- [REQ 1]
- [REQ 2]

Por favor:
1. Use feature-planner para criar plano detalhado
2. Use database-architect se precisar de mudanças no BD
3. Após implementação, use test-generator
4. Use code-best-practices-reviewer para validar
5. Use ui-ux-reviewer se tiver interface
6. Use docs-writer para documentar

Execução paralela quando possível.
```

### Template Debug
```
Erro: [MENSAGEM DE ERRO]
Arquivo: [CAMINHO]
Linha: [NÚMERO]
Contexto: [QUANDO OCORRE]

Use bug-fixer para diagnosticar e corrigir.
Depois use test-generator para prevenir regressão.
```

### Template Otimização
```
Preciso otimizar [ÁREA/FEATURE] porque [RAZÃO].

Métricas atuais:
- [MÉTRICA 1]: [VALOR]
- [MÉTRICA 2]: [VALOR]

Use data-insights-expert para analisar.
Use code-simplifier para refatorar.
Valide com code-best-practices-reviewer.
```

---

## 🎯 Melhores Práticas

1. **Sempre forneça contexto claro** - Os agents funcionam melhor com informações específicas
2. **Use múltiplos agents** - Combine diferentes perspectivas para resultados melhores
3. **Itere com feedback** - Use output de um agent como input para outro
4. **Documente sempre** - Use docs-writer após implementações significativas
5. **Teste continuamente** - Use test-generator durante desenvolvimento, não apenas no final
6. **Revise proativamente** - Use reviewers antes de finalizar, não depois
7. **Paralelize quando possível** - Execute agents independentes simultaneamente
8. **Mantenha qualidade** - Use code-best-practices-reviewer regularmente

---

## 📈 Métricas de Sucesso

- ✅ Cobertura de testes > 80%
- ✅ Zero warnings de best practices
- ✅ Documentação atualizada
- ✅ UI/UX validada
- ✅ Performance otimizada
- ✅ Código simplificado e mantível

---

## 🚨 Quando Usar Cada Agent

| Agent | Use Quando | Não Use Quando |
|-------|------------|----------------|
| feature-planner | Iniciar feature nova | Correções simples |
| database-architect | Mudanças em schema | Queries simples |
| test-generator | Após implementação | Código experimental |
| code-best-practices-reviewer | Antes de PR/commit | Protótipos rápidos |
| ui-ux-reviewer | Nova UI implementada | Backend only |
| bug-fixer | Erros complexos | Typos simples |
| local-devops-manager | Setup/config issues | Lógica de negócio |
| docs-writer | Feature completa | WIP code |
| data-insights-expert | Análise de dados | CRUD simples |
| code-simplifier | Código complexo | Código já simples |

---

## 💬 Exemplos de Conversação

### Exemplo 1: Feature Nova
```
User: "Preciso adicionar sistema de cupons de desconto"

Assistant com Agents:
"Vou ajudar você a implementar o sistema de cupons. Vou usar uma abordagem estruturada:

1. Primeiro, vou usar o feature-planner para criar um plano detalhado
2. Em seguida, o database-architect para modelar as tabelas necessárias
3. Após a implementação, usarei o test-generator
4. Finalmente, code-best-practices-reviewer e docs-writer

Iniciando com o feature-planner..."
```

### Exemplo 2: Bug Fix
```
User: "O carrinho está calculando o total errado quando tem desconto"

Assistant com Agents:
"Vou diagnosticar e corrigir esse bug no cálculo do carrinho.

Usando o bug-fixer para analisar o problema...
[Diagnóstico e correção]

Agora vou usar o test-generator para criar testes que previnam esse bug no futuro..."
```

---

## 🔧 Configuração Personalizada

Você pode personalizar os workflows baseado nas necessidades do seu projeto:

1. Ajuste a ordem dos agents
2. Adicione validações específicas
3. Configure thresholds de qualidade
4. Defina processos automáticos

---

## 📚 Recursos Adicionais

- Documentação de cada agent em `.claude/agents/`
- CLAUDE.md para guidelines do projeto
- README.md para visão geral do sistema

---

*Última atualização: 2025-08-27*
*Versão: 1.0.0*