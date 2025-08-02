import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material';
import { useProduct } from '../hooks/useProduct';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  available: boolean;
  image?: string;
}

const POSMainPageSimplified: React.FC = () => {
  console.log('🚀 POSMainPageSimplified: Componente iniciado');
  
  const { terminalId } = useParams<{ terminalId: string }>();
  
  // Usando o hook useProduct real para carregar dados do backend
  const {
    products: backendProducts,
    categories: backendCategories,
    loading: productsLoading,
    error: productsError,
    loadProducts,
    loadCategories
  } = useProduct();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    console.log('🔄 POSMainPageSimplified: Carregando produtos do backend...');
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  console.log('📊 POSMainPageSimplified: Estado atual:', {
    productsCount: backendProducts?.length || 0,
    categoriesCount: backendCategories?.length || 0,
    loading: productsLoading,
    error: productsError
  });

  // Produtos filtrados (usar dados reais do backend)
  const products = backendProducts || [];
  const categories = backendCategories || [];
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <RestaurantIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            POS Principal - Terminal {terminalId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistema integrado com backend - Carregando produtos reais
          </Typography>
        </Box>
      </Paper>

      {/* Status de carregamento */}
      {productsLoading && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Carregando produtos do backend...</Typography>
          <Typography variant="body2" color="text.secondary">
            Conectando com API em http://localhost:8001
          </Typography>
        </Paper>
      )}

      {/* Erro de carregamento */}
      {productsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Erro ao carregar produtos</Typography>
          <Typography variant="body2">{productsError}</Typography>
        </Alert>
      )}

      {/* Categorias */}
      {!productsLoading && categories.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Categorias</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label="Todas" 
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              clickable
            />
            {categories.map((category) => (
              <Chip 
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                clickable
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Lista de produtos */}
      {!productsLoading && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Produtos {selectedCategory !== 'all' && `- ${selectedCategory}`}
          </Typography>
          
          {filteredProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhum produto encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {products.length === 0 
                  ? 'Não há produtos cadastrados no sistema. A integração com o backend está funcionando, mas a lista está vazia.'
                  : `Não há produtos na categoria "${selectedCategory}".`
                }
              </Typography>
              
              {/* Informações de debug */}
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                <Typography variant="caption" display="block">
                  🔍 Debug Info:
                </Typography>
                <Typography variant="caption" display="block">
                  Total de produtos: {products.length}
                </Typography>
                <Typography variant="caption" display="block">
                  Total de categorias: {categories.length}
                </Typography>
                <Typography variant="caption" display="block">
                  Backend URL: http://localhost:8001/api/v1/products
                </Typography>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {product.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" color="primary">
                          R$ {product.price.toFixed(2)}
                        </Typography>
                        <Chip 
                          label={product.available ? 'Disponível' : 'Indisponível'}
                          color={product.available ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default POSMainPageSimplified;

