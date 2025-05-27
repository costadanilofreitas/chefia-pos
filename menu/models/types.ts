/**
 * Type definitions for the Menu application
 */

// Product related types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  available: boolean;
  imageUrl?: string;
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Category related types
export interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
