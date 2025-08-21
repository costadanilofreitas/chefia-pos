import { useState, useCallback } from 'react';
import { 
  aiService, 
  CustomerInsight, 
  ProductRecommendation, 
  CampaignRecommendation,
  LoyaltyOptimization 
} from '../services/AIService';
import { useToast } from '../components/Toast';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInsight, setCustomerInsight] = useState<CustomerInsight | null>(null);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecommendation[]>([]);
  const [optimization, setOptimization] = useState<LoyaltyOptimization | null>(null);
  const { success, error: showError, info } = useToast();

  const getCustomerInsights = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const insights = await aiService.getCustomerInsights(customerId);
      setCustomerInsight(insights);
      
      // Show relevant alerts
      if (insights.churn_risk === 'high') {
        showError(`Alto risco de perda! Probabilidade: ${(insights.churn_probability * 100).toFixed(0)}%`);
      } else if (insights.churn_risk === 'medium') {
        info(`Risco médio de perda. Considere ações preventivas.`);
      }
      
      return insights;
    } catch (err: any) {
      setError(err.message || 'Erro ao obter insights do cliente');
      showError('Erro ao analisar cliente com IA');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showError, info]);

  const getProductRecommendations = useCallback(async (customerId: string, limit: number = 5) => {
    setLoading(true);
    setError(null);
    try {
      const recs = await aiService.getProductRecommendations(customerId, limit);
      setRecommendations(recs);
      success(`${recs.length} recomendações geradas com IA`);
      return recs;
    } catch (err: any) {
      setError(err.message || 'Erro ao obter recomendações');
      showError('Erro ao gerar recomendações');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const getCampaignRecommendations = useCallback(async (targetMetrics?: {
    goal: 'retention' | 'acquisition' | 'reactivation';
    budget?: number;
    duration_days?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const camps = await aiService.getCampaignRecommendations(targetMetrics);
      setCampaigns(camps);
      success(`${camps.length} campanhas sugeridas pela IA`);
      return camps;
    } catch (err: any) {
      setError(err.message || 'Erro ao obter campanhas recomendadas');
      showError('Erro ao gerar campanhas com IA');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const optimizeLoyaltyProgram = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opt = await aiService.optimizeLoyaltyProgram();
      setOptimization(opt);
      
      const efficiencyPercent = (opt.current_program_efficiency * 100).toFixed(0);
      const growthPercent = (opt.projected_member_growth * 100).toFixed(0);
      const revenuePercent = (opt.projected_revenue_increase * 100).toFixed(0);
      
      success(`Eficiência atual: ${efficiencyPercent}% | Crescimento projetado: +${growthPercent}% membros, +${revenuePercent}% receita`);
      return opt;
    } catch (err: any) {
      setError(err.message || 'Erro ao otimizar programa');
      showError('Erro ao otimizar programa de fidelidade');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const predictCustomerBehavior = useCallback(async (customerId: string, days: number = 30) => {
    setLoading(true);
    setError(null);
    try {
      const prediction = await aiService.predictCustomerBehavior(customerId, days);
      info(`Probabilidade de compra nos próximos ${days} dias: ${(Math.max(...prediction.purchase_probability) * 100).toFixed(0)}%`);
      return prediction;
    } catch (err: any) {
      setError(err.message || 'Erro ao prever comportamento');
      showError('Erro ao prever comportamento do cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [info, showError]);

  const generatePersonalizedOffer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const offer = await aiService.generatePersonalizedOffer(customerId);
      success(`Oferta personalizada gerada! Taxa de conversão esperada: ${(offer.expected_conversion_rate * 100).toFixed(0)}%`);
      return offer;
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar oferta');
      showError('Erro ao gerar oferta personalizada');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  return {
    loading,
    error,
    customerInsight,
    recommendations,
    campaigns,
    optimization,
    getCustomerInsights,
    getProductRecommendations,
    getCampaignRecommendations,
    optimizeLoyaltyProgram,
    predictCustomerBehavior,
    generatePersonalizedOffer
  };
};