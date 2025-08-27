export interface BackendProduct {
  id: string;
  name: string;
  price: number;
  category_id: string;
  type?: 'COMBO' | 'SIMPLE' | 'MODIFIER';
  combo_items?: ComboItem[];
  tax_rule_id?: string;
  active?: boolean;
  status?: string;
  is_available?: boolean;
  image_url?: string | null;
  description?: string | null;
  barcode?: string | null;
  sku?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComboItem {
  product_id: string;
  quantity: number;
  price?: number;
}

// Main Product type used throughout the application
export type Product = FrontendProduct;

export interface FrontendProduct {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  is_combo?: boolean;
  combo_items?: ComboItem[];
  type?: string;
  tax_rule_id?: string;
  active?: boolean;
  is_available?: boolean;
  image_url?: string | null;
  description?: string | null;
  barcode?: string | null;
  sku?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  display_order?: number;
  color?: string;
  icon?: string;
  active?: boolean;
}

export interface ProductModifier {
  id: string;
  name: string;
  price: number;
  group_id: string;
  max_quantity?: number;
  active?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  min_selection: number;
  max_selection: number;
  required: boolean;
  modifiers: ProductModifier[];
}

export interface ProductWithModifiers extends FrontendProduct {
  modifier_groups?: ModifierGroup[];
}

export interface ProductCreateInput {
  name: string;
  price: number;
  category_id: string;
  type?: 'COMBO' | 'SIMPLE' | 'MODIFIER';
  combo_items?: ComboItem[];
  tax_rule_id?: string;
  active?: boolean;
  image_url?: string | null;
  description?: string | null;
  barcode?: string | null;
  sku?: string | null;
  ncm?: string | null;
  cfop?: string | null;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: string;
}

export interface ProductSearchParams {
  search?: string;
  category_id?: string;
  active?: boolean;
  is_combo?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProductResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ProductListResponse {
  products: FrontendProduct[];
  total: number;
  page: number;
  limit: number;
}