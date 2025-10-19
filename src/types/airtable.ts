// Airtable Type Definitions

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails?: Record<string, {
    url: string;
    width: number;
    height: number;
  }>;
}

export interface InventoryItem {
  id: string;
  fields: {
    'Device Type': string;
    'Item_Description': string;
    'Item_Category': string;
    'Item_Nature': string;
    'Item_Url'?: string;
    'Item Url'?: string;
    'Thumbnail'?: AirtableAttachment[];
  };
}

export interface PointOfPresence {
  id: string;
  fields: {
    'Name & Surname': string;
    'Contractor': string;
    'Region': string;
    'Email Address': string;
    'Area Based'?: string;
    'Location Code'?: string;
    'Contact Number'?: string;
  };
}

export interface BusinessLine {
  id: string;
  fields: {
    'Item Category': string;
    'Item Nature': 'Serialised' | 'Non-serialised';
  };
}

export interface Order {
  id: string;
  fields: {
    'Date Ordered': string;
    'Item Category': string;
    'Item Nature': string;
  'Device Type': string;
    'Quantity ordered': number;
    'Contractor Company'?: string;
    'Region'?: string;
    'Technician'?: string;
    'Ordered by': string;
    'Order Location'?: string;
    'On Behalf of'?: string;
    'PoPID'?: number;
    'Deliver to Part': 'Technician' | 'Regional Warehouse' | 'Non Technician' | '';
    'Recipient Name'?: string;
    'Recipient Company Name'?: string;
    'Recipient Address'?: string;
    'Recipient Contact Number'?: string;
    'Recipient Email Address'?: string;
    'Order ID'?: string;
    'Status'?: string;
  };
}

export interface OrderFormData {
  dateOrdered: Date;
  itemCategory: string;
  itemNature: string;
  deliveryParty: 'Technician' | 'Regional Warehouse' | 'Non Technician' | '';
  contractorCompany?: string;
  region?: string;
  technician?: string;
  onBehalfOf?: string;
  recipientName?: string;
  recipientCompanyName?: string;
  recipientAddress?: string;
  recipientContactNumber?: string;
  recipientEmail?: string;
  orderedBy: string;
  orderLocation?: string;
  popId?: string;
  cellPhoneNumber?: string;
}

export interface CartItem {
  id: string;
  itemName: string;
  itemDescription: string;
  itemCategory: string;
  quantity: number;
  itemNature: string;
  itemUrl?: string;
}

export interface UniqueOrder {
  id: string;
  fields: {
    'Order ID': number | string;
    'Date Ordered': string;
    'Item Category': string;
    'Item Nature': string;
    'Region'?: string;
    'Contractor Company'?: string;
    'Technician'?: string;
    'Quantity Ordered'?: number;
    'Dispatch Status'?: string;
    'Stock Availability'?: string;
    'Pick Status'?: string;
    'Dispatch Method'?: string;
    'WayBill Number'?: string;
    'Ordered by'?: string;
    'On Behalf of'?: string;
    'PoPID'?: string;
    'Deliver to Part'?: string;
    'Recipient Contact Number'?: string;
    'Recipient Name'?: string;
    'Recipient Company Name'?: string;
    'Recipient Address'?: string;
    'Recipient Email Address'?: string;
    'Order Location'?: string;
    'Warehouse Fulfilling'?: string;
    'Order Notes'?: string;
    'Order Summary (AI Generated)'?: string;
    'Dispatch Log'?: string[];
    'Stock Order'?: string[];
    'CellPhone Number'?: string;
  };
}

export interface StockOrderLineItem {
  id: string;
  fields: {
    'Order Id': number;
    'Device Type': string;
    'Date Ordered'?: string;
    'Quantity ordered'?: number;
    'QTY dispatched'?: number;
    'Contractor Company'?: string;
    'Region'?: string;
    'Technician'?: string;
    'Waybill number'?: string;
    'Dispatch / order'?: string;
    'Dispatch to'?: string;
    'Ordered by'?: string;
    'Item Category'?: string;
    'Item Description'?: string;
    'Item Nature'?: string;
    'Order Location'?: string;
    'Pick Status'?: string;
    'Stock Availability'?: string;
    'Package Reference'?: string;
    'Item Code'?: string;
    'Terminal Serial Number'?: string;
    'Cradle Serial Number'?: string;
    'Charger Serial Number'?: string;
    'Dispatch Method'?: string;
    'Warehouse Fulfilling'?: string;
    'Item Url'?: string;
    'Item url'?: string;
    'Item_Url'?: string;
    'Item Image'?: string;
    'Item image'?: string;
    'Item Thumbnail'?: AirtableAttachment[];
    'Thumbnail'?: AirtableAttachment[];
  };
}

export interface DispatchLogEntry {
  id: string;
  fields: {
    'Order Id'?: string[];
    'Date Dispatched'?: string;
    'Item Category'?: string;
    'Item Nature'?: string;
    'Item Description'?: string;
    'Device Type'?: string;
    'Quantity'?: number;
    'Contractor Company'?: string;
    'Region'?: string;
    'Technician'?: string;
    'Dispatch Method'?: string;
    'Waybill number'?: string;
    'Package Reference'?: string;
    'Pick Status'?: string;
    'Stock Availability'?: string;
    'TimePicked'?: string;
    'TimeDispatched'?: string;
    'Warehouse Fulfilling'?: string;
  };
}

