import React from 'react';

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  image?: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ quote, author, role, company, image }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center mb-4">
      <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
        {image ? (
          <img 
            src={image} 
            alt={author} 
            className="h-12 w-12 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${author.replace(' ', '+')}&background=10B981&color=fff`;
            }}
          />
        ) : (
          <span className="text-xl font-bold">{author.charAt(0)}</span>
        )}
      </div>
      <div className="ml-4">
        <h4 className="font-semibold text-gray-900">{author}</h4>
        <p className="text-sm text-gray-600">{role}, {company}</p>
      </div>
    </div>
    <p className="text-gray-600 italic">"{quote}"</p>
  </div>
);

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Veja como o ChefIA PDV está transformando restaurantes por todo o Brasil.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Testimonial
            quote="Desde que implementamos o ChefIA PDV, reduzimos o tempo de atendimento em 30% e aumentamos nossas vendas em 25%. A integração com o iFood foi um diferencial incrível."
            author="Carlos Silva"
            role="Proprietário"
            company="Restaurante Sabor & Arte"
          />
          
          <Testimonial
            quote="O controle de estoque do ChefIA PDV eliminou completamente o desperdício no nosso restaurante. Os relatórios são claros e nos ajudam a tomar decisões melhores todos os dias."
            author="Ana Oliveira"
            role="Gerente"
            company="Cantina Bella Napoli"
          />
          
          <Testimonial
            quote="A possibilidade de operar offline salvou nosso faturamento várias vezes quando a internet caiu. O suporte é excelente e sempre responde rapidamente."
            author="Marcos Santos"
            role="Proprietário"
            company="Hamburgueria The Burger"
          />
          
          <Testimonial
            quote="O backoffice online me permite gerenciar meus três restaurantes de qualquer lugar. Os dashboards personalizados são exatamente o que eu precisava para acompanhar o desempenho."
            author="Juliana Costa"
            role="Diretora"
            company="Rede Sabor Caseiro"
          />
          
          <Testimonial
            quote="A implementação foi muito mais rápida do que esperávamos. Em apenas dois dias, toda a equipe já estava operando o sistema com facilidade."
            author="Roberto Almeida"
            role="Gerente de TI"
            company="Restaurante Fusion"
          />
          
          <Testimonial
            quote="O módulo de delivery integrado com motoboys revolucionou nossa operação. Conseguimos aumentar em 40% o número de entregas sem adicionar mais funcionários."
            author="Fernanda Lima"
            role="Gerente Operacional"
            company="Sushi Express"
          />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
