# Airtable to Supabase Migration Guide

## Overview
This document provides step-by-step guidance for migrating the inventory management system from Airtable to Supabase.

---

## PRE-MIGRATION CHECKLIST

- [ ] Backup all Airtable data
- [ ] Supabase project created and configured
- [ ] PostgreSQL schema created (see `supabase_schema.sql`)
- [ ] User authentication configured in Supabase
- [ ] Row Level Security (RLS) policies planned
- [ ] Environment variables prepared for connection string

---

## PHASE 1: SCHEMA SETUP (Day 1)

### Step 1.1: Create Enums
Execute the enum creation statements from `supabase_schema.sql`:
```sql
-- Copy ENUMS section from supabase_schema.sql into Supabase SQL Editor
```

### Step 1.2: Create Tables
Execute table creation in this order:
1. `inventory_items`
2. `point_of_presence`
3. `unique_orders`
4. `stock_order`
5. `dispatch_log`

### Step 1.3: Create Indexes
Execute all index creation statements from the schema file.

### Step 1.4: Create Views
Create convenience views for queue operations:
- `orders_pending_pick`
- `orders_ready_dispatch`

### Step 1.5: Create Triggers
Set up automatic `updated_at` timestamp triggers.

---

## PHASE 2: DATA MIGRATION (Day 2-3)

### Step 2.1: Export from Airtable

Export each table as CSV from Airtable:

**Export Order** (to handle FK dependencies):
1. `Inventory_Items` → `inventory_items_export.csv`
2. `Point of Presence` → `point_of_presence_export.csv`
3. `Unique_Orders` → `unique_orders_export.csv`
4. `Stock_Order` → `stock_order_export.csv`
5. `Dispatch_Log` → `dispatch_log_export.csv`

**Note**: When exporting linked record fields from Airtable:
- Linked records are exported as comma-separated IDs
- These need to be converted to match Supabase record IDs
- Save record ID mappings during import

### Step 2.2: Data Type Mapping

| Airtable Type | Supabase Type | Notes |
|---|---|---|
| AutoNumber | BIGSERIAL | Will auto-generate |
| Text | TEXT | |
| Single Select | ENUM | Convert values to exact enum matches |
| Number | INTEGER/NUMERIC | |
| Date | DATE | |
| DateTime | TIMESTAMP | |
| Attachments | JSONB | Store as JSON array with URL, filename, etc. |
| Linked Records | INTEGER (FK) | Map Airtable IDs to Supabase IDs |
| Multiline Text | TEXT | |

### Step 2.3: Prepare Migration Scripts

Create a Python/Node.js script to:
1. Read CSV exports
2. Map Airtable record IDs to Supabase record IDs
3. Convert data types
4. Handle linked records
5. Bulk insert with batching

**Example Node.js pseudocode**:
```javascript
// Load data
const inventoryData = parseCSV('inventory_items_export.csv');

// Map Airtable IDs
const idMap = new Map();

// Transform and insert
const transformed = inventoryData.map(row => ({
  item_name: row['Item_Name'],
  item_url: row['Item_Url'],
  item_category: row['Item_Category'], // Must match enum
  item_description: row['Item_Description'],
  item_nature: row['Item_Nature'],
  created_at: row['Created At'] || new Date(),
}));

// Batch insert
await supabase
  .from('inventory_items')
  .insert(transformed);
```

### Step 2.4: Handle Linked Records

For `Stock_Order` and `Dispatch_Log`:

1. During initial export, track Airtable record ID → Supabase ID mappings
2. Use these mappings when inserting linked records
3. Verify all foreign key constraints are satisfied

**Critical**: Ensure `Unique_Orders` is imported BEFORE `Stock_Order` and `Dispatch_Log` since they have FK dependencies.

### Step 2.5: Data Validation

After each table import, run validation queries:

```sql
-- Check Inventory Items
SELECT COUNT(*) FROM inventory_items;
SELECT COUNT(DISTINCT item_name) FROM inventory_items;

-- Check Orders
SELECT COUNT(*) FROM unique_orders;
SELECT COUNT(DISTINCT order_id) FROM unique_orders;

-- Check Foreign Keys
SELECT COUNT(*) FROM stock_order so 
WHERE NOT EXISTS (SELECT 1 FROM unique_orders uo WHERE uo.id = so.unique_order_record_id);

-- Check Enum Values
SELECT DISTINCT dispatch_status FROM unique_orders;
SELECT DISTINCT pick_status FROM unique_orders;
```

---

## PHASE 3: APPLICATION UPDATES (Day 4-5)

### Step 3.1: Update Connection String
Update application `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3.2: Create Supabase Client

Replace Airtable client with Supabase:

**Old (Airtable)**:
```typescript
import Airtable from 'airtable';
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appXXX');
```

**New (Supabase)**:
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

### Step 3.3: Update Service Layer

Convert services from Airtable API calls to Supabase queries:

**Example: Get Unique Orders**

Before (Airtable):
```typescript
const records = await tables.uniqueOrders.select().all();
return records.map(r => ({ id: r.id, fields: r.fields }));
```

After (Supabase):
```typescript
const { data, error } = await supabase
  .from('unique_orders')
  .select('*')
  .order('date_ordered', { ascending: false });

if (error) throw error;
return data;
```

### Step 3.4: Update Query Patterns

Convert filter formulas to Supabase queries:

**Example: Filter by Pick Status**

Before (Airtable):
```typescript
filterByFormula: "OR({Pick Status} = '', {Pick Status} = BLANK())"
```

After (Supabase):
```typescript
.select('*')
.or(`pick_status.is.null,pick_status.eq.`)
```

### Step 3.5: Handle Batch Operations

Supabase batch updates are simpler:

```typescript
// Update multiple records
const updates = [
  { id: 1, pick_status: 'Picked' },
  { id: 2, pick_status: 'Picked' }
];

await supabase
  .from('stock_order')
  .upsert(updates);
```

---

## PHASE 4: TESTING (Day 5-6)

### Step 4.1: Unit Tests
Update test files to mock Supabase instead of Airtable:
```typescript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder)
  }))
}));
```

### Step 4.2: Integration Tests
Test critical workflows:
- [ ] Create order → verify Stock_Order records created
- [ ] Update pick status → verify Unique_Orders status aggregation
- [ ] Create dispatch → verify Dispatch_Log created correctly
- [ ] Verify all FK constraints work

### Step 4.3: Performance Testing
Compare query performance:
```sql
-- Benchmark picking queue query
EXPLAIN ANALYZE SELECT * FROM unique_orders 
WHERE pick_status IS NULL OR pick_status = 'Pending'
ORDER BY date_ordered ASC;
```

### Step 4.4: Data Accuracy Verification
Sample check against original Airtable:
- [ ] Random 10 orders match exactly
- [ ] Order totals match
- [ ] Serial numbers preserved
- [ ] Status values correct

---

## PHASE 5: WEBHOOK UPDATES (Day 6)

### Step 5.1: Update n8n Integration

The n8n webhook that creates Stock_Order records needs updates:

**Old Flow**: Receives webhook → Creates Stock_Order in Airtable
**New Flow**: Receives webhook → Creates Stock_Order in Supabase

In n8n:
1. Replace Airtable node with Supabase node
2. Map payload fields to Supabase table columns
3. Ensure FK relationships are maintained (order_id matches)

**Example n8n Supabase node config**:
```json
{
  "operation": "insert",
  "table": "stock_order",
  "columns": ["order_id", "unique_order_record_id", "device_type", ...],
  "values": ["{{$json.order_id}}", "{{$json.unique_order_record_id}}", ...]
}
```

### Step 5.2: Test Webhook Flow
Create a test order and verify:
- [ ] Stock_Order records created in Supabase
- [ ] Dispatch_Log created on dispatch
- [ ] Email notifications sent

---

## PHASE 6: CUTOVER & MONITORING (Day 7)

### Step 6.1: Final Data Sync
Do a final data sync 30 minutes before cutover:
```sql
-- Compare record counts
SELECT 'inventory_items' as table, COUNT(*) FROM inventory_items
UNION ALL
SELECT 'unique_orders', COUNT(*) FROM unique_orders
UNION ALL
SELECT 'stock_order', COUNT(*) FROM stock_order
UNION ALL
SELECT 'dispatch_log', COUNT(*) FROM dispatch_log;
```

### Step 6.2: User Notification
Notify users of maintenance window

### Step 6.3: Switch Traffic
Update environment variables to point to Supabase, deploy.

### Step 6.4: Monitor Errors
Watch error logs for:
- Connection failures
- Data type mismatches
- FK constraint violations
- Performance issues

### Step 6.5: Rollback Plan
Keep Airtable accessible for 24 hours in case rollback needed.

---

## CRITICAL MIGRATION POINTS

### Field Name Changes (Airtable → Supabase)

To avoid issues, maintain exact naming compatibility or add mapping layer:

| Airtable | Supabase | Notes |
|---|---|---|
| `Item_Name` | `item_name` | Lowercase with underscore |
| `Item_Category` | `item_category` | Enum type |
| `Order Id` | `order_id` | FK to unique_orders |
| `Charger Packed` | `charger_packed` | Keep as TEXT 'Yes'/'No' |

### Special Handling Required

1. **Auto-increment IDs**: Both Airtable and Supabase auto-increment, but different sequences
   - Solution: Import `Order ID` field as explicit data, don't auto-generate
   - This maintains order number consistency

2. **Linked Records**: Airtable uses record IDs, Supabase uses numeric IDs
   - Create ID mapping during import
   - Validate all FKs after import

3. **Single Select → ENUM**: Enum values must match exactly (case-sensitive)
   - 'Pending' NOT 'pending'
   - 'Picked' NOT 'PICKED'

4. **Attachments**: If needed, store as JSONB:
   ```sql
   ALTER TABLE unique_orders ADD COLUMN attachments JSONB;
   ```

---

## POST-MIGRATION TASKS

- [ ] Disable Airtable API access in application
- [ ] Archive Airtable base (but keep for reference)
- [ ] Update documentation
- [ ] Train team on any UI/API changes
- [ ] Set up Supabase backups
- [ ] Configure RLS policies for multi-tenancy (if needed)
- [ ] Monitor performance and optimize queries
- [ ] Update CI/CD pipelines
- [ ] Decommission Airtable account (after 30 days if stable)

---

## ROLLBACK PROCEDURE (If Needed)

If critical issues occur:

1. Switch environment variables back to point to Airtable
2. Redeploy application
3. Notify users of issue

This is why keeping Airtable in sync during first 24 hours is critical.

---

## SUPABASE-SPECIFIC BEST PRACTICES

### 1. Row Level Security (RLS)
Implement RLS for multi-user scenarios:
```sql
ALTER TABLE unique_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own orders"
  ON unique_orders
  FOR SELECT
  USING (auth.uid() = user_id);
```

### 2. Real-time Subscriptions
Supabase supports real-time updates (optional enhancement):
```typescript
supabase
  .from('unique_orders')
  .on('UPDATE', payload => {
    console.log('Order updated:', payload);
  })
  .subscribe();
```

### 3. Connection Pooling
For high-traffic apps, use PgBouncer connection pooling in Supabase settings.

### 4. Batch Operations
For bulk updates, use batch sizes of 100-1000 rows:
```typescript
const batchSize = 100;
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);
  await supabase.from('table').upsert(batch);
}
```

---

## ESTIMATED TIMELINE

- **Day 1**: Schema setup, validation
- **Day 2-3**: Data export, migration scripts, import & validation
- **Day 4-5**: Code updates, testing
- **Day 6**: Webhook updates, full integration testing
- **Day 7**: Cutover, monitoring

**Total**: 1 week for safe, tested migration

---

## SUPPORT RESOURCES

- Supabase Documentation: https://supabase.com/docs
- Supabase Community: https://discord.supabase.io
- PostgreSQL Documentation: https://www.postgresql.org/docs/

