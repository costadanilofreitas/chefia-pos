import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Button from '../common/Button';
import Select from '../common/Select';
import Card from '../common/Card';

/**
 * RestaurantSelector component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Array} props.restaurants - List of available restaurants
 * @param {Function} props.onSelect - Selection handler
 * @param {string} [props.className] - Additional CSS class names
 */
const RestaurantSelector = ({
  restaurants = [],
  onSelect,
  className = '',
  ...rest
}) => {
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle restaurant selection
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate selection
    if (!selectedRestaurant) {
      setError('Por favor, selecione um restaurante.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find the selected restaurant object
      const restaurant = restaurants.find(r => r.id === selectedRestaurant);
      
      // Call selection handler
      onSelect(restaurant);
    } catch (err) {
      setError('Falha ao selecionar o restaurante. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  };

  const titleStyles = {
    fontSize: tokens.typography.h4.fontSize,
    fontWeight: tokens.typography.h4.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.md,
    textAlign: 'center',
  };

  const formStyles = {
    width: '100%',
    maxWidth: '500px',
  };

  const errorStyles = {
    color: tokens.colors.semantic.error,
    fontSize: tokens.typography.fontSize.sm,
    marginBottom: tokens.spacing.md,
    textAlign: 'center',
  };

  // Create class names
  const containerClass = `pos-restaurant-selector ${className}`;
  const formClass = 'pos-restaurant-selector-form';

  // Transform restaurants array to options format for Select component
  const restaurantOptions = restaurants.map(restaurant => ({
    value: restaurant.id,
    label: restaurant.name
  }));

  return (
    <div className={containerClass} style={containerStyles} {...rest}>
      <div style={titleStyles}>
        Selecione o Restaurante
      </div>
      
      <Card>
        <form className={formClass} style={formStyles} onSubmit={handleSubmit}>
          {error && <div style={errorStyles}>{error}</div>}
          
          <Select
            label="Restaurante"
            options={restaurantOptions}
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            placeholder="Selecione um restaurante"
            required
            fullWidth
            disabled={loading}
          />
          
          <div style={{ marginTop: tokens.spacing.lg }}>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading || restaurants.length === 0}
            >
              Continuar
            </Button>
          </div>
          
          {restaurants.length === 0 && (
            <div style={{ marginTop: tokens.spacing.md, textAlign: 'center', color: tokens.colors.text.secondary }}>
              Nenhum restaurante disponível para sua conta.
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};

export default RestaurantSelector;
