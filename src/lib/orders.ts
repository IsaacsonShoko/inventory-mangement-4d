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
  const rawId = order?.fields['Order ID'];

  if (!rawId && rawId !== 0) {
    return undefined;
  }

  const numeric = typeof rawId === 'number' ? rawId : Number(rawId);

  if (Number.isNaN(numeric)) {
    return undefined;
  }

  return `ORD-${numeric.toString().padStart(4, '0')}`;
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
