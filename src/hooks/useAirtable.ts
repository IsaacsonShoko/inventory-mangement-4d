import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inventoryService,
  popService,
  orderService
} from '@/integrations/airtable';
import type { OrderFormData, CartItem, UniqueOrder } from '@/types/airtable';

// Inventory Hooks
export const useInventoryItems = (filters?: { category?: string; serialized?: string }) => {
  return useQuery({
    queryKey: ['inventory', filters?.category ?? null, filters?.serialized ?? null],
    queryFn: () => inventoryService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInventorySearch = (query: string, filters?: { category?: string; serialized?: string }) => {
  return useQuery({
    queryKey: ['inventory', 'search', query, filters?.category ?? null, filters?.serialized ?? null],
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

export const useItemCategories = () => {
  return useQuery({
    queryKey: ['itemCategories'],
    queryFn: () => inventoryService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useItemNatures = (category?: string) => {
  const normalizedCategory = category && category !== 'select' ? category : undefined;

  return useQuery({
    queryKey: ['itemNatures', normalizedCategory],
    queryFn: () => inventoryService.getNaturesByCategory(normalizedCategory),
    enabled: normalizedCategory !== undefined,
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

// Picking & Dispatch Hooks
export const usePickingQueue = () => {
  return useQuery({
    queryKey: ['uniqueOrders', 'pickingQueue'],
    queryFn: () => orderService.getPickingQueue(),
    staleTime: 60 * 1000,
  });
};

export const useDispatchQueue = () => {
  return useQuery({
    queryKey: ['uniqueOrders', 'dispatchQueue'],
    queryFn: () => orderService.getDispatchQueue(),
    staleTime: 60 * 1000,
  });
};

export const useUniqueOrderRecord = (recordId?: string) => {
  return useQuery({
    queryKey: ['uniqueOrder', recordId],
    queryFn: () => orderService.getUniqueOrder(recordId as string),
    enabled: Boolean(recordId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useStockOrderItems = (orderNumber?: string) => {
  return useQuery({
    queryKey: ['stockOrderItems', orderNumber],
    queryFn: () => orderService.getStockOrderItems(orderNumber as string),
    enabled: Boolean(orderNumber),
    staleTime: 60 * 1000,
  });
};

export const useDispatchLog = (uniqueOrderRecordId?: string) => {
  return useQuery({
    queryKey: ['dispatchLog', uniqueOrderRecordId],
    queryFn: () => orderService.getDispatchLog(uniqueOrderRecordId as string),
    enabled: Boolean(uniqueOrderRecordId),
    staleTime: 60 * 1000,
  });
};

export const useUpdateUniqueOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, fields }: { recordId: string; fields: Partial<UniqueOrder['fields']> }) =>
      orderService.updateUniqueOrder(recordId, fields),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'pickingQueue'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'dispatchQueue'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrder', variables.recordId] });
    },
  });
};

