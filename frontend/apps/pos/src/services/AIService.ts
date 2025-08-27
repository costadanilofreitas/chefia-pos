/**
 * AI Service
 * Handles AI-powered recommendations and insights for loyalty program
 */

import { buildApiUrl } from '../config/api';

export interface CustomerInsight {
  customer_id: string;
  churn_risk: 'low' | 'medium' | 'high';
  churn_probability: number;
  recommended_actions: string[];
  predicted_lifetime_value: number;
  next_purchase_prediction: {
    days_until: number;
    likely_categories: string[];
    estimated_value: number;
  };
  segment: string;
}

export interface ProductRecommendation {
  product_id: string;
  product_name: string;
  category: string;
  confidence_score: number;
  reason: string;
  expected_revenue_impact: number;
}

export interface CampaignRecommendation {
  campaign_type: string;
  target_segment: string;
  recommended_discount: number;
  expected_roi: number;
  optimal_timing: string;
  message_template: string;
}

export interface LoyaltyOptimization {
  current_program_efficiency: number;
  recommended_changes: {
    parameter: string;
    current_value: unknown;
    recommended_value: unknown;
    expected_impact: string;
  }[];
  projected_member_growth: number;
  projected_revenue_increase: number;
}

class AIService {

  async getCustomerInsights(customerId: string): Promise<CustomerInsight> {
    const response = await fetch(buildApiUrl(`/api/v1/ai/customers/${customerId}/insights`), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch customer insights');
    return await response.json();
  }

  async getProductRecommendations(customerId: string, limit: number = 5): Promise<ProductRecommendation[]> {
    const response = await fetch(buildApiUrl('/api/v1/ai/recommendations/products'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ customer_id: customerId, limit })
    });
    
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return await response.json();
  }

  async getCampaignRecommendations(targetMetrics?: {
    goal: 'retention' | 'acquisition' | 'reactivation';
    budget?: number;
    duration_days?: number;
  }): Promise<CampaignRecommendation[]> {
    
    const response = await fetch(buildApiUrl('/api/v1/ai/recommendations/campaigns'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(targetMetrics || {})
    });
    
    if (!response.ok) throw new Error('Failed to fetch campaign recommendations');
    return await response.json();
  
  }

  async optimizeLoyaltyProgram(): Promise<LoyaltyOptimization> {
    
    const response = await fetch(buildApiUrl('/api/v1/ai/loyalty/optimize'), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch optimization suggestions');
    return await response.json();
  
  }

  async predictCustomerBehavior(customerId: string, days: number = 30): Promise<{
    purchase_probability: number[];
    expected_categories: string[];
    estimated_spending: number;
    best_contact_times: string[];
  }> {
    
    const response = await fetch(buildApiUrl('/api/v1/ai/predict/behavior'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ customer_id: customerId, prediction_days: days })
    });
    
    if (!response.ok) throw new Error('Failed to predict behavior');
    return await response.json();
  
  }

  async generatePersonalizedOffer(customerId: string): Promise<{
    offer_type: string;
    discount_value: number;
    valid_days: number;
    personalized_message: string;
    expected_conversion_rate: number;
  }> {
    
    const response = await fetch(buildApiUrl('/api/v1/ai/offers/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ customer_id: customerId })
    });
    
    if (!response.ok) throw new Error('Failed to generate offer');
    return await response.json();
  
  }

}

export const aiService = new AIService();