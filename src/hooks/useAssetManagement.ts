import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deviceRegistryService,
  repairTicketService,
  deviceMovementService,
  ingestionBatchService,
  type DeviceRegistryInsert,
  type DeviceMovementInsert,
  type RepairTicketInsert,
  type IngestionBatchInsert,
  type DeviceStatusEnum,
  type HolderTypeEnum,
  type RepairStatusEnum,
} from '@/integrations/supabase/services-asset';

// ======================
// DEVICE REGISTRY HOOKS
// ======================

export function useDeviceRegistry(filters?: Parameters<typeof deviceRegistryService.getAll>[0]) {
  return useQuery({
    queryKey: ['deviceRegistry', filters],
    queryFn: () => deviceRegistryService.getAll(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useDevice(id?: string) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceRegistryService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeviceBySerial(serialNumber?: string) {
  return useQuery({
    queryKey: ['device', 'serial', serialNumber],
    queryFn: () => deviceRegistryService.getBySerial(serialNumber!),
    enabled: !!serialNumber,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckSerialExists() {
  return useMutation({
    mutationFn: (serialNumber: string) => deviceRegistryService.checkSerialExists(serialNumber),
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (device: DeviceRegistryInsert) => deviceRegistryService.create(device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useCreateDevicesBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (devices: DeviceRegistryInsert[]) => deviceRegistryService.createBulk(devices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof deviceRegistryService.update>[1] }) =>
      deviceRegistryService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
      queryClient.invalidateQueries({ queryKey: ['device', variables.id] });
    },
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      holderType,
      holderId,
    }: {
      id: string;
      status: DeviceStatusEnum;
      holderType?: HolderTypeEnum;
      holderId?: string;
    }) => deviceRegistryService.updateStatus(id, status, holderType, holderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
      queryClient.invalidateQueries({ queryKey: ['device', variables.id] });
    },
  });
}

export function useDeviceStatusCounts() {
  return useQuery({
    queryKey: ['deviceRegistry', 'statusCounts'],
    queryFn: () => deviceRegistryService.getStatusCounts(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeviceTypes() {
  return useQuery({
    queryKey: ['deviceRegistry', 'deviceTypes'],
    queryFn: () => deviceRegistryService.getDeviceTypes(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useDeviceCategories() {
  return useQuery({
    queryKey: ['deviceRegistry', 'categories'],
    queryFn: () => deviceRegistryService.getCategories(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTechnicianDevices(techId?: string) {
  return useQuery({
    queryKey: ['deviceRegistry', 'technician', techId],
    queryFn: () => deviceRegistryService.getByTechnician(techId!),
    enabled: !!techId,
    staleTime: 1000 * 60 * 2,
  });
}

// ======================
// REPAIR TICKET HOOKS
// ======================

export function useRepairTickets(filters?: Parameters<typeof repairTicketService.getAll>[0]) {
  return useQuery({
    queryKey: ['repairTickets', filters],
    queryFn: () => repairTicketService.getAll(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useRepairTicket(id?: string) {
  return useQuery({
    queryKey: ['repairTicket', id],
    queryFn: () => repairTicketService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeviceRepairHistory(deviceId?: string) {
  return useQuery({
    queryKey: ['repairTickets', 'device', deviceId],
    queryFn: () => repairTicketService.getByDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateRepairTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticket: RepairTicketInsert) => repairTicketService.create(ticket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useUpdateRepairTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof repairTicketService.update>[1] }) =>
      repairTicketService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useUpdateRepairTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      additionalData,
    }: {
      id: string;
      status: RepairStatusEnum;
      additionalData?: Parameters<typeof repairTicketService.updateStatus>[2];
    }) => repairTicketService.updateStatus(id, status, additionalData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useStartAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assessedBy }: { id: string; assessedBy: string }) =>
      repairTicketService.startAssessment(id, assessedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
    },
  });
}

export function useCompleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isRepairable,
      notes,
      estimatedHours,
    }: {
      id: string;
      isRepairable: boolean;
      notes: string;
      estimatedHours?: number;
    }) => repairTicketService.completeAssessment(id, isRepairable, notes, estimatedHours),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useStartRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, repairedBy }: { id: string; repairedBy: string }) =>
      repairTicketService.startRepair(id, repairedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
    },
  });
}

export function useCompleteRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      actions,
      partsUsed,
      cost,
    }: {
      id: string;
      actions: string;
      partsUsed?: string;
      cost?: number;
    }) => repairTicketService.completeRepair(id, actions, partsUsed, cost),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
    },
  });
}

export function useCompleteQualityCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      checkedBy,
      passed,
      notes,
    }: {
      id: string;
      checkedBy: string;
      passed: boolean;
      notes?: string;
    }) => repairTicketService.completeQualityCheck(id, checkedBy, passed, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useReturnToStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, warehouse }: { id: string; warehouse: string }) =>
      repairTicketService.returnToStock(id, warehouse),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useRepairMetrics() {
  return useQuery({
    queryKey: ['repairTickets', 'metrics'],
    queryFn: () => repairTicketService.getRepairMetrics(),
    staleTime: 1000 * 60 * 5,
  });
}

// ======================
// DEVICE MOVEMENT HOOKS
// ======================

export function useDeviceMovements(deviceId?: string) {
  return useQuery({
    queryKey: ['deviceMovements', deviceId],
    queryFn: () => deviceMovementService.getByDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentMovements(limit: number = 50) {
  return useQuery({
    queryKey: ['deviceMovements', 'recent', limit],
    queryFn: () => deviceMovementService.getRecent(limit),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePerformerMovements(performedBy?: string) {
  return useQuery({
    queryKey: ['deviceMovements', 'performer', performedBy],
    queryFn: () => deviceMovementService.getByPerformer(performedBy!),
    enabled: !!performedBy,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateDeviceMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (movement: DeviceMovementInsert) => deviceMovementService.create(movement),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deviceMovements'] });
      queryClient.invalidateQueries({ queryKey: ['deviceMovements', variables.device_id] });
    },
  });
}

// ======================
// INGESTION BATCH HOOKS
// ======================

export function useIngestionBatches() {
  return useQuery({
    queryKey: ['ingestionBatches'],
    queryFn: () => ingestionBatchService.getAll(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useIngestionBatch(id?: string) {
  return useQuery({
    queryKey: ['ingestionBatch', id],
    queryFn: () => ingestionBatchService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateIngestionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batch: IngestionBatchInsert) => ingestionBatchService.create(batch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestionBatches'] });
    },
  });
}

export function useUpdateIngestionBatchCounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, successful, failed }: { id: string; successful: number; failed: number }) =>
      ingestionBatchService.updateCounts(id, successful, failed),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingestionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['ingestionBatch', variables.id] });
    },
  });
}
