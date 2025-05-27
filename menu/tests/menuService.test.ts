import axios from 'axios';
import { fetchProducts, fetchCategories } from '../services/menuService';
import { Product, Category } from '../models/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Menu Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProducts', () => {
    test('returns product data when API call is successful', async () => {
      // Mock data
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Hambúrguer Clássico',
          description: 'Hambúrguer de carne bovina, queijo, alface, tomate e molho especial',
          price: 15.90,
          categoryId: '1',
          available: true,
          imageUrl: 'https://example.com/images/classic-burger.jpg'
        },
        {
          id: '2',
          name: 'Batata Frita Grande',
          description: 'Porção grande de batatas fritas crocantes',
          price: 9.90,
          categoryId: '2',
          available: true,
          imageUrl: 'https://example.com/images/fries.jpg'
        }
      ];

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockProducts,
          message: 'Products fetched successfully'
        }
      });

      // Call the function
      const result = await fetchProducts();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/products');
      expect(result).toEqual(mockProducts);
    });

    test('returns fallback data when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function
      const result = await fetchProducts();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/products');
      expect(result).toHaveLength(5); // Fallback data has 5 products
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('price');
    });
  });

  describe('fetchCategories', () => {
    test('returns category data when API call is successful', async () => {
      // Mock data
      const mockCategories: Category[] = [
        { id: '1', name: 'Hambúrgueres', order: 1 },
        { id: '2', name: 'Acompanhamentos', order: 2 },
        { id: '3', name: 'Bebidas', order: 3 }
      ];

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockCategories,
          message: 'Categories fetched successfully'
        }
      });

      // Call the function
      const result = await fetchCategories();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/categories');
      expect(result).toEqual(mockCategories);
    });

    test('returns fallback data when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function
      const result = await fetchCategories();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/categories');
      expect(result).toHaveLength(4); // Fallback data has 4 categories
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('order');
    });
  });
});
