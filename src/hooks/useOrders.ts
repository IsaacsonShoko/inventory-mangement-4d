/**
 * React Query hooks for Orders System
 * Replaces useAirtable hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inventoryCatalogService,
  pointOfPresenceService,
  ordersService,
  dispatchLogService,
  type InventoryCatalogRow,
  type PointOfPresenceRow,
  type OrderRow,
  type OrderLineItemRow,
  type DispatchLogRow,
  type CreateOrderInput,
  type CartItem,
  type ItemCategoryEnum,
  type ItemNatureEnum,
  type PickStatusEnum,
  type DispatchStatusEnum,
} from '@/integrations/supabase/services-orders';

// ============================================================================
// INVENTORY CATALOG HOOKS
// ============================================================================

export function useInventoryCatalog(filters?: {
  category?: ItemCategoryEnum;
  nature?: ItemNatureEnum;
  search?: string;
}) {
  return useQuery({
    queryKey: ['inventory-catalog', filters],
    queryFn: () => inventoryCatalogService.getAll(filters),
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventoryCatalogService.getCategories(),
  });
}

export function useInventoryNatures(category?: ItemCategoryEnum) {
  return useQuery({
    queryKey: ['inventory-natures', category],
    queryFn: () => inventoryCatalogService.getNaturesByCategory(category),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryCatalogService.getById(id),
    enabled: !!id,
  });
}

// ============================================================================
// POINT OF PRESENCE HOOKS
// ============================================================================

export function usePointOfPresence() {
  return useQuery({
    queryKey: ['point-of-presence'],
    queryFn: () => pointOfPresenceService.getAll(),
  });
}

export function useContractors() {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: () => pointOfPresenceService.getContractors(),
  });
}

export function useRegions(contractor?: string) {
  return useQuery({
    queryKey: ['regions', contractor],
    queryFn: () => pointOfPresenceService.getRegions(contractor),
    enabled: !contractor || contractor.length > 0,
  });
}

export function useTechnicians(contractor?: string, region?: string) {
  return useQuery({
    queryKey: ['technicians', contractor, region],
    queryFn: () => pointOfPresenceService.getTechnicians(contractor, region),
  });
}

export function useTechnicianByName(name: string) {
  return useQuery({
    queryKey: ['technician', name],
    queryFn: () => pointOfPresenceService.getByName(name),
    enabled: !!name,
  });
}

// ============================================================================
// ORDERS HOOKS
// ============================================================================

export function useOrders(filters?: {
  pickStatus?: PickStatusEnum[];
  dispatchStatus?: DispatchStatusEnum[];
  category?: ItemCategoryEnum[];
  search?: string;
}) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersService.getAll(filters),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getById(id),
    enabled: !!id,
  });
}

export function useOrderByNumber(orderNumber: number) {
  return useQuery({
    queryKey: ['order-by-number', orderNumber],
    queryFn: () => ordersService.getByOrderNumber(orderNumber),
    enabled: !!orderNumber,
  });
}

export function useOrderLineItems(orderId: string) {
  return useQuery({
    queryKey: ['order-line-items', orderId],
    queryFn: () => ordersService.getLineItems(orderId),
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, cartItems }: { input: CreateOrderInput; cartItems: CartItem[] }) =>
      ordersService.create(input, cartItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['picking-queue'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OrderRow> }) =>
      ordersService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.id] });
      queryClient.invalidateQueries({ queryKey: ['picking-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-queue'] });
    },
  });
}

export function useUpdateOrderLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OrderLineItemRow> }) =>
      ordersService.updateLineItem(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['order-line-items', data.order_id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ============================================================================
// PICKING & DISPATCH QUEUE HOOKS
// ============================================================================

export function usePickingQueue() {
  return useQuery({
    queryKey: ['picking-queue'],
    queryFn: () => ordersService.getPickingQueue(),
  });
}

export function useDispatchQueue() {
  return useQuery({
    queryKey: ['dispatch-queue'],
    queryFn: () => ordersService.getDispatchQueue(),
  });
}

// ============================================================================
// DISPATCH LOG HOOKS
// ============================================================================

export function useDispatchLog(orderId: string) {
  return useQuery({
    queryKey: ['dispatch-log', orderId],
    queryFn: () => dispatchLogService.getByOrderId(orderId),
    enabled: !!orderId,
  });
}

export function useRecentDispatchLog(limit: number = 50) {
  return useQuery({
    queryKey: ['dispatch-log-recent', limit],
    queryFn: () => dispatchLogService.getRecent(limit),
  });
}

export function useCreateDispatchLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<DispatchLogRow, 'id' | 'created_at'>) =>
      dispatchLogService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-log', data.order_id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-log-recent'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-queue'] });
    },
  });
}

export function useUpdateDispatchLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DispatchLogRow> }) =>
      dispatchLogService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-log', data.order_id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-log-recent'] });
    },
  });
}
