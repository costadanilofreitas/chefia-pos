import React, { useState, useEffect } from 'react';
import ProductCard from '@common/components/ProductCard';
import { Container, Grid, Typography, Box, Tabs, Tab, TextField, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

/**
 * Página principal do Kiosk para clientes fazerem pedidos
 * @returns {JSX.Element} Componente da página principal do Kiosk
 */
const KioskMainPage = () => {
  // Estados
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Efeito para carregar categorias e produtos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Em um ambiente real, faríamos chamadas à API
        // Por enquanto, simulamos dados
        
        // Simular categorias
        const categoriesData = [
          { id: 1, name: 'Todos' },
          { id: 2, name: 'Lanches' },
          { id: 3, name: 'Bebidas' },
          { id: 4, name: 'Sobremesas' },
          { id: 5, name: 'Combos' }
        ];
        
        // Simular produtos
        const productsData = [
          {
            id: 1,
            name: 'Hambúrguer Clássico',
            description: 'Pão, hambúrguer, queijo, alface, tomate e molho especial',
            price: 25.90,
            image: '/images/burger.jpg',
            category_id: 2
          },
          {
            id: 2,
            name: 'Refrigerante Cola',
            description: 'Lata 350ml',
            price: 6.50,
            image: '/images/cola.jpg',
            category_id: 3
          },
          {
            id: 3,
            name: 'Milk Shake Chocolate',
            description: 'Milk shake cremoso de chocolate com calda e chantilly',
            price: 15.90,
            image: '/images/milkshake.jpg',
            category_id: 4
          },
          {
            id: 4,
            name: 'Combo Família',
            description: '4 hambúrgueres, 4 batatas e 4 refrigerantes',
            price: 89.90,
            image: '/images/combo.jpg',
            category_id: 5
          }
        ];
        
        setCategories(categoriesData);
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filtrar produtos por categoria
  useEffect(() => {
    if (activeCategory === 0) {
      setFilteredProducts(products);
    } else {
      const categoryId = categories[activeCategory]?.id;
      setFilteredProducts(
        products.filter(product => 
          categoryId === 1 || product.category_id === categoryId
        )
      );
    }
  }, [activeCategory, products, categories]);

  // Filtrar produtos por termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      // Se não houver termo de busca, aplicar apenas o filtro de categoria
      if (activeCategory === 0) {
        setFilteredProducts(products);
      } else {
        const categoryId = categories[activeCategory]?.id;
        setFilteredProducts(
          products.filter(product => 
            categoryId === 1 || product.category_id === categoryId
          )
        );
      }
    } else {
      // Se houver termo de busca, aplicar filtro de busca e categoria
      const searchResults = products.filter(product => 
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         product.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (activeCategory === 0 || categories[activeCategory]?.id === 1 || 
         product.category_id === categories[activeCategory]?.id)
      );
      setFilteredProducts(searchResults);
    }
  }, [searchTerm, activeCategory, products, categories]);

  // Manipular mudança de categoria
  const handleCategoryChange = (event, newValue) => {
    setActiveCategory(newValue);
  };

  // Manipular mudança no campo de busca
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Adicionar produto ao carrinho
  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Se o produto já estiver no carrinho, aumentar a quantidade
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      // Se o produto não estiver no carrinho, adicioná-lo com quantidade 1
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Calcular total do carrinho
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography>Carregando...</Typography>
    </Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Faça seu Pedido
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<ShoppingCartIcon />}
            sx={{ ml: 2 }}
          >
            Carrinho ({cart.length})
          </Button>
        </Box>
      </Box>
      
      {/* Barra de busca */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1 }} />,
          }}
        />
      </Box>
      
      {/* Tabs de categorias */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs 
          value={activeCategory} 
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((category, index) => (
            <Tab key={category.id} label={category.name} />
          ))}
        </Tabs>
      </Box>
      
      {/* Lista de produtos */}
      <Grid container spacing={3}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <ProductCard 
                product={product} 
                onAddToCart={() => handleAddToCart(product)} 
              />
            </Grid>
          ))
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
            <Typography variant="h6">
              Nenhum produto encontrado
            </Typography>
          </Box>
        )}
      </Grid>
      
      {/* Resumo do carrinho (fixo na parte inferior) */}
      {cart.length > 0 && (
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            bgcolor: 'background.paper',
            boxShadow: 3,
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <Typography variant="h6">
            Total: R$ {cartTotal.toFixed(2)}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
          >
            Finalizar Pedido
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default KioskMainPage;
