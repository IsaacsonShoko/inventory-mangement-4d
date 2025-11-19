import type { StockOrder, UniqueOrder } from '@/integrations/supabase/services';

export const BUSINESS_LINES = [
  'Absa',
  'Cash Connect',
  'VPS',
  'Modems',
  'Accessories',
  'Sim Management',
  'Other',
];

export const formatOrderNumber = (order: UniqueOrder | undefined) => {
  const rawId = order?.order_id;

  if (rawId === null || rawId === undefined) {
    return undefined;
  }

  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return `ORD-${rawId.toString().padStart(4, '0')}`;
  }

  return undefined;
};

export const normaliseBusinessLine = (value: string | undefined | null) => {
  if (!value) return 'Other';

  const match = BUSINESS_LINES.find(line => line.toLowerCase() === value.toLowerCase());
  return match ?? value;
};

export const getLineItemImageUrl = (item: StockOrder): string | undefined => {
  return undefined;
};

export type ExpandedLineItemUnit = {
  unitId: string;
  unitIndex: number;
  totalUnits: number;
  lineItemId: number;
  quantityOrdered: number;
  deviceType: string;
  description: string | undefined;
  itemCode: string | undefined;
  itemCategory: string | undefined;
  itemNature: string | undefined;
  imageUrl: string | undefined;
  isSerialised: boolean;
  lineItem: StockOrder;
};

export const expandLineItemUnits = (items: StockOrder[]): ExpandedLineItemUnit[] => {
  const units: ExpandedLineItemUnit[] = [];

  items.forEach((item) => {
    const rawQuantity = item.quantity_ordered ?? 1;
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.floor(rawQuantity) : 1;
    const itemNature = item.item_nature?.trim();
    const isSerialised = itemNature ? itemNature.toLowerCase().includes('serial') : false;
    const deviceType = item.device_type ?? 'Unknown device';
    const description = item.item_description ?? undefined;
    const itemCode = undefined;
    const itemCategory = item.item_category ?? undefined;
    const imageUrl = getLineItemImageUrl(item);

    const totalUnits = quantity || 1;

    for (let index = 0; index < totalUnits; index += 1) {
      units.push({
        unitId: `${item.id}-${index + 1}`,
        unitIndex: index + 1,
        totalUnits,
        lineItemId: item.id,
        quantityOrdered: totalUnits,
        deviceType,
        description,
        itemCode,
        itemCategory,
        itemNature: itemNature ?? undefined,
        imageUrl,
        isSerialised,
        lineItem: item,
      });
    }
  });

  return units;
};
