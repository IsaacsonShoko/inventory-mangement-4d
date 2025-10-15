import type { UniqueOrder } from '@/types/airtable';

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
