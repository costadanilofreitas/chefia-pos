import React from 'react';

interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const PricingPlan: React.FC<PricingPlanProps> = ({ name, price, description, features, isPopular }) => (
  <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${isPopular ? 'ring-2 ring-emerald-500 transform scale-105' : ''}`}>
    {isPopular && (
      <div className="bg-emerald-500 text-white text-center py-2 font-medium">
        Mais Popular
      </div>
    )}
    <div className="p-6">
      <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
      <div className="mt-4 flex items-baseline">
        <span className="text-4xl font-extrabold text-gray-900">R${price}</span>
        <span className="ml-1 text-xl font-medium text-gray-500">/mês</span>
      </div>
      <p className="mt-4 text-gray-600">{description}</p>
      
      <ul className="mt-6 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="ml-3 text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
      
      <div className="mt-8">
        <a
          href="#contact"
          className={`block w-full px-4 py-3 text-center rounded-md font-medium ${
            isPopular
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          } transition-colors`}
        >
          Começar Agora
        </a>
      </div>
    </div>
  </div>
);

const Pricing = () => {
  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Planos Flexíveis para Qualquer Tamanho de Negócio
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Escolha o plano ideal para o seu restaurante e comece a transformar sua operação hoje mesmo.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingPlan
            name="Básico"
            price="199"
            description="Ideal para pequenos estabelecimentos que estão começando."
            features={[
              "1 Terminal PDV",
              "1 Impressora",
              "Controle de Estoque Básico",
              "Relatórios Essenciais",
              "Suporte por Email"
            ]}
          />
          
          <PricingPlan
            name="Profissional"
            price="399"
            description="Perfeito para restaurantes em crescimento que precisam de mais recursos."
            features={[
              "3 Terminais PDV",
              "2 Impressoras",
              "Controle de Estoque Avançado",
              "Relatórios Detalhados",
              "Integração com iFood",
              "Backoffice Online",
              "Suporte Prioritário"
            ]}
            isPopular
          />
          
          <PricingPlan
            name="Empresarial"
            price="799"
            description="Solução completa para redes de restaurantes e operações maiores."
            features={[
              "Terminais PDV Ilimitados",
              "Impressoras Ilimitadas",
              "Controle de Estoque Avançado",
              "Relatórios Personalizados",
              "Todas as Integrações",
              "Backoffice Online",
              "API para Integrações",
              "Suporte 24/7"
            ]}
          />
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Precisa de um plano personalizado para sua operação?
          </p>
          <a 
            href="#contact" 
            className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
          >
            Entre em contato para uma proposta sob medida →
          </a>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
