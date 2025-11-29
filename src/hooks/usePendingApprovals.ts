import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch the count of pending user approvals
 * Used across the app to display notification badges and alerts
 */
export const usePendingApprovals = () => {
  return useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30 * 1000, // 30 seconds - update frequently for notifications
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
  });
};
