import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Card, CardMedia, CardContent, CardActions, Button, Chip, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { formatCurrency } from '@common/utils/formatters';

/**
 * Aplicativo de Menu Digital para clientes
 * @returns {JSX.Element} Componente principal do Menu Digital
 */
const MenuApp = () => {
  // Estados
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'Restaurante Demo',
    logo: '/logo.png',
    description: 'O melhor restaurante da cidade'
  });

  // Efeito para carregar categorias e produtos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Em um ambiente real, faríamos chamadas à API
        // Por enquanto, simulamos dados
        
        // Simular categorias
        const categoriesData = [
          { id: 1, name: 'Entradas' },
          { id: 2, name: 'Pratos Principais' },
          { id: 3, name: 'Bebidas' },
          { id: 4, name: 'Sobremesas' }
        ];
        
        // Simular produtos
        const productsData = [
          {
            id: 1,
            name: 'Salada Caesar',
            description: 'Alface romana, croutons, parmesão e molho caesar',
            price: 19.90,
            image: '/images/salad.jpg',
            category_id: 1
          },
          {
            id: 2,
            name: 'Filé Mignon',
            description: 'Filé mignon grelhado com molho de vinho tinto, acompanha batatas e legumes',
            price: 59.90,
            image: '/images/steak.jpg',
            category_id: 2
          },
          {
            id: 3,
            name: 'Vinho Tinto',
            description: 'Taça de vinho tinto seco',
            price: 25.00,
            image: '/images/wine.jpg',
            category_id: 3
          },
          {
            id: 4,
            name: 'Cheesecake',
            description: 'Cheesecake de frutas vermelhas',
            price: 18.90,
            image: '/images/cheesecake.jpg',
            category_id: 4
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

  // Filtrar produtos por termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const searchResults = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(searchResults);
    }
  }, [searchTerm, products]);

  // Manipular mudança no campo de busca
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Filtrar produtos por categoria
  const filterByCategory = (categoryId) => {
    if (!categoryId) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.category_id === categoryId));
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography>Carregando...</Typography>
    </Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {restaurantInfo.name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {restaurantInfo.description}
        </Typography>
      </Box>
      
      {/* Barra de busca */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar no cardápio..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
      </Box>
      
      {/* Categorias */}
      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button 
          variant="outlined" 
          onClick={() => filterByCategory(null)}
          startIcon={<RestaurantMenuIcon />}
        >
          Todos
        </Button>
        {categories.map(category => (
          <Button 
            key={category.id} 
            variant="outlined"
            onClick={() => filterByCategory(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </Box>
      
      {/* Lista de produtos */}
      <Grid container spacing={3}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="div"
                  sx={{ height: 200, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  image={product.image || 'https://via.placeholder.com/300x200?text=Sem+Imagem'}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {product.description}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(product.price)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Chip 
                    label={categories.find(c => c.id === product.category_id)?.name || 'Sem categoria'} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </CardActions>
              </Card>
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
      
      {/* Rodapé */}
      <Box sx={{ mt: 8, pt: 3, borderTop: '1px solid #eaeaea', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} {restaurantInfo.name}. Todos os direitos reservados.
        </Typography>
      </Box>
    </Container>
  );
};

export default MenuApp;
