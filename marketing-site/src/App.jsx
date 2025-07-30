import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  Users, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Wifi, 
  WifiOff, 
  Shield, 
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  Github,
  Play,
  Download,
  Menu,
  X,
  ExternalLink
} from 'lucide-react'
import './App.css'

// Import das imagens geradas
import chefiaLogo from './assets/chefia-pos-logo.png'
import posDashboard from './assets/pos-dashboard-mockup.png'
import restaurantHero from './assets/restaurant-hero.png'
import featuresIllustration from './assets/features-illustration.png'
import mobilePOS from './assets/mobile-pos.png'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const features = [
    {
      icon: ShoppingCart,
      title: "Gestão de Pedidos",
      description: "Sistema completo para criação, acompanhamento e finalização de pedidos com interface intuitiva.",
      details: "Controle total do fluxo de pedidos desde a criação até a entrega, com status em tempo real e notificações automáticas."
    },
    {
      icon: CreditCard,
      title: "Controle de Caixa",
      description: "Abertura, fechamento e gestão completa do caixa com relatórios detalhados de vendas.",
      details: "Gestão financeira completa com controle de sangria, suprimento e fechamento automático de caixa."
    },
    {
      icon: BarChart3,
      title: "Relatórios Avançados",
      description: "Dashboards e relatórios em tempo real para acompanhar o desempenho do seu negócio.",
      details: "Analytics avançados com métricas de vendas, produtos mais vendidos, horários de pico e muito mais."
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "Cadastro de clientes, programa de fidelidade e histórico de compras.",
      details: "CRM integrado com programa de pontos, cupons de desconto e campanhas de marketing personalizadas."
    }
  ]

  const devices = [
    { icon: Monitor, name: "Desktop" },
    { icon: Tablet, name: "Tablet" },
    { icon: Smartphone, name: "Mobile" }
  ]

  const benefits = [
    "Interface moderna e intuitiva",
    "Funcionamento offline completo",
    "Integração com delivery",
    "Suporte a múltiplos dispositivos",
    "Relatórios em tempo real",
    "Sistema de fidelidade",
    "Gestão de estoque",
    "Impressão de cupons"
  ]

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Proprietária - Restaurante Sabor & Arte",
      content: "O Chefia POS revolucionou nosso restaurante. A interface é intuitiva e os relatórios nos ajudam a tomar decisões estratégicas.",
      rating: 5
    },
    {
      name: "João Santos",
      role: "Gerente - Pizzaria Bella Vista",
      content: "Desde que implementamos o sistema, nossa eficiência aumentou 40%. O controle de pedidos é fantástico!",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Chef - Bistrô Gourmet",
      content: "A integração com a cozinha através do KDS melhorou muito nosso tempo de preparo. Recomendo!",
      rating: 5
    }
  ]

  const modules = [
    {
      name: "POS Terminal",
      description: "Interface principal para vendas",
      features: ["Gestão de pedidos", "Pagamentos", "Impressão de cupons"]
    },
    {
      name: "Kitchen Display",
      description: "Sistema para cozinha",
      features: ["Pedidos em tempo real", "Controle de preparo", "Otimização de tempo"]
    },
    {
      name: "Backoffice",
      description: "Gestão administrativa",
      features: ["Relatórios", "Configurações", "Usuários"]
    },
    {
      name: "Mobile App",
      description: "App para garçons",
      features: ["Pedidos móveis", "Gestão de mesas", "Sincronização"]
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={chefiaLogo} alt="Chefia POS" className="w-10 h-10" />
              <span className="text-xl font-bold text-slate-800">Chefia POS</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-blue-600 transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('demo')} className="text-slate-600 hover:text-blue-600 transition-colors">
                Demo
              </button>
              <button onClick={() => scrollToSection('modules')} className="text-slate-600 hover:text-blue-600 transition-colors">
                Módulos
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="text-slate-600 hover:text-blue-600 transition-colors">
                Depoimentos
              </button>
            </nav>

            <div className="hidden md:flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/costadanilofreitas/chefia-pos', '_blank')}>
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
              <Button size="sm" onClick={() => scrollToSection('demo')}>
                Ver Demo
              </Button>
            </div>

            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-200 pt-4">
              <nav className="flex flex-col space-y-4">
                <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-blue-600 transition-colors text-left">
                  Funcionalidades
                </button>
                <button onClick={() => scrollToSection('demo')} className="text-slate-600 hover:text-blue-600 transition-colors text-left">
                  Demo
                </button>
                <button onClick={() => scrollToSection('modules')} className="text-slate-600 hover:text-blue-600 transition-colors text-left">
                  Módulos
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="text-slate-600 hover:text-blue-600 transition-colors text-left">
                  Depoimentos
                </button>
                <div className="flex flex-col space-y-2 pt-4">
                  <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/costadanilofreitas/chefia-pos', '_blank')}>
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </Button>
                  <Button size="sm" onClick={() => scrollToSection('demo')}>
                    Ver Demo
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200">
                🚀 Sistema POS Moderno
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">
                Revolucione seu
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Restaurante</span>
              </h1>
              
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Sistema de Ponto de Venda completo e moderno para restaurantes. 
                Gestão de pedidos, controle de caixa, relatórios avançados e muito mais.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={() => scrollToSection('demo')}>
                  <Play className="w-5 h-5 mr-2" />
                  Ver Demo
                </Button>
                <Button size="lg" variant="outline" onClick={() => window.open('https://github.com/costadanilofreitas/chefia-pos', '_blank')}>
                  <Download className="w-5 h-5 mr-2" />
                  Download Grátis
                </Button>
              </div>

              {/* Device Compatibility */}
              <div className="flex justify-center lg:justify-start items-center space-x-8 text-slate-500">
                <span className="text-sm font-medium">Compatível com:</span>
                {devices.map((device, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <device.icon className="w-5 h-5" />
                    <span className="text-sm">{device.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <img 
                src={restaurantHero} 
                alt="Restaurante moderno com sistema POS" 
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 max-w-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Sistema Ativo</p>
                    <p className="text-sm text-slate-600">Funcionando 24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Funcionalidades Poderosas
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar seu restaurante de forma eficiente
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <img 
                src={featuresIllustration} 
                alt="Ilustração das funcionalidades do sistema" 
                className="w-full rounded-xl"
              />
            </div>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${
                    activeFeature === index ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50' : ''
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {activeFeature === index && (
                    <CardContent className="pt-0">
                      <p className="text-slate-600">{feature.details}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-4 bg-gradient-to-r from-slate-100 to-blue-100">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Veja o Sistema em Ação
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Interface moderna e intuitiva projetada para máxima eficiência
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={posDashboard} 
                alt="Dashboard do sistema POS" 
                className="rounded-2xl shadow-2xl w-full"
              />
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Interface Desktop</h3>
                <p className="text-slate-600 mb-4">
                  Dashboard completo com gestão de pedidos, produtos, pagamentos e relatórios em tempo real.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700">Gestão visual de pedidos</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700">Múltiplas formas de pagamento</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700">Analytics em tempo real</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">App Mobile</h3>
                <div className="flex items-center space-x-4">
                  <img 
                    src={mobilePOS} 
                    alt="App mobile do POS" 
                    className="w-24 h-auto rounded-lg shadow-md"
                  />
                  <div>
                    <p className="text-slate-600 mb-2">
                      App nativo para garçons e gestores com todas as funcionalidades.
                    </p>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver Demo Mobile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Módulos Integrados
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Sistema modular que cresce com seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {modules.map((module, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {module.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 px-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tecnologia de Ponta
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Construído com as melhores tecnologias para garantir performance e confiabilidade
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/10 border-white/20 text-white hover:bg-white/15 transition-colors">
              <CardHeader>
                <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <CardTitle>React + FastAPI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-100">Frontend moderno em React com backend robusto em Python</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white hover:bg-white/15 transition-colors">
              <CardHeader>
                <WifiOff className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <CardTitle>Funcionamento Offline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-100">Continue operando mesmo sem conexão com a internet</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white hover:bg-white/15 transition-colors">
              <CardHeader>
                <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <CardTitle>Segurança Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-100">Autenticação JWT e criptografia de dados</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Depoimentos reais de restaurantes que transformaram seus negócios
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-none shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-xl text-slate-700 mb-6 italic">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                <div>
                  <p className="font-semibold text-slate-800">{testimonials[currentTestimonial].name}</p>
                  <p className="text-slate-600">{testimonials[currentTestimonial].role}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  onClick={() => setCurrentTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para Começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Transforme seu restaurante hoje mesmo com o Chefia POS
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50" onClick={() => window.open('https://github.com/costadanilofreitas/chefia-pos', '_blank')}>
              <Github className="w-5 h-5 mr-2" />
              Ver no GitHub
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600" onClick={() => scrollToSection('demo')}>
              <Play className="w-5 h-5 mr-2" />
              Testar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src={chefiaLogo} alt="Chefia POS" className="w-8 h-8" />
                <span className="text-xl font-bold">Chefia POS</span>
              </div>
              <p className="text-slate-400">
                Sistema POS moderno para restaurantes do futuro.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('modules')} className="hover:text-white transition-colors">Módulos</button></li>
                <li><button onClick={() => scrollToSection('demo')} className="hover:text-white transition-colors">Demo</button></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Recursos</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="https://github.com/costadanilofreitas/chefia-pos" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="https://github.com/costadanilofreitas/chefia-pos" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">API</a></li>
                <li><a href="https://github.com/costadanilofreitas/chefia-pos/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Suporte</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="https://github.com/costadanilofreitas/chefia-pos" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="https://github.com/costadanilofreitas/chefia-pos/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="https://github.com/costadanilofreitas/chefia-pos" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 Chefia POS. Sistema POS moderno e completo para restaurantes.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

