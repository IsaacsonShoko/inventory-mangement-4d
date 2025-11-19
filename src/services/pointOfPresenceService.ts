import Airtable from 'airtable';

// Initialize Airtable
const airtable = new Airtable({ apiKey: import.meta.env.VITE_AIRTABLE_PAT });
const base = airtable.base(import.meta.env.VITE_AIRTABLE_BASE_ID);

const POINT_OF_PRESENCE_TABLE = 'Point of Presence';
const POINT_OF_PRESENCE_DELETED_TABLE = 'Point of Presence Deleted';

export interface PointOfPresenceRecord {
  id: string;
  Contractor?: string;
  Customer?: string;
  'Company Name'?: string;
  'Technician First Name'?: string;
  'Technician Last Name'?: string;
  'Technician Email'?: string;
  'Tech Contact Number'?: string;
  'Vehicle Reg Number'?: string;
  'PoP User Groups'?: string;
  Hub?: string;
  Region?: string;
}

export interface PointOfPresenceFormData {
  Contractor?: string;
  Customer?: string;
  'Company Name'?: string;
  'Technician First Name'?: string;
  'Technician Last Name'?: string;
  'Technician Email'?: string;
  'Tech Contact Number'?: string;
  'Vehicle Reg Number'?: string;
  'PoP User Groups'?: string;
  Hub?: string;
  Region?: string;
}

export const pointOfPresenceService = {
  /**
   * Get all Point of Presence records
   */
  async getAll(): Promise<PointOfPresenceRecord[]> {
    try {
      const records = await base(POINT_OF_PRESENCE_TABLE)
        .select({
          sort: [{ field: 'Company Name', direction: 'asc' }],
        })
        .all();

      return records.map(record => ({
        id: record.id,
        Contractor: record.get('Contractor') as string | undefined,
        Customer: record.get('Customer') as string | undefined,
        'Company Name': record.get('Company Name') as string | undefined,
        'Technician First Name': record.get('Technician First Name') as string | undefined,
        'Technician Last Name': record.get('Technician Last Name') as string | undefined,
        'Technician Email': record.get('Technician Email') as string | undefined,
        'Tech Contact Number': record.get('Tech Contact Number') as string | undefined,
        'Vehicle Reg Number': record.get('Vehicle Reg Number') as string | undefined,
        'PoP User Groups': record.get('PoP User Groups') as string | undefined,
        Hub: record.get('Hub') as string | undefined,
        Region: record.get('Region') as string | undefined,
      }));
    } catch (error) {
      console.error('Error fetching Point of Presence records:', error);
      throw new Error(`Failed to fetch records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Search Point of Presence records
   */
  async search(searchTerm: string): Promise<PointOfPresenceRecord[]> {
    try {
      const allRecords = await this.getAll();

      if (!searchTerm) return allRecords;

      const search = searchTerm.toLowerCase();
      return allRecords.filter(record => {
        const companyName = (record['Company Name'] || '').toLowerCase();
        const firstName = (record['Technician First Name'] || '').toLowerCase();
        const lastName = (record['Technician Last Name'] || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();

        return (
          companyName.includes(search) ||
          firstName.includes(search) ||
          lastName.includes(search) ||
          fullName.includes(search)
        );
      });
    } catch (error) {
      console.error('Error searching Point of Presence records:', error);
      throw new Error(`Failed to search records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get a single Point of Presence record by ID
   */
  async getById(id: string): Promise<PointOfPresenceRecord> {
    try {
      const record = await base(POINT_OF_PRESENCE_TABLE).find(id);

      return {
        id: record.id,
        Contractor: record.get('Contractor') as string | undefined,
        Customer: record.get('Customer') as string | undefined,
        'Company Name': record.get('Company Name') as string | undefined,
        'Technician First Name': record.get('Technician First Name') as string | undefined,
        'Technician Last Name': record.get('Technician Last Name') as string | undefined,
        'Technician Email': record.get('Technician Email') as string | undefined,
        'Tech Contact Number': record.get('Tech Contact Number') as string | undefined,
        'Vehicle Reg Number': record.get('Vehicle Reg Number') as string | undefined,
        'PoP User Groups': record.get('PoP User Groups') as string | undefined,
        Hub: record.get('Hub') as string | undefined,
        Region: record.get('Region') as string | undefined,
      };
    } catch (error) {
      console.error('Error fetching Point of Presence record:', error);
      throw new Error(`Failed to fetch record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Create a new Point of Presence record
   */
  async create(data: PointOfPresenceFormData): Promise<PointOfPresenceRecord> {
    try {
      const record = await base(POINT_OF_PRESENCE_TABLE).create({
        Contractor: data.Contractor,
        Customer: data.Customer,
        'Company Name': data['Company Name'],
        'Technician First Name': data['Technician First Name'],
        'Technician Last Name': data['Technician Last Name'],
        'Technician Email': data['Technician Email'],
        'Tech Contact Number': data['Tech Contact Number'],
        'Vehicle Reg Number': data['Vehicle Reg Number'],
        'PoP User Groups': data['PoP User Groups'],
        Hub: data.Hub,
        Region: data.Region,
      });

      return {
        id: record.id,
        ...data,
      };
    } catch (error) {
      console.error('Error creating Point of Presence record:', error);
      throw new Error(`Failed to create record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Update an existing Point of Presence record
   */
  async update(id: string, data: PointOfPresenceFormData): Promise<PointOfPresenceRecord> {
    try {
      const record = await base(POINT_OF_PRESENCE_TABLE).update(id, {
        Contractor: data.Contractor,
        Customer: data.Customer,
        'Company Name': data['Company Name'],
        'Technician First Name': data['Technician First Name'],
        'Technician Last Name': data['Technician Last Name'],
        'Technician Email': data['Technician Email'],
        'Tech Contact Number': data['Tech Contact Number'],
        'Vehicle Reg Number': data['Vehicle Reg Number'],
        'PoP User Groups': data['PoP User Groups'],
        Hub: data.Hub,
        Region: data.Region,
      });

      return {
        id: record.id,
        ...data,
      };
    } catch (error) {
      console.error('Error updating Point of Presence record:', error);
      throw new Error(`Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Soft delete - Copy record to deleted table and remove from main table
   */
  async softDelete(id: string): Promise<void> {
    try {
      // First, get the record
      const record = await this.getById(id);

      // Copy to deleted table
      await base(POINT_OF_PRESENCE_DELETED_TABLE).create({
        Contractor: record.Contractor,
        Customer: record.Customer,
        'Company Name': record['Company Name'],
        'Technician First Name': record['Technician First Name'],
        'Technician Last Name': record['Technician Last Name'],
        'Technician Email': record['Technician Email'],
        'Tech Contact Number': record['Tech Contact Number'],
        'Vehicle Reg Number': record['Vehicle Reg Number'],
        'PoP User Groups': record['PoP User Groups'],
        Hub: record.Hub,
        Region: record.Region,
        'Original Record ID': id,
        'Deleted At': new Date().toISOString(),
      });

      // Delete from main table
      await base(POINT_OF_PRESENCE_TABLE).destroy(id);

      console.log(`Successfully soft deleted record ${id}`);
    } catch (error) {
      console.error('Error soft deleting Point of Presence record:', error);
      throw new Error(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
