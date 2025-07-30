# Chefia POS - Marketing Website

Website oficial do sistema Chefia POS, um sistema completo de ponto de venda para restaurantes.

## 🌐 Website Ao Vivo

**URL:** https://bhwjgxnj.manus.space

## 🚀 Funcionalidades

- **Design Moderno:** Interface profissional com gradientes e animações
- **Responsivo:** Funciona perfeitamente em desktop, tablet e mobile
- **Interativo:** Carrossel de features automático e testimonials rotativos
- **Assets Personalizados:** Imagens e logos gerados especificamente para o projeto
- **Performance Otimizada:** Build otimizado com Vite e compressão gzip
- **SEO Friendly:** Meta tags e estrutura otimizada para buscadores

## 🛠️ Tecnologias

- **React 18** - Biblioteca UI moderna
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn/UI** - Componentes de interface
- **Lucide Icons** - Ícones modernos
- **Vite** - Build tool rápido

## 📦 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Comandos

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

### ⚠️ Nota sobre Dependências

Se você encontrar erros de conflito de dependências (ERESOLVE), as versões foram ajustadas para compatibilidade:
- `date-fns`: versão 3.6.0 (compatível com react-day-picker)
- `react-day-picker`: versão 9.4.3 (mais recente compatível)

## 📁 Estrutura do Projeto

```
marketing-site/
├── src/
│   ├── assets/          # Imagens e recursos
│   ├── components/      # Componentes React
│   ├── App.jsx         # Componente principal
│   └── main.jsx        # Ponto de entrada
├── public/             # Arquivos públicos
├── index.html          # Template HTML
└── package.json        # Dependências
```

## 🎨 Seções do Website

1. **Hero Section** - Apresentação principal com CTAs
2. **Features** - Funcionalidades principais do sistema
3. **Demo** - Mockups e demonstrações visuais
4. **Modules** - Módulos integrados do sistema
5. **Technology** - Stack tecnológico utilizado
6. **Testimonials** - Depoimentos de clientes
7. **CTA Final** - Chamada para ação
8. **Footer** - Links e informações

## 🔗 Links Importantes

- **GitHub:** https://github.com/costadanilofreitas/chefia-pos
- **Website:** https://bhwjgxnj.manus.space
- **Documentação:** Ver pasta `docs/` no repositório principal

## 🐛 Solução de Problemas

### Erro ERESOLVE
Se você encontrar erros de dependências, execute:
```bash
npm install --legacy-peer-deps
```

Ou use as versões específicas já configuradas no package.json.

## 📝 Licença

Este projeto é parte do sistema Chefia POS e segue a mesma licença do projeto principal.

