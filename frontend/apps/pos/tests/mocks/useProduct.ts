import { Category, Product } from "../../src/hooks/useProduct";

export const useProduct = () => ({
  products: [
    {
      id: "test-product-1",
      name: "Test Product",
      price: 10.99,
      category_id: "test-category-1",
      description: "Test product description",
      image_url: "/test-image.jpg",
      is_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ] as Product[],
  categories: [
    {
      id: "test-category-1",
      name: "Test Category",
      description: "Test category description",
      icon: "🍔",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ] as Category[],
  loading: false,
  error: null,
  loadProducts: async (_useCache: boolean = true): Promise<void> => {
    return Promise.resolve();
  },
  loadCategories: async (_useCache: boolean = true): Promise<void> => {
    return Promise.resolve();
  },
  getProductsByCategory: async (_categoryId: string): Promise<Product[]> => {
    return [];
  },
  getProductById: async (_productId: string): Promise<Product | undefined> => {
    return undefined;
  },
  searchProducts: async (_query: string): Promise<Product[]> => {
    return [];
  },
});

export default useProduct;
