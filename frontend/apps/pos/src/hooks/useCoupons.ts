import { useState, useCallback, useEffect } from 'react';
import { couponsService, Coupon, CouponCreate, CouponValidation } from '../services/CouponsService';
import { useToast } from '../components/Toast';

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const { success, error: showError } = useToast();

  const loadCoupons = useCallback(async (status?: 'active' | 'inactive' | 'expired') => {
    setLoading(true);
    setError(null);
    try {
      const data = await couponsService.listCoupons(status);
      setCoupons(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cupons');
      showError('Erro ao carregar cupons');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const createCoupon = useCallback(async (coupon: CouponCreate) => {
    setLoading(true);
    setError(null);
    try {
      const newCoupon = await couponsService.createCoupon(coupon);
      setCoupons(prev => [...prev, newCoupon]);
      success('Cupom criado com sucesso!');
      return newCoupon;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cupom');
      showError('Erro ao criar cupom');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const updateCoupon = useCallback(async (id: string, updates: Partial<CouponCreate>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedCoupon = await couponsService.updateCoupon(id, updates);
      setCoupons(prev => prev.map(coupon => 
        coupon.id === id ? updatedCoupon : coupon
      ));
      success('Cupom atualizado com sucesso!');
      return updatedCoupon;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar cupom');
      showError('Erro ao atualizar cupom');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const deleteCoupon = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await couponsService.deleteCoupon(id);
      setCoupons(prev => prev.filter(coupon => coupon.id !== id));
      success('Cupom excluído com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cupom');
      showError('Erro ao excluir cupom');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const validateCoupon = useCallback(async (code: string, orderAmount: number, customerId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await couponsService.validateCoupon(code, orderAmount, customerId);
      setValidation(result);
      
      if (result.is_valid) {
        success(`Cupom válido! Desconto: R$ ${result.discount_amount?.toFixed(2)}`);
      } else {
        showError(result.message || 'Cupom inválido');
      }
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro ao validar cupom');
      showError('Erro ao validar cupom');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const applyCoupon = useCallback(async (code: string, orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      await couponsService.applyCoupon(code, orderId);
      success('Cupom aplicado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao aplicar cupom');
      showError('Erro ao aplicar cupom');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  // Calculate statistics
  const getStatistics = useCallback(() => {
    const active = coupons.filter(c => c.status === 'active');
    const expired = coupons.filter(c => c.status === 'expired');
    const totalUsage = coupons.reduce((sum, c) => sum + c.usage_count, 0);
    const averageUsage = coupons.length > 0 ? totalUsage / coupons.length : 0;
    
    return {
      total: coupons.length,
      active: active.length,
      expired: expired.length,
      totalUsage,
      averageUsage,
      mostUsed: coupons.sort((a, b) => b.usage_count - a.usage_count)[0]
    };
  }, [coupons]);

  // Load initial data
  useEffect(() => {
    loadCoupons();
  }, []);

  return {
    coupons,
    loading,
    error,
    validation,
    loadCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    applyCoupon,
    getStatistics
  };
};