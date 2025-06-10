import React, { useState, useEffect } from 'react';
import '../styles/BrandSelector.css';

const BrandSelector = ({ selectedBrand, onBrandChange }) => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, fetch brands from API
    const fetchBrands = async () => {
      setLoading(true);
      try {
        // const response = await fetch('/api/backoffice/brands');
        // if (!response.ok) throw new Error('Failed to fetch brands');
        // const data = await response.json();
        // setBrands(data);
        
        // Mock data for demo
        setTimeout(() => {
          setBrands([
            { id: '1', name: 'Burger Place', logo_url: null, primary_color: '#FF5722' },
            { id: '2', name: 'Pizza Express', logo_url: null, primary_color: '#4CAF50' },
            { id: '3', name: 'Sushi House', logo_url: null, primary_color: '#2196F3' }
          ]);
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error fetching brands:', err);
        setError('Failed to load brands');
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  if (loading) return <div className="brand-selector loading">Carregando marcas...</div>;
  if (error) return <div className="brand-selector error">{error}</div>;
  if (brands.length === 0) return <div className="brand-selector empty">Nenhuma marca disponível</div>;

  return (
    <div className="brand-selector">
      <label htmlFor="brand-select">Marca:</label>
      <select
        id="brand-select"
        value={selectedBrand || ''}
        onChange={(e) => onBrandChange(e.target.value || null)}
      >
        <option value="">Selecione uma marca</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BrandSelector;
