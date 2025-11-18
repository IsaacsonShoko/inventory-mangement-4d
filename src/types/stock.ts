export type CountType = 'Monthly' | 'Mid-Month' | 'Daily';

export interface StockItem {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  itemNature: 'Serialised' | 'Non-serialised';
  itemCode: string;
  binLocation: string;
  quantity: number;
  manufactureSerialNumber?: string;
  qrCodeSerialNumber?: string;
  xlinkSerialNumber?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  stockHolder: string;
  nameOrLocation: string;
  contractorCompany: string;
  contractorRegion: string;
  technicianName: string;
  techId: string;
  itemStatus: string;
  faultReason?: string;
  overallCondition?: string;
  xliCaseRef?: string;
  countType: CountType;
  countId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockCountFormData {
  countType: CountType;
  stockHolder: string;
  nameOrLocation: string;
  itemCategory: string;
  binLocation: string;
  deviceType: string;
  itemNature: 'Serialised' | 'Non-serialised';
  itemCode: string;
  itemDescription: string;
  quantity: number;
  manufactureSerialNumber?: string;
  qrCodeSerialNumber?: string;
  xlinkSerialNumber?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  itemStatus: string;
  faultReason?: string;
  overallCondition?: string;
  xliCaseRef?: string;
  contractorCompany: string;
  contractorRegion: string;
  technicianName: string;
  techId: string;
}
