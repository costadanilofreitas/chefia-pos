import axios from 'axios';

// API para previsão de demanda
export const fetchForecast = async (forecastId) => {
  try {
    const response = await axios.get(`/api/ai/forecast/${forecastId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
};

export const createForecast = async (forecastData) => {
  try {
    const response = await axios.post('/api/ai/forecast/create', forecastData);
    return response.data;
  } catch (error) {
    console.error('Error creating forecast:', error);
    throw error;
  }
};

export const fetchAlerts = async (restaurantId, options = {}) => {
  try {
    const { startDate, endDate, alertType, dimensionType } = options;
    
    let url = `/api/ai/forecast/alerts/${restaurantId}`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());
    if (alertType) params.append('alert_type', alertType);
    if (dimensionType) params.append('dimension_type', dimensionType);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

export const fetchRecommendations = async (restaurantId, productIds = []) => {
  try {
    let url = `/api/ai/forecast/recommendations/${restaurantId}`;
    
    if (productIds && productIds.length > 0) {
      const params = new URLSearchParams();
      productIds.forEach(id => params.append('product_ids', id));
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

// Funções auxiliares para integração com fontes de dados externas
export const fetchWeatherData = async (location, startDate, endDate) => {
  try {
    const response = await axios.get('/api/external/weather', {
      params: { location, start_date: startDate, end_date: endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

export const fetchLocalEvents = async (location, startDate, endDate) => {
  try {
    const response = await axios.get('/api/external/events', {
      params: { location, start_date: startDate, end_date: endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching local events:', error);
    throw error;
  }
};

export const fetchHolidays = async (country, year) => {
  try {
    const response = await axios.get('/api/external/holidays', {
      params: { country, year }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    throw error;
  }
};

export const fetchPromotions = async (restaurantId, startDate, endDate) => {
  try {
    const response = await axios.get(`/api/promotions/${restaurantId}`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching promotions:', error);
    throw error;
  }
};
