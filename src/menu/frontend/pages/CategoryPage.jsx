import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import '../styles/menu.css';

const CategoryPage = ({ menu }) => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  // Find the selected category
  const category = menu.categories.find(cat => 
    cat.name === categoryId || cat.name.toLowerCase() === categoryId.toLowerCase()
  );
  
  if (!category) {
    return (
      <div className="error-container">
        <h2>Categoria não encontrada</h2>
        <button onClick={() => navigate('/')} className="back-button">
          Voltar ao Menu
        </button>
      </div>
    );
  }
  
  return (
    <div className="category-page">
      <Header 
        title={category.name} 
        showBackButton={true} 
        onBackClick={() => navigate('/')}
        logoUrl={menu.theme.logo_url}
      />
      
      {category.description && (
        <div className="category-description">
          <p>{category.description}</p>
        </div>
      )}
      
      <div className="items-grid">
        {category.items.map(item => (
          <MenuItemCard 
            key={item.id}
            item={item}
            onClick={() => navigate(`/item/${item.id}`)}
          />
        ))}
        
        {category.items.length === 0 && (
          <div className="empty-category">
            <p>Nenhum item disponível nesta categoria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
