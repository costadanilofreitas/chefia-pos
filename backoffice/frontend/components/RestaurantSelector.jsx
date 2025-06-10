import React, { useState, useEffect } from 'react';
import '../styles/RestaurantSelector.css';

const RestaurantSelector = ({ brandId, selectedRestaurant, onRestaurantChange }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset when brand changes
    if (!brandId) {
      setRestaurants([]);
      setLoading(false);
      return;
    }

    // In a real app, fetch restaurants for the selected brand from API
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        // const response = await fetch(`/api/backoffice/restaurants?brand_id=${brandId}`);
        // if (!response.ok) throw new Error('Failed to fetch restaurants');
        // const data = await response.json();
        // setRestaurants(data);
        
        // Mock data for demo
        setTimeout(() => {
          // Different restaurants based on brand
          if (brandId === '1') {
            setRestaurants([
              { id: '101', name: 'Burger Place - Centro', city: 'São Paulo' },
              { id: '102', name: 'Burger Place - Shopping', city: 'São Paulo' },
              { id: '103', name: 'Burger Place - Praia', city: 'Rio de Janeiro' }
            ]);
          } else if (brandId === '2') {
            setRestaurants([
              { id: '201', name: 'Pizza Express - Jardins', city: 'São Paulo' },
              { id: '202', name: 'Pizza Express - Ipanema', city: 'Rio de Janeiro' }
            ]);
          } else if (brandId === '3') {
            setRestaurants([
              { id: '301', name: 'Sushi House - Liberdade', city: 'São Paulo' },
              { id: '302', name: 'Sushi House - Botafogo', city: 'Rio de Janeiro' },
              { id: '303', name: 'Sushi House - Barra', city: 'Salvador' }
            ]);
          } else {
            setRestaurants([]);
          }
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        setError('Failed to load restaurants');
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [brandId]);

  if (!brandId) return null;
  if (loading) return <div className="restaurant-selector loading">Carregando restaurantes...</div>;
  if (error) return <div className="restaurant-selector error">{error}</div>;
  if (restaurants.length === 0) return <div className="restaurant-selector empty">Nenhum restaurante disponível para esta marca</div>;

  return (
    <div className="restaurant-selector">
      <label htmlFor="restaurant-select">Restaurante:</label>
      <select
        id="restaurant-select"
        value={selectedRestaurant || ''}
        onChange={(e) => onRestaurantChange(e.target.value || null)}
      >
        <option value="">Todos os restaurantes</option>
        {restaurants.map((restaurant) => (
          <option key={restaurant.id} value={restaurant.id}>
            {restaurant.name} ({restaurant.city})
          </option>
        ))}
      </select>
    </div>
  );
};

export default RestaurantSelector;
