// Airtable Type Definitions

export interface InventoryItem {
  id: string;
  fields: {
    'Device Type': string;
    'Item Description': string;
    'Item Category': string;
    'Serialized': 'Y' | 'N';
    'Thumbnail'?: Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
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
    'Device type': string;
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
}

export interface CartItem {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  quantity: number;
  itemNature: string;
}

