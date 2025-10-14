import Airtable from 'airtable';

// Initialize Airtable
const airtable = new Airtable({
  apiKey: import.meta.env.VITE_AIRTABLE_PAT,
});

const base = airtable.base(import.meta.env.VITE_AIRTABLE_BASE_ID);

export const airtableBase = base;

// Table references
export const tables = {
  inventory: base(import.meta.env.VITE_AIRTABLE_INVENTORY_TABLE_ID),
  pointOfPresence: base(import.meta.env.VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID),
  businessLines: base(import.meta.env.VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID),
  uniqueOrders: base(import.meta.env.VITE_AIRTABLE_UNIQUE_ORDERS_TABLE_ID),
  orders: base(import.meta.env.VITE_AIRTABLE_ORDERS_TABLE_ID), // Stock_Order table (for line items via n8n)
};

