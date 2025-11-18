import Airtable from 'airtable';
import { StockItem, StockCountFormData } from '@/types/stock';

// Initialize Airtable
const base = new Airtable({ apiKey: import.meta.env.VITE_AIRTABLE_API_KEY }).base(
  'appbFRxaDoYTDJl0v' // Your base ID
);

const STOCK_LEVELS_TABLE = 'Stock Levels';
const STOCK_COUNTS_TABLE = 'Rolledup Stock Counts';

export const stockCountService = {
  // Fetch stock items with optional filters
  async getStockItems(filters: {
    searchTerm?: string;
    itemCategory?: string;
    isSerialized?: boolean;
  } = {}): Promise<StockItem[]> {
    const { searchTerm, itemCategory, isSerialized } = filters;
    
    let filterByFormula = [];
    
    if (searchTerm) {
      filterByFormula.push(`OR(
        FIND('${searchTerm.toLowerCase()}', LOWER({Device Type})),
        FIND('${searchTerm.toLowerCase()}', LOWER({Item Description}))
      )`);
    }
    
    if (itemCategory) {
      filterByFormula.push(`{Item Category} = '${itemCategory}'`);
    }
    
    if (isSerialized !== undefined) {
      filterByFormula.push(`{Item Nature} = '${isSerialized ? 'Serialised' : 'Non-serialised'}'`);
    }
    
    const records = await base(STOCK_LEVELS_TABLE)
      .select({
        filterByFormula: filterByFormula.length > 0 ? `AND(${filterByFormula.join(', ')})` : '',
        sort: [{ field: 'Device Type', direction: 'asc' }],
      })
      .all();

    return records.map(record => ({
      id: record.id,
      deviceType: record.get('Device Type') as string,
      itemDescription: record.get('Item Description') as string,
      itemCategory: record.get('Item Category') as string,
      itemNature: record.get('Item Nature') as 'Serialised' | 'Non-serialised',
      itemCode: record.get('Item Code') as string,
      binLocation: record.get('BIN LOCATION') as string,
      quantity: record.get('Quantity') as number || 0,
      manufactureSerialNumber: record.get('Manufacture Serial Number') as string | undefined,
      qrCodeSerialNumber: record.get('QR Code Serial Number') as string | undefined,
      xlinkSerialNumber: record.get('Xlink Serial Number') as string | undefined,
      cradleSerialNumber: record.get('Cradle Serial Number') as string | undefined,
      chargerSerialNumber: record.get('Charger Serial Number') as string | undefined,
      stockHolder: record.get('Stock Holder') as string,
      nameOrLocation: record.get('Name or Location') as string,
      contractorCompany: record.get('Contractor Company') as string,
      contractorRegion: record.get('Contractor Region') as string,
      technicianName: record.get('Technician Name') as string,
      techId: record.get('Tech ID') as string,
      itemStatus: record.get('Item Status') as string,
      faultReason: record.get('Fault Reason') as string | undefined,
      overallCondition: record.get('Overall Condition') as string | undefined,
      xliCaseRef: record.get('XLI Case Ref') as string | undefined,
      countType: (record.get('Count Type') as CountType) || 'Monthly',
      countId: record.get('CountID') as string | undefined,
      createdAt: record.get('Created At') as string | undefined,
      updatedAt: record.get('Updated At') as string | undefined,
    }));
  },

  // Create a new stock count
  async createStockCount(data: StockCountFormData): Promise<StockItem> {
    const record = await base(STOCK_COUNTS_TABLE).create({
      'Count Type': data.countType,
      'Stock Holder': data.stockHolder,
      'Name or Location': data.nameOrLocation,
      'Item Category': data.itemCategory,
      'BIN LOCATION': data.binLocation,
      'Device Type': data.deviceType,
      'Item Nature': data.itemNature,
      'Item Code': data.itemCode,
      'Item Description': data.itemDescription,
      'Quantity': data.quantity,
      'Manufacture Serial Number': data.manufactureSerialNumber,
      'QR Code Serial Number': data.qrCodeSerialNumber,
      'Xlink Serial Number': data.xlinkSerialNumber,
      'Cradle Serial Number': data.cradleSerialNumber,
      'Charger Serial Number': data.chargerSerialNumber,
      'Item Status': data.itemStatus,
      'Fault Reason': data.faultReason,
      'Overall Condition': data.overallCondition,
      'XLI Case Ref': data.xliCaseRef,
      'Contractor Company': data.contractorCompany,
      'Contractor Region': data.contractorRegion,
      'Technician Name': data.technicianName,
      'Tech ID': data.techId,
    });

    return {
      id: record.id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  // Update an existing stock count
  async updateStockCount(id: string, data: Partial<StockCountFormData>): Promise<StockItem> {
    const record = await base(STOCK_COUNTS_TABLE).update(id, {
      ...data,
      'Updated At': new Date().toISOString(),
    });

    return {
      id: record.id,
      ...data,
      updatedAt: new Date().toISOString(),
    } as StockItem;
  },

  // Get stock count by ID
  async getStockCount(id: string): Promise<StockItem | null> {
    const record = await base(STOCK_COUNTS_TABLE).find(id);
    
    if (!record) return null;
    
    return {
      id: record.id,
      deviceType: record.get('Device Type') as string,
      itemDescription: record.get('Item Description') as string,
      itemCategory: record.get('Item Category') as string,
      itemNature: record.get('Item Nature') as 'Serialised' | 'Non-serialised',
      itemCode: record.get('Item Code') as string,
      binLocation: record.get('BIN LOCATION') as string,
      quantity: record.get('Quantity') as number || 0,
      manufactureSerialNumber: record.get('Manufacture Serial Number') as string | undefined,
      qrCodeSerialNumber: record.get('QR Code Serial Number') as string | undefined,
      xlinkSerialNumber: record.get('Xlink Serial Number') as string | undefined,
      cradleSerialNumber: record.get('Cradle Serial Number') as string | undefined,
      chargerSerialNumber: record.get('Charger Serial Number') as string | undefined,
      stockHolder: record.get('Stock Holder') as string,
      nameOrLocation: record.get('Name or Location') as string,
      contractorCompany: record.get('Contractor Company') as string,
      contractorRegion: record.get('Contractor Region') as string,
      technicianName: record.get('Technician Name') as string,
      techId: record.get('Tech ID') as string,
      itemStatus: record.get('Item Status') as string,
      faultReason: record.get('Fault Reason') as string | undefined,
      overallCondition: record.get('Overall Condition') as string | undefined,
      xliCaseRef: record.get('XLI Case Ref') as string | undefined,
      countType: (record.get('Count Type') as CountType) || 'Monthly',
      countId: record.get('CountID') as string | undefined,
      createdAt: record.get('Created At') as string | undefined,
      updatedAt: record.get('Updated At') as string | undefined,
    };
  },
};

type CountType = 'Monthly' | 'Mid-Month' | 'Daily';
