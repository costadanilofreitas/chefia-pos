# GUIA DE INVESTIGAÇÃO - PROBLEMA DO LOGIN

## 🎯 PROBLEMA IDENTIFICADO

O modal de login abre corretamente, os campos funcionam, mas o processo de login não é completado. Nenhuma requisição HTTP é enviada ao backend quando o botão "Entrar" é clicado.

## 🔍 INVESTIGAÇÃO NECESSÁRIA

### 1. **Verificar Binding do Evento**
**Arquivo:** `/frontend/apps/pos/src/ui/CashierOpeningClosingPage.tsx`
**Linha:** ~140 (função handleLogin)

**Verificar:**
- Se o botão "Entrar" está corretamente vinculado à função `handleLogin`
- Se há algum preventDefault() ou stopPropagation() interferindo
- Se a função está sendo chamada (adicionar console.log)

### 2. **Validar Função handleLogin**
**Código atual:**
```typescript
const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    setLoginError('Por favor, preencha todos os campos');
    return;
  }

  try {
    await login(loginForm.username, loginForm.password);
    // ... resto da função
  } catch (error) {
    setLoginError('Credenciais inválidas');
  }
};
```

**Verificar:**
- Se `loginForm.username` e `loginForm.password` têm valores
- Se a função `login` está sendo chamada
- Se há erros sendo capturados silenciosamente

### 3. **Testar Função login Diretamente**
**No console do navegador:**
```javascript
// Testar se a função existe
console.log(typeof window.login);

// Testar chamada direta (se disponível)
// Verificar se há algum erro
```

### 4. **Verificar Estado do Formulário**
**Adicionar logs temporários:**
```typescript
const handleLogin = async () => {
  console.log('🔍 handleLogin called');
  console.log('📝 loginForm:', loginForm);
  
  if (!loginForm.username || !loginForm.password) {
    console.log('❌ Campos vazios');
    setLoginError('Por favor, preencha todos os campos');
    return;
  }

  console.log('🚀 Tentando login...');
  try {
    await login(loginForm.username, loginForm.password);
    console.log('✅ Login sucesso');
    // ... resto
  } catch (error) {
    console.log('❌ Login erro:', error);
    setLoginError('Credenciais inválidas');
  }
};
```

## 🛠️ POSSÍVEIS CAUSAS

### **Causa 1: Evento não vinculado**
- Botão não está chamando `handleLogin`
- Verificar JSX do botão "Entrar"

### **Causa 2: Validação falhando**
- `loginForm.username` ou `loginForm.password` vazios
- Verificar estado do formulário

### **Causa 3: Função login não disponível**
- Hook `useAuth` não está funcionando
- Função `login` não está sendo importada

### **Causa 4: Erro silencioso**
- Exception sendo capturada sem log
- Problema na função `login` do useAuth

## 🔧 CORREÇÕES SUGERIDAS

### **Correção 1: Adicionar Logs Detalhados**
```typescript
const handleLogin = async () => {
  console.log('🔍 Login attempt started');
  console.log('📝 Form data:', { 
    username: loginForm.username, 
    password: loginForm.password ? '***' : 'empty' 
  });
  
  // ... resto da função com logs
};
```

### **Correção 2: Verificar JSX do Botão**
```typescript
<Button
  onClick={handleLogin}  // Verificar se está correto
  variant="contained"
  color="primary"
>
  Entrar
</Button>
```

### **Correção 3: Testar Função Diretamente**
```typescript
// Adicionar botão de teste temporário
<Button onClick={() => {
  console.log('🧪 Teste direto');
  login('gerente', 'senha123').then(console.log).catch(console.error);
}}>
  Teste Login Direto
</Button>
```

### **Correção 4: Validar useAuth**
```typescript
const { user, isAuthenticated, login, error } = useAuth();

console.log('🔍 useAuth state:', { 
  user, 
  isAuthenticated, 
  loginFunction: typeof login,
  error 
});
```

## 📋 CHECKLIST DE INVESTIGAÇÃO

- [ ] Verificar se `handleLogin` é chamada (console.log)
- [ ] Verificar valores de `loginForm.username` e `loginForm.password`
- [ ] Verificar se função `login` existe e é callable
- [ ] Verificar JSX do botão "Entrar"
- [ ] Testar chamada direta da função `login`
- [ ] Verificar estado do hook `useAuth`
- [ ] Verificar se há erros no console durante o clique
- [ ] Verificar se há interceptação de eventos

## 🎯 RESULTADO ESPERADO

Após a investigação, deve ser possível:
1. Identificar exatamente onde o fluxo está parando
2. Ver requisições HTTP sendo enviadas ao backend
3. Completar o processo de login com sucesso
4. Ver o token sendo salvo no localStorage

## 📞 PRÓXIMA AÇÃO

Implementar os logs detalhados e seguir o checklist para identificar a causa raiz do problema.

