import React from 'react';

const Hero = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
        {/* Hero Content */}
        <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Revolucione seu restaurante com o <span className="text-emerald-600">ChefIA PDV</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema completo de ponto de venda com inteligência artificial para restaurantes.
            Aumente suas vendas, reduza custos e melhore a experiência dos seus clientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href="#contact" 
              className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-center"
            >
              Experimente Grátis
            </a>
            <a 
              href="#demo" 
              className="px-6 py-3 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors text-center"
            >
              Ver Demonstração
            </a>
          </div>
        </div>
        
        {/* Hero Image */}
        <div className="md:w-1/2">
          <div className="bg-white p-4 rounded-lg shadow-xl">
            <img 
              src="/hero-image.png" 
              alt="ChefIA PDV em ação" 
              className="w-full h-auto rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://via.placeholder.com/600x400?text=ChefIA+PDV";
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
