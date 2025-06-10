import React, { useState, useEffect } from 'react';
import ProductCard from '@common/components/ProductCard';
import { Container, Grid, Typography, Box, Tabs, Tab, TextField, Button, CircularProgress, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { productService, Category, Product } from '../services/productService';

interface CartItem extends Product {
  quantity: number;
}

/**
 * Página principal do Kiosk para clientes fazerem pedidos
 * @returns {JSX.Element} Componente da página principal do Kiosk
 */
const KioskMainPage: React.FC = () => {
  // Estados
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Efeito para carregar categorias e produtos
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        // Carregar categorias da API
        const categoriesData = await productService.getCategories();
        
        // Adicionar categoria "Todos" no início
        const allCategories = [
          { id: 0, name: 'Todos' },
          ...categoriesData
        ];
        
        // Carregar produtos da API
        const productsData = await productService.getProducts();
        
        setCategories(allCategories);
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Falha ao carregar produtos. Por favor, tente novamente.');
        
        // Usar dados de fallback em caso de erro
        const fallbackCategories: Category[] = [
          { id: 0, name: 'Todos' },
          { id: 1, name: 'Lanches' },
          { id: 2, name: 'Bebidas' },
          { id: 3, name: 'Sobremesas' },
          { id: 4, name: 'Combos' }
        ];
        
        const fallbackProducts: Product[] = [
          {
            id: 1,
            name: 'Hambúrguer Clássico',
            description: 'Pão, hambúrguer, queijo, alface, tomate e molho especial',
            price: 25.90,
            image_url: '/images/burger.jpg',
            category_id: 1
          },
          {
            id: 2,
            name: 'Refrigerante Cola',
            description: 'Lata 350ml',
            price: 6.50,
            image_url: '/images/cola.jpg',
            category_id: 2
          }
        ];
        
        setCategories(fallbackCategories);
        setProducts(fallbackProducts);
        setFilteredProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filtrar produtos por categoria
  useEffect(() => {
    const filterProductsByCategory = async (): Promise<void> => {
      if (activeCategory === 0) {
        setFilteredProducts(products);
      } else {
        try {
          const categoryId = categories[activeCategory]?.id;
          if (categoryId !== undefined && categoryId !== 0) {
            // Buscar produtos por categoria da API
            const categoryProducts = await productService.getProductsByCategory(categoryId);
            setFilteredProducts(categoryProducts);
          } else {
            setFilteredProducts(products);
          }
        } catch (error) {
          console.error('Erro ao filtrar produtos por categoria:', error);
          // Fallback para filtro local em caso de erro na API
          const categoryId = categories[activeCategory]?.id;
          setFilteredProducts(
            products.filter(product => 
              categoryId === 0 || product.category_id === categoryId
            )
          );
        }
      }
    };
    
    if (categories.length > 0 && products.length > 0) {
      filterProductsByCategory();
    }
  }, [activeCategory, products, categories]);

  // Filtrar produtos por termo de busca
  useEffect(() => {
    const searchProducts = async (): Promise<void> => {
      if (searchTerm.trim() === '') {
        // Se não houver termo de busca, aplicar apenas o filtro de categoria
        if (activeCategory === 0) {
          setFilteredProducts(products);
        } else {
          const categoryId = categories[activeCategory]?.id;
          if (categoryId !== undefined && categoryId !== 0) {
            try {
              const categoryProducts = await productService.getProductsByCategory(categoryId);
              setFilteredProducts(categoryProducts);
            } catch (error) {
              console.error('Erro ao filtrar produtos por categoria:', error);
              // Fallback para filtro local
              setFilteredProducts(
                products.filter(product => product.category_id === categoryId)
              );
            }
          }
        }
      } else {
        // Se houver termo de busca, buscar na API
        try {
          const searchResults = await productService.searchProducts(searchTerm);
          
          // Filtrar por categoria se necessário
          if (activeCategory !== 0) {
            const categoryId = categories[activeCategory]?.id;
            setFilteredProducts(
              searchResults.filter(product => product.category_id === categoryId)
            );
          } else {
            setFilteredProducts(searchResults);
          }
        } catch (error) {
          console.error('Erro ao buscar produtos:', error);
          // Fallback para busca local
          const searchResults = products.filter(product => 
            (product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             product.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (activeCategory === 0 || categories[activeCategory]?.id === 0 || 
             product.category_id === categories[activeCategory]?.id)
          );
          setFilteredProducts(searchResults);
        }
      }
    };
    
    // Debounce para evitar muitas chamadas à API
    const debounceTimer = setTimeout(() => {
      if (categories.length > 0 && products.length > 0) {
        searchProducts();
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, activeCategory, products, categories]);

  // Manipular mudança de categoria
  const handleCategoryChange = (event: React.SyntheticEvent, newValue: number): void => {
    setActiveCategory(newValue);
  };

  // Manipular mudança no campo de busca
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };

  // Adicionar produto ao carrinho
  const handleAddToCart = (product: Product): void => {
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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando produtos...</Typography>
      </Box>
    );
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
      
      {/* Mensagem de erro */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
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
          {categories.map((category) => (
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
