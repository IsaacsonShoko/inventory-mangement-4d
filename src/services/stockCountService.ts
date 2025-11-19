import Airtable from 'airtable';

// Initialize Airtable
const airtable = new Airtable({ apiKey: import.meta.env.VITE_AIRTABLE_PAT });
const base = airtable.base(import.meta.env.VITE_AIRTABLE_BASE_ID);

const STOCK_LEVELS_TABLE = 'Stock Levels';
const STOCK_COUNTS_TABLE = 'Rolledup Stock Counts';

export interface StockCountSubmission {
  'Count Type': string;
  'Stock Holder': string;
  'Name or Location': string;
  'Item Category': string;
  'BIN LOCATION': string;
  'Device Type': string;
  'Item Nature': string;
  'Item Code': string;
  'Item Description': string;
  'Quantity': number;
  'Contractor Company': string;
  'Contractor Region': string;
  'Technician Name': string;
  'Tech ID': string;
}

export const stockCountService = {
  /**
   * Submit batch stock count entries to Rolledup Stock Counts table
   */
  async submitStockCounts(submissions: StockCountSubmission[]): Promise<void> {
    try {
      // Airtable API allows max 10 records per batch
      const chunkSize = 10;
      const chunks: StockCountSubmission[][] = [];

      for (let i = 0; i < submissions.length; i += chunkSize) {
        chunks.push(submissions.slice(i, i + chunkSize));
      }

      // Process each chunk
      for (const chunk of chunks) {
        const records = chunk.map(submission => ({
          fields: submission
        }));

        await base(STOCK_COUNTS_TABLE).create(records);
      }

      console.log(`Successfully submitted ${submissions.length} stock count entries`);
    } catch (error) {
      console.error('Error submitting stock counts:', error);
      throw new Error(`Failed to submit stock counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get stock levels for reference (read-only)
   */
  async getStockLevels(filters?: {
    searchTerm?: string;
    itemCategory?: string;
    isSerialized?: boolean;
  }): Promise<any[]> {
    try {
      const { searchTerm, itemCategory, isSerialized } = filters || {};

      let filterByFormula: string[] = [];

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

      let results = records.map(record => ({
        id: record.id,
        fields: record.fields,
      }));

      // Apply search filter in memory
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        results = results.filter(record => {
          const deviceType = String(record.fields['Device Type'] || '').toLowerCase();
          const description = String(record.fields['Item Description'] || '').toLowerCase();
          return deviceType.includes(search) || description.includes(search);
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching stock levels:', error);
      throw new Error(`Failed to fetch stock levels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
