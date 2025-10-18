import type { StockOrderLineItem, UniqueOrder } from '@/types/airtable';

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
  const rawId = order?.fields['Order ID'] as unknown;

  if (rawId === null || rawId === undefined) {
    return undefined;
  }

  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return `ORD-${rawId.toString().padStart(4, '0')}`;
  }

  if (typeof rawId === 'string') {
    const trimmed = rawId.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    if (/^ORD-\d+$/i.test(trimmed)) {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length > 0) {
        const numeric = Number.parseInt(digits, 10);
        if (!Number.isNaN(numeric)) {
          return `ORD-${numeric.toString().padStart(4, '0')}`;
        }
      }
      return trimmed.toUpperCase();
    }

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10);
      return `ORD-${numeric.toString().padStart(4, '0')}`;
    }

    const digits = trimmed.match(/\d+/);
    if (digits) {
      const numeric = Number.parseInt(digits[0], 10);
      if (!Number.isNaN(numeric)) {
        return `ORD-${numeric.toString().padStart(4, '0')}`;
      }
    }

    return trimmed.toUpperCase();
  }

  return undefined;
};

export const normaliseBusinessLine = (value: string | undefined) => {
  if (!value) return 'Other';

  const match = BUSINESS_LINES.find(line => line.toLowerCase() === value.toLowerCase());
  return match ?? value;
};

const getFirstAttachmentUrl = (attachments?: unknown): string | undefined => {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return undefined;
  }

  const [first] = attachments as Array<{ url?: string }>;
  return typeof first?.url === 'string' ? first.url : undefined;
};

export const getLineItemImageUrl = (item: StockOrderLineItem): string | undefined => {
  const fields = item.fields as Record<string, unknown>;

  const directUrl = [
    fields['Item Url'],
    fields['Item url'],
    fields['Item_Url'],
    fields['Item Image'],
    fields['Item image'],
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (directUrl) {
    return directUrl;
  }

  return (
    getFirstAttachmentUrl(fields['Item Thumbnail']) ??
    getFirstAttachmentUrl(fields['Thumbnail']) ??
    undefined
  );
};

export type ExpandedLineItemUnit = {
  unitId: string;
  unitIndex: number;
  totalUnits: number;
  lineItemId: string;
  quantityOrdered: number;
  deviceType: string;
  description: string | undefined;
  itemCode: string | undefined;
  itemCategory: string | undefined;
  itemNature: string | undefined;
  imageUrl: string | undefined;
  isSerialised: boolean;
  lineItem: StockOrderLineItem;
};

export const expandLineItemUnits = (items: StockOrderLineItem[]): ExpandedLineItemUnit[] => {
  const units: ExpandedLineItemUnit[] = [];

  items.forEach((item) => {
    const fields = item.fields as Record<string, unknown>;
    const rawQuantity = Number(fields['Quantity ordered'] ?? fields['Quantity Ordered'] ?? 1);
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.floor(rawQuantity) : 1;
    const itemNature = (fields['Item Nature'] as string | undefined)?.trim();
    const isSerialised = itemNature ? itemNature.toLowerCase().includes('serial') : false;
    const deviceType = (fields['Device type'] as string | undefined) ?? 'Unknown device';
    const description = fields['Item Description'] as string | undefined;
    const itemCode = fields['Item Code'] as string | undefined;
    const itemCategory = fields['Item Category'] as string | undefined;
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
        itemNature,
        imageUrl,
        isSerialised,
        lineItem: item,
      });
    }
  });

  return units;
};
