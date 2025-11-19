const AIRTABLE_PAT = import.meta.env.VITE_AIRTABLE_PAT;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const UNIQUE_ORDERS_TABLE_ID = import.meta.env.VITE_AIRTABLE_UNIQUE_ORDERS_TABLE_ID;

const UNIQUE_ORDERS_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${UNIQUE_ORDERS_TABLE_ID}`;

const headers = {
  Authorization: `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
};

// Order status stages
export type OrderStage =
  | 'placed'
  | 'picking'
  | 'picked'
  | 'dispatching'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'collected';

export interface OrderTrackingRecord {
  id: string;
  orderId: string;
  dateOrdered: string;
  itemCategory: string;
  technician: string;
  region: string;
  quantity: number;
  dispatchMethod: string;
  waybillNumber: string;
  pickStatus: string;
  dispatchStatus: string;
  stockAvailability: string;
  orderedBy: string;
  recipientName: string;
  recipientContact: string;
  deliveryAddress: string;
  orderNotes: string;
  currentStage: OrderStage;
  stageTimestamps: StageTimestamp[];
  estimatedDelivery?: string;
}

export interface StageTimestamp {
  stage: OrderStage;
  timestamp: string;
  completed: boolean;
  current: boolean;
}

export interface TrackingSearchParams {
  orderId?: string;
  waybillNumber?: string;
  technician?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

class OrderTrackingService {
  /**
   * Determine current stage based on order statuses
   */
  private determineCurrentStage(
    pickStatus: string,
    dispatchStatus: string,
    dispatchMethod: string
  ): OrderStage {
    // Normalize statuses
    const pick = (pickStatus || '').toLowerCase();
    const dispatch = (dispatchStatus || '').toLowerCase();
    const method = (dispatchMethod || '').toLowerCase();

    // Check dispatch status first (later in workflow)
    if (dispatch.includes('delivered') || dispatch.includes('complete')) {
      return method.includes('collection') ? 'collected' : 'delivered';
    }
    if (dispatch.includes('transit') || dispatch.includes('shipped')) {
      return 'in_transit';
    }
    if (dispatch.includes('dispatched') || dispatch.includes('sent')) {
      return 'dispatched';
    }
    if (dispatch.includes('progress') || dispatch.includes('preparing')) {
      return 'dispatching';
    }

    // Check pick status
    if (pick.includes('picked') || pick.includes('complete')) {
      return 'picked';
    }
    if (pick.includes('progress') || pick.includes('partial')) {
      return 'picking';
    }

    return 'placed';
  }

  /**
   * Generate stage timestamps based on current stage
   */
  private generateStageTimestamps(
    currentStage: OrderStage,
    dateOrdered: string,
    dispatchMethod: string
  ): StageTimestamp[] {
    const isCollection = (dispatchMethod || '').toLowerCase().includes('collection');

    const stages: OrderStage[] = isCollection
      ? ['placed', 'picking', 'picked', 'dispatching', 'collected']
      : ['placed', 'picking', 'picked', 'dispatching', 'dispatched', 'in_transit', 'delivered'];

    const stageOrder: Record<OrderStage, number> = {
      placed: 0,
      picking: 1,
      picked: 2,
      dispatching: 3,
      dispatched: 4,
      in_transit: 5,
      delivered: 6,
      collected: 4, // Collection ends earlier in flow
    };

    const currentIndex = stageOrder[currentStage];
    const orderDate = new Date(dateOrdered);

    return stages.map((stage, index) => {
      const stageIndex = stageOrder[stage];
      const completed = stageIndex < currentIndex;
      const isCurrent = stage === currentStage;

      // Generate estimated timestamps (mock for demo)
      let timestamp = '';
      if (completed || isCurrent) {
        const stageDate = new Date(orderDate);
        stageDate.setHours(stageDate.getHours() + index * 4); // 4 hours per stage
        timestamp = stageDate.toISOString();
      }

      return {
        stage,
        timestamp,
        completed,
        current: isCurrent,
      };
    });
  }

  /**
   * Transform Airtable record to tracking record
   */
  private transformRecord(record: any): OrderTrackingRecord {
    const fields = record.fields;
    const dispatchMethod = fields['Dispatch Method'] || '';
    const pickStatus = fields['Pick Status'] || '';
    const dispatchStatus = fields['Dispatch Status'] || '';
    const dateOrdered = fields['Date Ordered'] || record.createdTime;

    const currentStage = this.determineCurrentStage(pickStatus, dispatchStatus, dispatchMethod);
    const stageTimestamps = this.generateStageTimestamps(currentStage, dateOrdered, dispatchMethod);

    return {
      id: record.id,
      orderId: fields['Order ID']?.toString() || record.id.slice(-6),
      dateOrdered,
      itemCategory: fields['Item Category'] || '',
      technician: fields['Technician'] || '',
      region: fields['Region'] || '',
      quantity: fields['Quantity Ordered'] || 0,
      dispatchMethod,
      waybillNumber: fields['WayBill Number'] || '',
      pickStatus,
      dispatchStatus,
      stockAvailability: fields['Stock Availability'] || '',
      orderedBy: fields['Ordered by'] || '',
      recipientName: fields['Recipient Name'] || fields['Technician'] || '',
      recipientContact: fields['Recipient Contact Number'] || fields['CellPhone Number'] || '',
      deliveryAddress: fields['Recipient Address'] || '',
      orderNotes: fields['Order Notes'] || '',
      currentStage,
      stageTimestamps,
      estimatedDelivery: this.calculateEstimatedDelivery(dateOrdered, currentStage),
    };
  }

  /**
   * Calculate estimated delivery based on current stage
   */
  private calculateEstimatedDelivery(dateOrdered: string, currentStage: OrderStage): string {
    const orderDate = new Date(dateOrdered);
    const now = new Date();

    // Estimate based on stage (mock for demo)
    const hoursRemaining: Record<OrderStage, number> = {
      placed: 48,
      picking: 36,
      picked: 24,
      dispatching: 18,
      dispatched: 12,
      in_transit: 6,
      delivered: 0,
      collected: 0,
    };

    const estimated = new Date(now);
    estimated.setHours(estimated.getHours() + hoursRemaining[currentStage]);

    return estimated.toISOString();
  }

  /**
   * Get all orders for tracking
   */
  async getAllOrders(): Promise<OrderTrackingRecord[]> {
    try {
      const response = await fetch(
        `${UNIQUE_ORDERS_URL}?sort[0][field]=Date%20Ordered&sort[0][direction]=desc`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.records || []).map((record: any) => this.transformRecord(record));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<OrderTrackingRecord | null> {
    try {
      const filterFormula = `OR({Order ID} = '${orderId}', RECORD_ID() = '${orderId}')`;
      const response = await fetch(
        `${UNIQUE_ORDERS_URL}?filterByFormula=${encodeURIComponent(filterFormula)}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        return this.transformRecord(data.records[0]);
      }
      return null;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  /**
   * Search orders with filters
   */
  async searchOrders(params: TrackingSearchParams): Promise<OrderTrackingRecord[]> {
    try {
      const conditions: string[] = [];

      if (params.orderId) {
        conditions.push(`SEARCH('${params.orderId}', {Order ID} & '')`);
      }
      if (params.waybillNumber) {
        conditions.push(`SEARCH('${params.waybillNumber}', {WayBill Number} & '')`);
      }
      if (params.technician) {
        conditions.push(`SEARCH(LOWER('${params.technician}'), LOWER({Technician} & ''))`);
      }
      if (params.dateFrom) {
        conditions.push(`IS_AFTER({Date Ordered}, '${params.dateFrom}')`);
      }
      if (params.dateTo) {
        conditions.push(`IS_BEFORE({Date Ordered}, '${params.dateTo}')`);
      }

      let url = `${UNIQUE_ORDERS_URL}?sort[0][field]=Date%20Ordered&sort[0][direction]=desc`;

      if (conditions.length > 0) {
        const filterFormula = conditions.length === 1
          ? conditions[0]
          : `AND(${conditions.join(', ')})`;
        url += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to search orders: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.records || []).map((record: any) => this.transformRecord(record));
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Get order by waybill number
   */
  async getOrderByWaybill(waybillNumber: string): Promise<OrderTrackingRecord | null> {
    try {
      const filterFormula = `{WayBill Number} = '${waybillNumber}'`;
      const response = await fetch(
        `${UNIQUE_ORDERS_URL}?filterByFormula=${encodeURIComponent(filterFormula)}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        return this.transformRecord(data.records[0]);
      }
      return null;
    } catch (error) {
      console.error('Error fetching order by waybill:', error);
      throw error;
    }
  }
}

export const orderTrackingService = new OrderTrackingService();
