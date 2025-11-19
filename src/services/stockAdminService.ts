import { supabase } from '@/integrations/supabase/client';

const AIRTABLE_PAT = import.meta.env.VITE_AIRTABLE_PAT;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const INVENTORY_TABLE_ID = import.meta.env.VITE_AIRTABLE_INVENTORY_TABLE_ID;
const BUSINESS_LINES_TABLE_ID = import.meta.env.VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID;

const SUPABASE_BUCKET = 'inventory-images';

// Airtable API endpoints
const INVENTORY_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${INVENTORY_TABLE_ID}`;
const BUSINESS_LINES_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${BUSINESS_LINES_TABLE_ID}`;

const headers = {
  Authorization: `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
};

// Interfaces
export interface InventoryItemFields {
  'Device Type': string;
  'Item_Description': string;
  'Item_Category': string;
  'Item_Nature': string; // "Serialised" or "Non-serialised"
  'Thumbnail'?: AirtableAttachment[];
  'Item_Url'?: string;
  'Item Url'?: string;
  'Item url'?: string;
}

export interface AirtableAttachment {
  id?: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

export interface InventoryItemRecord {
  id: string;
  fields: InventoryItemFields;
  createdTime: string;
}

export interface CreateInventoryItemData {
  'Device Type': string;
  'Item_Description': string;
  'Item_Category': string;
  'Item_Nature': string;
  imageFile?: File;
}

export interface UpdateInventoryItemData {
  'Device Type'?: string;
  'Item_Description'?: string;
  'Item_Category'?: string;
  'Item_Nature'?: string;
}

export interface BusinessLineRecord {
  id: string;
  fields: {
    'Item Category': string;
    'Item Nature': string;
  };
}

class StockAdminService {
  /**
   * Ensure the Supabase storage bucket exists, create if not
   */
  private async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === SUPABASE_BUCKET);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
        public: true,
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      });

      if (error) {
        console.error('Error creating bucket:', error);
        throw new Error(`Failed to create storage bucket: ${error.message}`);
      }
    }
  }

  /**
   * Upload image to Supabase Storage and return public URL
   */
  async uploadImage(file: File, deviceType: string): Promise<AirtableAttachment> {
    try {
      await this.ensureBucketExists();

      // Generate unique filename: deviceType-timestamp.extension
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const sanitizedDeviceType = deviceType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedDeviceType}-${timestamp}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(data.path);

      // Format as Airtable attachment
      const attachment: AirtableAttachment = {
        url: urlData.publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
      };

      return attachment;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([filename]);

      if (error) {
        console.warn('Error deleting image:', error);
        // Don't throw - it's okay if deletion fails (file might not exist)
      }
    } catch (error) {
      console.warn('Error in deleteImage:', error);
    }
  }

  /**
   * Get all inventory items
   */
  async getAll(): Promise<InventoryItemRecord[]> {
    try {
      const response = await fetch(INVENTORY_URL, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory items: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records || [];
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  }

  /**
   * Get inventory items by category
   */
  async getByCategory(category: string): Promise<InventoryItemRecord[]> {
    try {
      const filterFormula = `{Item_Category} = '${category}'`;
      const url = `${INVENTORY_URL}?filterByFormula=${encodeURIComponent(filterFormula)}`;

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch items by category: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records || [];
    } catch (error) {
      console.error('Error fetching items by category:', error);
      throw error;
    }
  }

  /**
   * Get single inventory item by ID
   */
  async getById(id: string): Promise<InventoryItemRecord> {
    try {
      const response = await fetch(`${INVENTORY_URL}/${id}`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory item: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      throw error;
    }
  }

  /**
   * Create new inventory item with image upload
   */
  async create(data: CreateInventoryItemData): Promise<InventoryItemRecord> {
    try {
      let thumbnailAttachment: AirtableAttachment | undefined;

      // Upload image if provided
      if (data.imageFile) {
        thumbnailAttachment = await this.uploadImage(data.imageFile, data['Device Type']);
      }

      // Prepare Airtable record
      const fields: InventoryItemFields = {
        'Device Type': data['Device Type'],
        'Item_Description': data['Item_Description'],
        'Item_Category': data['Item_Category'],
        'Item_Nature': data['Item_Nature'],
      };

      if (thumbnailAttachment) {
        fields.Thumbnail = [thumbnailAttachment];
      }

      const response = await fetch(INVENTORY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create inventory item: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  /**
   * Update existing inventory item
   */
  async update(id: string, data: UpdateInventoryItemData): Promise<InventoryItemRecord> {
    try {
      const response = await fetch(`${INVENTORY_URL}/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: data }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update inventory item: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  /**
   * Delete inventory item (and its image from Supabase)
   */
  async delete(id: string): Promise<void> {
    try {
      // Get item to find image URL
      const item = await this.getById(id);

      // Delete image from Supabase if it's a Supabase URL
      if (item.fields.Thumbnail?.[0]?.url) {
        const imageUrl = item.fields.Thumbnail[0].url;
        if (imageUrl.includes('supabase.co')) {
          await this.deleteImage(imageUrl);
        }
      }

      // Delete from Airtable
      const response = await fetch(`${INVENTORY_URL}/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete inventory item: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  /**
   * Get all categories from Business Lines table
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(BUSINESS_LINES_URL, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data = await response.json();
      const records: BusinessLineRecord[] = data.records || [];

      // Extract unique categories and sort them
      const categories = Array.from(
        new Set(records.map((r) => r.fields['Item Category']).filter(Boolean))
      );

      // Sort by the spec order
      const sortOrder = [
        'Accessories',
        'Absa',
        'Cash Connect',
        'Modems',
        'Sim Management',
        'VPS',
        'Other',
      ];

      return categories.sort((a, b) => {
        const indexA = sortOrder.indexOf(a);
        const indexB = sortOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return default categories if fetch fails
      return ['Accessories', 'Absa', 'Cash Connect', 'Modems', 'Sim Management', 'VPS', 'Other'];
    }
  }
}

export const stockAdminService = new StockAdminService();
