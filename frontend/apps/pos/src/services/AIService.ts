/**
 * AI Service
 * Handles AI-powered recommendations and insights for loyalty program
 */

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
    current_value: any;
    recommended_value: any;
    expected_impact: string;
  }[];
  projected_member_growth: number;
  projected_revenue_increase: number;
}

class AIService {
  private baseUrl = 'http://localhost:8001/api/v1/ai';

  async getCustomerInsights(customerId: string): Promise<CustomerInsight> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}/insights`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch customer insights');
      return await response.json();
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      throw error;
    }
  }

  async getProductRecommendations(customerId: string, limit: number = 5): Promise<ProductRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ customer_id: customerId, limit })
      });
      
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  async getCampaignRecommendations(targetMetrics?: {
    goal: 'retention' | 'acquisition' | 'reactivation';
    budget?: number;
    duration_days?: number;
  }): Promise<CampaignRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(targetMetrics || {})
      });
      
      if (!response.ok) throw new Error('Failed to fetch campaign recommendations');
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign recommendations:', error);
      throw error;
    }
  }

  async optimizeLoyaltyProgram(): Promise<LoyaltyOptimization> {
    try {
      const response = await fetch(`${this.baseUrl}/loyalty/optimize`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch optimization suggestions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching optimization:', error);
      throw error;
    }
  }

  async predictCustomerBehavior(customerId: string, days: number = 30): Promise<{
    purchase_probability: number[];
    expected_categories: string[];
    estimated_spending: number;
    best_contact_times: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ customer_id: customerId, prediction_days: days })
      });
      
      if (!response.ok) throw new Error('Failed to predict behavior');
      return await response.json();
    } catch (error) {
      console.error('Error predicting behavior:', error);
      throw error;
    }
  }

  async generatePersonalizedOffer(customerId: string): Promise<{
    offer_type: string;
    discount_value: number;
    valid_days: number;
    personalized_message: string;
    expected_conversion_rate: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/offers/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ customer_id: customerId })
      });
      
      if (!response.ok) throw new Error('Failed to generate offer');
      return await response.json();
    } catch (error) {
      console.error('Error generating offer:', error);
      throw error;
    }
  }

}

export const aiService = new AIService();