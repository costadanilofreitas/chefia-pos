import React, { useState, useEffect } from 'react';
import { 
  Container, Box, Typography, Rating, TextField, Button, 
  FormControl, FormLabel, RadioGroup, Radio, FormControlLabel,
  Card, CardContent, CardActions, Grid, Divider, CircularProgress,
  Alert, Snackbar, Paper, Chip, IconButton
} from '@mui/material';
import { 
  Star, StarBorder, Send, PhotoCamera, Close, 
  ThumbUp, ThumbDown, Restaurant, AccessTime, LocalOffer
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Componente estilizado para upload de imagem
const Input = styled('input')({
  display: 'none',
});

// Componente principal do formulário de feedback
const FeedbackForm = ({ 
  token, 
  onSubmit, 
  isLoading = false, 
  error = null,
  success = false
}) => {
  // Estado para armazenar os dados do formulário
  const [formData, useState] = useState({
    overallRating: 0,
    foodQualityRating: 0,
    serviceRating: 0,
    ambienceRating: 0,
    priceRating: 0,
    cleanlinessRating: 0,
    comment: '',
    photos: []
  });
  
  // Estado para armazenar informações da solicitação de feedback
  const [requestInfo, setRequestInfo] = useState(null);
  
  // Estado para controlar mensagens de erro/sucesso
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Efeito para carregar informações da solicitação de feedback
  useEffect(() => {
    const fetchRequestInfo = async () => {
      try {
        // Em produção, substituir por chamada real à API
        const response = await fetch(`/api/postsale/feedback-request/token/${token}`);
        const data = await response.json();
        setRequestInfo(data.request);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Erro ao carregar informações da solicitação de feedback',
          severity: 'error'
        });
      }
    };
    
    if (token) {
      fetchRequestInfo();
    }
  }, [token]);
  
  // Manipulador de alteração de campos
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };
  
  // Manipulador de alteração de avaliações
  const handleRatingChange = (field) => (event, newValue) => {
    setFormData({
      ...formData,
      [field]: newValue
    });
  };
  
  // Manipulador de upload de fotos
  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    
    // Limitar a 3 fotos
    if (formData.photos.length + files.length > 3) {
      setSnackbar({
        open: true,
        message: 'Você pode enviar no máximo 3 fotos',
        severity: 'warning'
      });
      return;
    }
    
    // Converter arquivos para URLs de dados
    const filePromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(filePromises)
      .then(dataUrls => {
        setFormData({
          ...formData,
          photos: [...formData.photos, ...dataUrls]
        });
      })
      .catch(error => {
        setSnackbar({
          open: true,
          message: 'Erro ao processar imagens',
          severity: 'error'
        });
      });
  };
  
  // Manipulador para remover foto
  const handleRemovePhoto = (index) => {
    const updatedPhotos = [...formData.photos];
    updatedPhotos.splice(index, 1);
    setFormData({
      ...formData,
      photos: updatedPhotos
    });
  };
  
  // Manipulador de envio do formulário
  const handleSubmit = (event) => {
    event.preventDefault();
    
    // Validar formulário
    if (formData.overallRating === 0) {
      setSnackbar({
        open: true,
        message: 'Por favor, forneça uma avaliação geral',
        severity: 'warning'
      });
      return;
    }
    
    // Preparar dados para envio
    const feedbackData = {
      order_id: requestInfo?.order_id,
      customer_id: requestInfo?.customer_id,
      customer_name: requestInfo?.customer_name,
      customer_email: requestInfo?.customer_email,
      customer_phone: requestInfo?.customer_phone,
      overall_rating: formData.overallRating,
      category_ratings: {
        food_quality: formData.foodQualityRating || formData.overallRating,
        service: formData.serviceRating || formData.overallRating,
        ambience: formData.ambienceRating || formData.overallRating,
        price: formData.priceRating || formData.overallRating,
        cleanliness: formData.cleanlinessRating || formData.overallRating
      },
      comment: formData.comment,
      photos: formData.photos,
      source: 'web'
    };
    
    // Enviar para o callback
    onSubmit(feedbackData);
  };
  
  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  // Renderizar formulário
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sua opinião é importante para nós!
        </Typography>
        
        {requestInfo && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="text.secondary">
              Pedido #{requestInfo.order_id}
            </Typography>
            {requestInfo.customer_name && (
              <Typography variant="body1">
                Olá, {requestInfo.customer_name}!
              </Typography>
            )}
          </Box>
        )}
        
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Avaliação Geral
            </Typography>
            <Rating
              name="overall-rating"
              value={formData.overallRating}
              onChange={handleRatingChange('overallRating')}
              size="large"
              precision={1}
              icon={<Star fontSize="inherit" />}
              emptyIcon={<StarBorder fontSize="inherit" />}
              sx={{ fontSize: '2rem' }}
            />
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Avaliações Específicas
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ mr: 2, minWidth: 120 }}>
                  Qualidade da comida:
                </Typography>
                <Rating
                  name="food-quality-rating"
                  value={formData.foodQualityRating}
                  onChange={handleRatingChange('foodQualityRating')}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ mr: 2, minWidth: 120 }}>
                  Atendimento:
                </Typography>
                <Rating
                  name="service-rating"
                  value={formData.serviceRating}
                  onChange={handleRatingChange('serviceRating')}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ mr: 2, minWidth: 120 }}>
                  Ambiente:
                </Typography>
                <Rating
                  name="ambience-rating"
                  value={formData.ambienceRating}
                  onChange={handleRatingChange('ambienceRating')}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ mr: 2, minWidth: 120 }}>
                  Preço:
                </Typography>
                <Rating
                  name="price-rating"
                  value={formData.priceRating}
                  onChange={handleRatingChange('priceRating')}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ mr: 2, minWidth: 120 }}>
                  Limpeza:
                </Typography>
                <Rating
                  name="cleanliness-rating"
                  value={formData.cleanlinessRating}
                  onChange={handleRatingChange('cleanlinessRating')}
                />
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comentários
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Conte-nos mais sobre sua experiência..."
              value={formData.comment}
              onChange={handleChange('comment')}
            />
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Fotos
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {formData.photos.map((photo, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    position: 'relative',
                    width: 100,
                    height: 100
                  }}
                >
                  <img 
                    src={photo} 
                    alt={`Foto ${index + 1}`}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'white'
                      }
                    }}
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
            <label htmlFor="upload-photo">
              <Input
                accept="image/*"
                id="upload-photo"
                type="file"
                multiple
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCamera />}
                disabled={formData.photos.length >= 3}
              >
                Adicionar Fotos
              </Button>
            </label>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Máximo de 3 fotos
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Obrigado pelo seu feedback!
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Send />}
              disabled={isLoading || success}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Enviar Avaliação'}
            </Button>
          </Box>
        </form>
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Componente de agradecimento e benefício
const FeedbackThankYou = ({ benefit }) => {
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, my: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Obrigado pelo seu feedback!
        </Typography>
        
        <Box sx={{ my: 4 }}>
          <Typography variant="body1" paragraph>
            Sua opinião é muito importante para continuarmos melhorando nossos serviços.
          </Typography>
        </Box>
        
        {benefit && (
          <Card 
            variant="outlined" 
            sx={{ 
              maxWidth: 400, 
              mx: 'auto', 
              my: 4,
              border: '2px dashed',
              borderColor: 'primary.main'
            }}
          >
            <CardContent>
              <Typography variant="h5" component="div" color="primary" gutterBottom>
                <LocalOffer sx={{ mr: 1, verticalAlign: 'middle' }} />
                Você ganhou um benefício!
              </Typography>
              
              <Typography variant="h6" component="div" gutterBottom>
                {benefit.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {benefit.description}
              </Typography>
              
              <Box sx={{ 
                bgcolor: 'background.default', 
                p: 2, 
                borderRadius: 1,
                letterSpacing: 1
              }}>
                <Typography variant="h6" component="div">
                  {benefit.code}
                </Typography>
              </Box>
              
              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                Válido até: {new Date(benefit.expires_at).toLocaleDateString()}
              </Typography>
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button variant="contained" color="primary">
                Usar Agora
              </Button>
            </CardActions>
          </Card>
        )}
        
        <Button 
          variant="outlined" 
          color="primary"
          sx={{ mt: 2 }}
          href="/"
        >
          Voltar para o Início
        </Button>
      </Paper>
    </Container>
  );
};

// Componente principal que gerencia o fluxo de feedback
const FeedbackPage = ({ token }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [benefit, setBenefit] = useState(null);
  
  const handleSubmitFeedback = async (feedbackData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Em produção, substituir por chamada real à API
      const response = await fetch('/api/postsale/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedbackData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao enviar feedback');
      }
      
      setSuccess(true);
      
      // Verificar se há benefício
      if (data.customer_benefit) {
        setBenefit(data.customer_benefit);
      }
    } catch (error) {
      setError(error.message || 'Erro ao enviar feedback');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box sx={{ py: 4 }}>
      {success ? (
        <FeedbackThankYou benefit={benefit} />
      ) : (
        <FeedbackForm
          token={token}
          onSubmit={handleSubmitFeedback}
          isLoading={isLoading}
          error={error}
          success={success}
        />
      )}
    </Box>
  );
};

export default FeedbackPage;
