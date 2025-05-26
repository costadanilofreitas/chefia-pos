import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/menu.css';

const ItemDetailPage = ({ menu }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  
  // Find the item across all categories
  let selectedItem = null;
  let parentCategory = null;
  
  for (const category of menu.categories) {
    const item = category.items.find(item => 
      item.id === itemId || String(item.id) === itemId
    );
    
    if (item) {
      selectedItem = item;
      parentCategory = category;
      break;
    }
  }
  
  if (!selectedItem) {
    return (
      <div className="error-container">
        <h2>Item não encontrado</h2>
        <button onClick={() => navigate('/')} className="back-button">
          Voltar ao Menu
        </button>
      </div>
    );
  }
  
  const handleBackClick = () => {
    if (parentCategory) {
      navigate(`/category/${parentCategory.name}`);
    } else {
      navigate('/');
    }
  };
  
  return (
    <div className="item-detail-page">
      <Header 
        title={selectedItem.name} 
        showBackButton={true} 
        onBackClick={handleBackClick}
        logoUrl={menu.theme.logo_url}
      />
      
      <div className="item-detail-content">
        {selectedItem.image_url && (
          <div className="item-image-container">
            <img 
              src={selectedItem.image_url} 
              alt={selectedItem.name} 
              className="item-detail-image" 
            />
            
            {selectedItem.popular && (
              <div className="item-badge popular">Popular</div>
            )}
            
            {selectedItem.featured && (
              <div className="item-badge featured">Destaque</div>
            )}
          </div>
        )}
        
        <div className="item-info">
          <div className="item-header">
            <h1 className="item-name">{selectedItem.name}</h1>
            <div className="item-price">{formatCurrency(selectedItem.price)}</div>
          </div>
          
          {selectedItem.description && (
            <div className="item-description">
              <p>{selectedItem.description}</p>
            </div>
          )}
          
          {selectedItem.allergens && selectedItem.allergens.length > 0 && (
            <div className="item-allergens">
              <h3>Alérgenos</h3>
              <div className="allergen-tags">
                {selectedItem.allergens.map(allergen => (
                  <span key={allergen} className="allergen-tag">
                    {formatAllergen(allergen)}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {selectedItem.nutrition && (
            <div className="item-nutrition">
              <h3>Informações Nutricionais</h3>
              <div className="nutrition-grid">
                {selectedItem.nutrition.calories && (
                  <div className="nutrition-item">
                    <span className="nutrition-label">Calorias</span>
                    <span className="nutrition-value">{selectedItem.nutrition.calories} kcal</span>
                  </div>
                )}
                
                {selectedItem.nutrition.protein && (
                  <div className="nutrition-item">
                    <span className="nutrition-label">Proteínas</span>
                    <span className="nutrition-value">{selectedItem.nutrition.protein}g</span>
                  </div>
                )}
                
                {selectedItem.nutrition.carbs && (
                  <div className="nutrition-item">
                    <span className="nutrition-label">Carboidratos</span>
                    <span className="nutrition-value">{selectedItem.nutrition.carbs}g</span>
                  </div>
                )}
                
                {selectedItem.nutrition.fat && (
                  <div className="nutrition-item">
                    <span className="nutrition-label">Gorduras</span>
                    <span className="nutrition-value">{selectedItem.nutrition.fat}g</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {selectedItem.options && selectedItem.options.length > 0 && (
            <div className="item-options">
              <h3>Opções Adicionais</h3>
              <div className="options-list">
                {selectedItem.options.map(option => (
                  <div key={option.id} className="option-item">
                    <div className="option-info">
                      <span className="option-name">{option.name}</span>
                      {option.description && (
                        <span className="option-description">{option.description}</span>
                      )}
                    </div>
                    <span className="option-price">
                      {option.price_addition > 0 ? `+${formatCurrency(option.price_addition)}` : 'Grátis'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedItem.variants && selectedItem.variants.length > 0 && (
            <div className="item-variants">
              <h3>Variações</h3>
              <div className="variants-list">
                {selectedItem.variants.map(variant => (
                  <div key={variant.id} className="variant-item">
                    <div className="variant-info">
                      <span className="variant-name">{variant.name}</span>
                      {variant.description && (
                        <span className="variant-description">{variant.description}</span>
                      )}
                    </div>
                    <span className="variant-price">{formatCurrency(variant.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedItem.tags && selectedItem.tags.length > 0 && (
            <div className="item-tags">
              {selectedItem.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatAllergen = (allergen) => {
  const allergenMap = {
    'gluten': 'Glúten',
    'dairy': 'Laticínios',
    'nuts': 'Nozes',
    'eggs': 'Ovos',
    'soy': 'Soja',
    'fish': 'Peixe',
    'shellfish': 'Frutos do Mar',
    'wheat': 'Trigo',
    'peanuts': 'Amendoim'
  };
  
  return allergenMap[allergen] || allergen;
};

export default ItemDetailPage;
