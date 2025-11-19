import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inventoryService,
  popService,
  orderService,
  type OrderFormData,
  type CartItem,
  type UniqueOrderUpdate,
  type StockOrderPickedUpdateInput,
  type DispatchLogUpdateInput,
} from '@/integrations/supabase/services';

// ============================================
// INVENTORY HOOKS
// ============================================

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

// ============================================
// POINT OF PRESENCE HOOKS
// ============================================

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

// ============================================
// ORDER HOOKS
// ============================================

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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders'] });
    },
  });
};

export const useUniqueOrders = (filters?: {
  pickStatuses?: string[];
  dispatchStatuses?: string[];
  categories?: string[];
  search?: string;
}) => {
  return useQuery({
    queryKey: ['uniqueOrders', filters],
    queryFn: () => orderService.getUniqueOrders(filters),
    staleTime: 1 * 60 * 1000,
  });
};

export const useUniqueOrderRecord = (recordId?: number) => {
  return useQuery({
    queryKey: ['uniqueOrder', recordId],
    queryFn: () => orderService.getUniqueOrder(recordId as number),
    enabled: Boolean(recordId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateUniqueOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, fields }: { recordId: number; fields: UniqueOrderUpdate }) =>
      orderService.updateUniqueOrder(recordId, fields),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'pickingQueue'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'dispatchQueue'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrder', variables.recordId] });
    },
  });
};

// ============================================
// STOCK ORDER HOOKS
// ============================================

export const useStockOrderItems = (orderNumber?: number) => {
  return useQuery({
    queryKey: ['stockOrderItems', orderNumber],
    queryFn: () => orderService.getStockOrderItems(orderNumber as number),
    enabled: Boolean(orderNumber),
    staleTime: 60 * 1000,
  });
};

export const useStockOrderItemsByOrders = (orderNumbers: number[]) => {
  const enabled = orderNumbers.length > 0;
  const cacheKey = enabled ? [...orderNumbers].sort().join('|') : null;

  return useQuery({
    queryKey: ['stockOrderItems', 'batch', cacheKey],
    queryFn: () => orderService.getStockOrderItemsByOrders(orderNumbers),
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useUpdateStockOrderLines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pickedItems }: { pickedItems: StockOrderPickedUpdateInput[]; orderNumber?: number }) =>
      orderService.updateStockOrderLinesFromPicking(pickedItems),
    onSuccess: (_result, variables) => {
      if (variables.orderNumber) {
        queryClient.invalidateQueries({ queryKey: ['stockOrderItems', variables.orderNumber] });
      }
      queryClient.invalidateQueries({ queryKey: ['stockOrderItems'] });
    },
  });
};

// ============================================
// DISPATCH LOG HOOKS
// ============================================

export const useDispatchLog = (orderNumber?: number) => {
  return useQuery({
    queryKey: ['dispatchLog', orderNumber],
    queryFn: () => orderService.getDispatchLog(orderNumber as number),
    enabled: Boolean(orderNumber),
    staleTime: 60 * 1000,
  });
};

export const useUpdateDispatchLogEntries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ updates }: { updates: DispatchLogUpdateInput[] }) =>
      orderService.updateDispatchLogEntries(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchLog'] });
    },
  });
};

// ============================================
// PICKING & DISPATCH QUEUE HOOKS
// ============================================

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
