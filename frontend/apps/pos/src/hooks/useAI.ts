import { useState, useCallback } from 'react';
import {
  aiService, 
  CustomerInsight, 
  ProductRecommendation, 
  CampaignRecommendation,
  LoyaltyOptimization 
} from '../services/AIService';
import { useToast } from '../components/Toast';
import logger, { LogSource } from '../services/LocalLoggerService';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInsight, setCustomerInsight] = useState<CustomerInsight | null>(null);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecommendation[]>([]);
  const [optimization, setOptimization] = useState<LoyaltyOptimization | null>(null);
  const { success, error: showError, info } = useToast();

  const getCustomerInsights = useCallback(async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const insights = await aiService.getCustomerInsights(customerId);
      setCustomerInsight(insights);
      
      // Show relevant alerts
      if (insights.churn_risk === 'high') {
        showError(`Alto risco de perda! Probabilidade: ${(insights.churn_probability * 100).toFixed(0)}%`);
      } else if (insights.churn_risk === 'medium') {
        info(`Risco médio de perda. Considere ações preventivas.`);
      }
      
      return insights;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter insights do cliente';
      setError(errorMessage);
      showError('Erro ao analisar cliente com IA');
      await logger.error('Erro ao obter insights do cliente', { customerId, error: err }, 'useAI', LogSource.POS);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showError, info]);

  const getProductRecommendations = useCallback(async (customerId: string, limit: number = 5) => {
    try {
      setLoading(true);
      setError(null);
      
      const recs = await aiService.getProductRecommendations(customerId, limit);
      setRecommendations(recs);
      success(`${recs.length} recomendações geradas com IA`);
      return recs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter recomendações';
      setError(errorMessage);
      showError('Erro ao gerar recomendações');
      await logger.error('Erro ao obter recomendações de produtos', { customerId, limit, error: err }, 'useAI', LogSource.POS);
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
    try {
      setLoading(true);
      setError(null);
      
      const camps = await aiService.getCampaignRecommendations(targetMetrics);
      setCampaigns(camps);
      success(`${camps.length} campanhas sugeridas pela IA`);
      return camps;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter campanhas recomendadas';
      setError(errorMessage);
      showError('Erro ao gerar campanhas com IA');
      await logger.error('Erro ao obter recomendações de campanhas', { targetMetrics, error: err }, 'useAI', LogSource.POS);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const optimizeLoyaltyProgram = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const opt = await aiService.optimizeLoyaltyProgram();
      setOptimization(opt);
      
      const efficiencyPercent = (opt.current_program_efficiency * 100).toFixed(0);
      const growthPercent = (opt.projected_member_growth * 100).toFixed(0);
      const revenuePercent = (opt.projected_revenue_increase * 100).toFixed(0);
      
      success(`Eficiência atual: ${efficiencyPercent}% | Crescimento projetado: +${growthPercent}% membros, +${revenuePercent}% receita`);
      return opt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao otimizar programa de fidelidade';
      setError(errorMessage);
      showError('Erro ao otimizar programa de fidelidade');
      await logger.error('Erro ao otimizar programa de fidelidade', { error: err }, 'useAI', LogSource.POS);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const predictCustomerBehavior = useCallback(async (customerId: string, days: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      
      const prediction = await aiService.predictCustomerBehavior(customerId, days);
      info(`Probabilidade de compra nos próximos ${days} dias: ${(Math.max(...prediction.purchase_probability) * 100).toFixed(0)}%`);
      return prediction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao prever comportamento do cliente';
      setError(errorMessage);
      showError('Erro ao prever comportamento do cliente');
      await logger.error('Erro ao prever comportamento do cliente', { customerId, days, error: err }, 'useAI', LogSource.POS);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [info, showError]);

  const generatePersonalizedOffer = useCallback(async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const offer = await aiService.generatePersonalizedOffer(customerId);
      success(`Oferta personalizada gerada! Taxa de conversão esperada: ${(offer.expected_conversion_rate * 100).toFixed(0)}%`);
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar oferta personalizada';
      setError(errorMessage);
      showError('Erro ao gerar oferta personalizada');
      await logger.error('Erro ao gerar oferta personalizada', { customerId, error: err }, 'useAI', LogSource.POS);
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