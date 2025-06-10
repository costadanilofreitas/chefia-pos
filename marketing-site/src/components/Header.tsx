import React, { useState, useEffect } from 'react';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll event to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-sm transition-all duration-300 ${
      isScrolled ? 'bg-white/95 shadow-sm' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-emerald-600">ChefIA PDV</div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8">
          <a href="#features" className="text-gray-700 hover:text-emerald-600 transition-colors">Recursos</a>
          <a href="#pricing" className="text-gray-700 hover:text-emerald-600 transition-colors">Preços</a>
          <a href="#testimonials" className="text-gray-700 hover:text-emerald-600 transition-colors">Depoimentos</a>
          <a href="#faq" className="text-gray-700 hover:text-emerald-600 transition-colors">FAQ</a>
        </nav>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        
        {/* CTA Button */}
        <div className="hidden md:block">
          <a 
            href="#contact" 
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Experimente Grátis
          </a>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 animate-fadeIn">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col space-y-3">
              <a 
                href="#features" 
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Recursos
              </a>
              <a 
                href="#pricing" 
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Preços
              </a>
              <a 
                href="#testimonials" 
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Depoimentos
              </a>
              <a 
                href="#faq" 
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                FAQ
              </a>
              <a 
                href="#contact" 
                className="bg-emerald-600 text-white rounded-md py-2 px-4 text-center hover:bg-emerald-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Experimente Grátis
              </a>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
