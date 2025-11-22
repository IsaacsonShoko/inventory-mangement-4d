// KPI Dashboard helper functions - add these to the orderService in services.ts

import { supabase } from './client';
import type { StockOrder, DispatchLog } from './services';

export const kpiService = {
  async getAllStockOrders(): Promise<StockOrder[]> {
    try {
      const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .order('date_ordered', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all stock orders:', error);
      throw error;
    }
  },

  async getAllDispatchLogs(): Promise<DispatchLog[]> {
    try {
      const { data, error } = await supabase
        .from('dispatch_log')
        .select('*')
        .order('date_dispatched', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all dispatch logs:', error);
      throw error;
    }
  },
};
