import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  inventoryService, 
  popService, 
  businessLinesService, 
  orderService 
} from '@/integrations/airtable';
import type { OrderFormData, CartItem } from '@/types/airtable';

// Inventory Hooks
export const useInventoryItems = (filters?: { category?: string; serialized?: 'Y' | 'N' }) => {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => inventoryService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInventorySearch = (query: string, filters?: { category?: string; serialized?: 'Y' | 'N' }) => {
  return useQuery({
    queryKey: ['inventory', 'search', query, filters],
    queryFn: () => inventoryService.search(query, filters),
    enabled: query.length >= 2, // Only search with 2+ characters
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Point of Presence Hooks
export const usePointOfPresence = () => {
  return useQuery({
    queryKey: ['pointOfPresence'],
    queryFn: () => popService.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useContractors = () => {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: () => popService.getContractors(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useRegions = (contractor?: string) => {
  return useQuery({
    queryKey: ['regions', contractor],
    queryFn: () => popService.getRegions(contractor),
    enabled: !!contractor,
    staleTime: 10 * 60 * 1000,
  });
};

export const useTechnicians = (contractor?: string, region?: string) => {
  return useQuery({
    queryKey: ['technicians', contractor, region],
    queryFn: () => popService.getTechnicians(contractor, region),
    enabled: !!contractor && !!region,
    staleTime: 10 * 60 * 1000,
  });
};

// Business Lines Hooks
export const useBusinessLines = () => {
  return useQuery({
    queryKey: ['businessLines'],
    queryFn: () => businessLinesService.getAll(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useItemCategories = () => {
  return useQuery({
    queryKey: ['itemCategories'],
    queryFn: () => businessLinesService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useItemNatures = (category: string) => {
  return useQuery({
    queryKey: ['itemNatures', category],
    queryFn: () => businessLinesService.getNaturesByCategory(category),
    enabled: !!category,
    staleTime: 10 * 60 * 1000,
  });
};

// Order Hooks
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ formData, cartItems }: { formData: OrderFormData; cartItems: CartItem[] }) =>
      orderService.create(formData, cartItems),
    onSuccess: () => {
      // Invalidate orders query to refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

