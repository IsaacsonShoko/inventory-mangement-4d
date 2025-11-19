/**
 * Collivery (MDS) API Integration Service
 * API Documentation: https://collivery.net/integration/api/v3/
 */

const COLLIVERY_API_BASE = 'https://api.collivery.co.za/v3';
const COLLIVERY_API_TOKEN = import.meta.env.VITE_COLLIVERY_API_TOKEN;

// Request headers for Collivery API
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-App-Name': 'InventoryManagement',
  'X-App-Version': '1.0.0',
  'X-App-Host': window.location.hostname,
  'X-App-Lang': 'en',
});

// Collivery status types
export type ColliveryStatus =
  | 'Quote Accepted'
  | 'Collection Scheduled'
  | 'Collected'
  | 'At Depot'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Failed Delivery'
  | 'Cancelled'
  | 'Returned';

export interface ColliveryTrackingEvent {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

export interface ColliveryTrackingResponse {
  waybill_id: string;
  status: ColliveryStatus;
  status_id: number;
  collection_address?: {
    town: string;
    suburb: string;
  };
  delivery_address?: {
    town: string;
    suburb: string;
  };
  service_type?: string;
  parcels?: number;
  total_weight?: number;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  pod_image_url?: string;
  tracking_events: ColliveryTrackingEvent[];
  driver_name?: string;
  driver_phone?: string;
  vehicle_registration?: string;
  estimated_delivery?: string;
}

export interface ColliveryError {
  message: string;
  errors?: Record<string, string[]>;
}

// Map Collivery statuses to our internal stages
export const mapColliveryStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Quote Accepted': 'Order Confirmed',
    'Collection Scheduled': 'Collection Scheduled',
    'Collected': 'Collected from Sender',
    'At Depot': 'At Distribution Center',
    'In Transit': 'In Transit',
    'Out for Delivery': 'Out for Delivery',
    'Delivered': 'Delivered',
    'Failed Delivery': 'Delivery Failed',
    'Cancelled': 'Cancelled',
    'Returned': 'Returned to Sender',
  };
  return statusMap[status] || status;
};

// Get status color for UI
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'Quote Accepted': 'bg-gray-100 text-gray-700',
    'Collection Scheduled': 'bg-yellow-100 text-yellow-700',
    'Collected': 'bg-orange-100 text-orange-700',
    'At Depot': 'bg-purple-100 text-purple-700',
    'In Transit': 'bg-blue-100 text-blue-700',
    'Out for Delivery': 'bg-indigo-100 text-indigo-700',
    'Delivered': 'bg-green-100 text-green-700',
    'Failed Delivery': 'bg-red-100 text-red-700',
    'Cancelled': 'bg-gray-100 text-gray-700',
    'Returned': 'bg-amber-100 text-amber-700',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-700';
};

class ColliveryService {
  private rateLimitRemaining: number = 60;
  private cache: Map<string, { data: ColliveryTrackingResponse; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Check if the Collivery API is configured
   */
  isConfigured(): boolean {
    return !!COLLIVERY_API_TOKEN && COLLIVERY_API_TOKEN.trim().length > 0;
  }

  /**
   * Get cached tracking data if available and not expired
   */
  private getCached(waybillNumber: string): ColliveryTrackingResponse | null {
    const cached = this.cache.get(waybillNumber);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache tracking response
   */
  private setCache(waybillNumber: string, data: ColliveryTrackingResponse): void {
    this.cache.set(waybillNumber, { data, timestamp: Date.now() });
  }

  /**
   * Track a shipment by waybill number
   */
  async trackWaybill(waybillNumber: string): Promise<ColliveryTrackingResponse> {
    if (!this.isConfigured()) {
      throw new Error('Collivery API is not configured. Please set VITE_COLLIVERY_API_TOKEN in your environment.');
    }

    // Check cache first
    const cached = this.getCached(waybillNumber);
    if (cached) {
      console.log('[Collivery] Returning cached tracking data for:', waybillNumber);
      return cached;
    }

    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      const url = `${COLLIVERY_API_BASE}/status_tracking/${waybillNumber}?api_token=${COLLIVERY_API_TOKEN}`;

      console.log('[Collivery] Fetching tracking for waybill:', waybillNumber);

      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      // Update rate limit from headers
      const rateLimitHeader = response.headers.get('x-ratelimit-remaining');
      if (rateLimitHeader) {
        this.rateLimitRemaining = parseInt(rateLimitHeader, 10);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          throw new Error(`Waybill ${waybillNumber} not found in Collivery system`);
        }
        if (response.status === 401) {
          throw new Error('Invalid Collivery API token. Please check your configuration.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        throw new Error(errorData.message || `Collivery API error: ${response.statusText}`);
      }

      const data = await response.json();
      const trackingData = this.transformResponse(data);

      // Cache the response
      this.setCache(waybillNumber, trackingData);

      return trackingData;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to Collivery API. Please check your network connection.');
      }
      throw error;
    }
  }

  /**
   * Transform Collivery API response to our format
   */
  private transformResponse(data: any): ColliveryTrackingResponse {
    const tracking = data.data || data;

    // Build tracking events from status history if available
    const trackingEvents: ColliveryTrackingEvent[] = [];

    if (tracking.status_history && Array.isArray(tracking.status_history)) {
      tracking.status_history.forEach((event: any) => {
        trackingEvents.push({
          status: event.status || event.name,
          description: event.description || mapColliveryStatus(event.status || event.name),
          timestamp: event.created_at || event.timestamp,
          location: event.location,
        });
      });
    } else {
      // Create a single event from current status
      trackingEvents.push({
        status: tracking.status || tracking.status_text,
        description: mapColliveryStatus(tracking.status || tracking.status_text),
        timestamp: tracking.updated_at || tracking.created_at,
      });
    }

    return {
      waybill_id: tracking.id?.toString() || tracking.waybill_id,
      status: tracking.status || tracking.status_text,
      status_id: tracking.status_id,
      collection_address: tracking.collection_address,
      delivery_address: tracking.delivery_address,
      service_type: tracking.service_type?.text || tracking.service_type,
      parcels: tracking.parcels || tracking.parcel_count,
      total_weight: tracking.total_weight,
      created_at: tracking.created_at,
      updated_at: tracking.updated_at,
      delivered_at: tracking.delivered_at,
      pod_image_url: tracking.pod_image_url,
      tracking_events: trackingEvents,
      driver_name: tracking.driver?.name,
      driver_phone: tracking.driver?.phone,
      vehicle_registration: tracking.vehicle_registration,
      estimated_delivery: tracking.estimated_delivery || tracking.eta,
    };
  }

  /**
   * Get all available statuses from Collivery
   */
  async getStatuses(): Promise<{ id: number; name: string }[]> {
    if (!this.isConfigured()) {
      throw new Error('Collivery API is not configured');
    }

    const url = `${COLLIVERY_API_BASE}/statuses?api_token=${COLLIVERY_API_TOKEN}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch statuses: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get rate limit information
   */
  getRateLimitRemaining(): number {
    return this.rateLimitRemaining;
  }

  /**
   * Clear cache for a specific waybill or all
   */
  clearCache(waybillNumber?: string): void {
    if (waybillNumber) {
      this.cache.delete(waybillNumber);
    } else {
      this.cache.clear();
    }
  }
}

export const colliveryService = new ColliveryService();
