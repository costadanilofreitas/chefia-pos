import React from 'react';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        className="flex justify-between items-center w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium text-gray-900">{question}</h3>
        <span className="ml-6 flex-shrink-0">
          {isOpen ? (
            <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
      </button>
      {isOpen && (
        <div className="mt-2 pr-12">
          <p className="text-gray-600">{answer}</p>
        </div>
      )}
    </div>
  );
};

const FAQ = () => {
  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tire suas dúvidas sobre o ChefIA PDV e descubra como podemos ajudar seu restaurante.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <FAQItem
            question="Quanto tempo leva para implementar o ChefIA PDV?"
            answer="A implementação do ChefIA PDV é rápida e simples. Na maioria dos casos, o sistema pode ser configurado e estar operacional em 1-2 dias. Nosso time de suporte acompanha todo o processo e oferece treinamento para sua equipe."
          />
          
          <FAQItem
            question="O sistema funciona sem internet?"
            answer="Sim! O ChefIA PDV foi projetado para funcionar completamente offline, garantindo que seu restaurante continue operando mesmo sem conexão com a internet. Quando a conexão for restabelecida, o sistema sincroniza automaticamente todos os dados."
          />
          
          <FAQItem
            question="Como funciona a integração com o iFood?"
            answer="A integração com o iFood é direta e automática. Os pedidos do iFood são recebidos diretamente no sistema ChefIA PDV, sem necessidade de tablets adicionais. Você pode gerenciar todos os pedidos, tanto locais quanto do iFood, em uma única interface."
          />
          
          <FAQItem
            question="Quais métodos de pagamento são aceitos?"
            answer="O ChefIA PDV suporta todos os principais métodos de pagamento, incluindo dinheiro, cartões de crédito e débito, PIX, e vouchers. O sistema também permite a integração com as principais operadoras de cartão do mercado."
          />
          
          <FAQItem
            question="O sistema emite notas fiscais?"
            answer="Sim, o ChefIA PDV possui integração completa com os principais sistemas fiscais, incluindo SAT, NFC-e, MFE e CF-e, atendendo a todas as exigências fiscais em diferentes regiões do Brasil."
          />
          
          <FAQItem
            question="Posso acessar o sistema remotamente?"
            answer="Absolutamente! O backoffice online permite que você acesse relatórios, configure produtos, preços e promoções, e gerencie seu restaurante de qualquer lugar, usando qualquer dispositivo com acesso à internet."
          />
          
          <FAQItem
            question="O ChefIA PDV oferece suporte técnico?"
            answer="Sim, oferecemos suporte técnico para todos os nossos clientes. Dependendo do plano escolhido, o suporte pode ser por email, chat ou telefone, com diferentes níveis de prioridade e disponibilidade."
          />
          
          <FAQItem
            question="É possível personalizar o sistema para as necessidades do meu restaurante?"
            answer="Com certeza! O ChefIA PDV é altamente personalizável. Você pode configurar categorias de produtos, modificadores, combos, promoções, e muito mais. Para necessidades muito específicas, nossa equipe pode desenvolver funcionalidades sob medida."
          />
        </div>
      </div>
    </section>
  );
};

export default FAQ;
