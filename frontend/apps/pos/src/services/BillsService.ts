/**
 * Bills Service
 * Handles bills payable operations
 */

import { buildApiUrl } from "../config/api";
import logger from "./LocalLoggerService";

export interface Bill {
  id: string;
  description: string;
  supplier: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  category: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BillCreate {
  description: string;
  supplier: string;
  amount: number;
  due_date: string;
  category: string;
  notes?: string;
}

export interface BillUpdate extends Partial<BillCreate> {
  status?: "pending" | "paid" | "cancelled";
  payment_date?: string;
  payment_method?: string;
}

export interface BillsFilter {
  status?: string;
  supplier?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
}

class BillsService {
  private readonly baseUrl = buildApiUrl("/api/v1");

  async listBills(filter?: BillsFilter): Promise<Bill[]> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await fetch(`${this.baseUrl}/bills?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch bills");
    return await response.json();
  }

  async createBill(bill: BillCreate): Promise<Bill> {
    const response = await fetch(`${this.baseUrl}/bills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(bill),
    });

    if (!response.ok) throw new Error("Failed to create bill");
    return await response.json();
  }

  async updateBill(id: string, updates: BillUpdate): Promise<Bill> {
    const response = await fetch(`${this.baseUrl}/bills/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error("Failed to update bill");
    return await response.json();
  }

  async deleteBill(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/bills/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) throw new Error("Failed to delete bill");
  }

  async payBill(id: string, paymentMethod: string): Promise<Bill> {
    return this.updateBill(id, {
      status: "paid",
      payment_date: new Date().toISOString(),
      payment_method: paymentMethod,
    });
  }

  async getBillsSummary(): Promise<{
    total_pending: number;
    total_overdue: number;
    total_paid_this_month: number;
    next_due: Bill | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/bills/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch summary");
      return await response.json();
    } catch (error) {
      await logger.warn(
        "Failed to fetch bills summary",
        { error },
        "BillsService"
      );
      return {
        total_pending: 0,
        total_overdue: 0,
        total_paid_this_month: 0,
        next_due: null,
      };
    }
  }
}

export const billsService = new BillsService();
