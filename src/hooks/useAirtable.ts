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
  const hasFilters = Boolean(filters?.category && filters?.serialized);

  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => inventoryService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasFilters,
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

export const useRegions = (contractor?: string, deliveryParty?: string) => {
  const contractorFilter = contractor && contractor !== 'select' ? contractor : undefined;
  const shouldFetch = deliveryParty === 'Regional Warehouse' ? true : !!contractorFilter;

  return useQuery({
    queryKey: ['regions', contractorFilter, deliveryParty],
    queryFn: () => popService.getRegions(contractorFilter),
    enabled: shouldFetch,
    staleTime: 10 * 60 * 1000,
  });
};

export const useTechnicians = (contractor?: string, region?: string) => {
  const contractorFilter = contractor && contractor !== 'select' ? contractor : undefined;
  const regionFilter = region && region !== 'select' ? region : undefined;

  return useQuery({
    queryKey: ['technicians', contractorFilter, regionFilter],
    queryFn: () => popService.getTechnicians(contractorFilter, regionFilter),
    enabled: !!contractorFilter && !!regionFilter,
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

export const useItemNatures = (category?: string) => {
  const normalizedCategory = category && category !== 'select' ? category : undefined;

  return useQuery({
    queryKey: ['itemNatures', normalizedCategory],
    queryFn: () => businessLinesService.getNaturesByCategory(normalizedCategory!),
    enabled: !!normalizedCategory,
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

