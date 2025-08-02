import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/useProduct';
import { formatCurrency } from '../utils/formatters';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  available: boolean;
}

const POSMainPageSimple: React.FC = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user, isAuthenticated } = useAuth();

  // Carregar produtos e categorias do backend
  const {
    products: backendProducts,
    categories: backendCategories,
    loading: productsLoading,
    error: productsError,
    loadProducts,
    loadCategories
  } = useProduct();

  // Converter produtos do backend para formato da interface
  const products: Product[] = backendProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: backendCategories.find(c => c.id === p.category_id)?.name || 'Sem categoria',
    description: `Produto ${p.name}`,
    available: true
  }));

  // Carregar dados na inicialização
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    // Redirecionar se não estiver autenticado
    if (!isAuthenticated) {
      navigate(`/pos/${terminalId}/cashier`);
      return;
    }
  }, [isAuthenticated, navigate, terminalId]);

  if (productsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando produtos do backend...
        </Typography>
      </Box>
    );
  }

  if (productsError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Erro ao carregar produtos: {productsError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        POS Principal - Produtos do Backend
      </Typography>
      
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Total de produtos: {products.length}
      </Typography>

      {products.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
          <RestaurantIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum produto encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Verifique se há produtos cadastrados no sistema
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <RestaurantIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h3" noWrap>
                      {product.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {product.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={product.category} 
                      size="small" 
                      color="secondary"
                      icon={<CategoryIcon />}
                    />
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatCurrency(product.price)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default POSMainPageSimple;

