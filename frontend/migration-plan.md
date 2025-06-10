# Plano de Migração do Frontend - POS Modern

## Visão Geral
Este documento detalha o plano de migração dos módulos frontend existentes para a nova estrutura de monorepo híbrido com npm workspaces.

## Progresso da Configuração
- [x] Criar estrutura de diretórios para o monorepo frontend
- [x] Configurar package.json principal com npm workspaces
- [x] Configurar tsconfig.json principal
- [x] Configurar workspace da biblioteca comum (common)
- [x] Configurar workspaces para os apps aplicáveis (pos, kds, kiosk, waiter, mobile_waiter)
- [x] Configurar diretório para testes e2e

## Próximos Passos: Migração dos Módulos

### Prioridades de Migração
1. Tipos compartilhados (common.ts e outros arquivos de tipos)
2. Componentes e utilitários compartilhados
3. Módulos específicos de cada aplicação

### Tarefas de Migração
- [x] Migrar componentes compartilhados para frontend/common/src/components
  - [x] ProductCard
  - [x] TableLayoutEditor
- [x] Migrar utilitários compartilhados para frontend/common/src/utils
  - [x] formatters.js
- [x] Migrar contextos compartilhados para frontend/common/src/contexts
  - [x] supplier
  - [ ] logging
  - [ ] payment
  - [ ] stock
- [ ] Migrar tipos compartilhados para frontend/common/src/types
- [ ] Migrar hooks compartilhados para frontend/common/src/hooks
- [ ] Migrar serviços compartilhados para frontend/common/src/services
- [ ] Migrar estilos compartilhados para frontend/common/src/styles

### Migração por Módulo (Apenas Frontend)
- [x] Migrar módulo POS (frontend) para frontend/apps/pos
- [x] Migrar módulo KDS (frontend) para frontend/apps/kds
- [x] Migrar módulo Kiosk (frontend) para frontend/apps/kiosk
- [x] Migrar módulo Waiter (frontend) para frontend/apps/waiter
- [x] Migrar módulo Mobile Waiter (frontend) para frontend/apps/mobile_waiter

### Módulos Excluídos da Migração
- Backoffice: Permanecerá na pasta original devido à sua natureza standalone e scripts de implantação integrados
- Menu: Permanecerá na pasta original devido à sua natureza standalone e scripts de implantação integrados

### Atualização de Importações
- [x] Atualizar importações para usar o padrão @/ em vez de caminhos relativos
- [x] Atualizar importações de componentes compartilhados para usar @common/

## Validação
- [x] Verificar se o módulo POS foi migrado corretamente (apenas frontend)
- [x] Verificar se o módulo KDS foi migrado corretamente (apenas frontend)
- [x] Verificar se o módulo Kiosk foi migrado corretamente (apenas frontend)
- [x] Verificar se o módulo Waiter foi migrado corretamente (apenas frontend)
- [x] Verificar se o módulo Mobile Waiter foi migrado corretamente (apenas frontend)
- [x] Verificar se os contextos compartilhados foram migrados corretamente para common
- [ ] Testar a compilação de cada módulo
- [ ] Verificar a integração com o backend original
- [ ] Validar a estrutura final do monorepo

## Documentação
- [ ] Atualizar README.md com instruções para o novo monorepo
- [ ] Documentar padrões de importação e boas práticas
- [ ] Documentar processo de build e deploy
- [ ] Documentar integração entre frontend e backend
- [ ] Documentar quais módulos foram migrados e quais permaneceram nas pastas originais
