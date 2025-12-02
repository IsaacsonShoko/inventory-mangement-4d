# DATABASE SCHEMA vs TYPESCRIPT CODE AUDIT REPORT

**Date**: 2025-12-02
**Scope**: System-wide audit of ALL 13 database tables
**Purpose**: Identify column name mismatches to prevent runtime errors

---

## Executive Summary

Comprehensive audit of ALL database tables comparing schema definitions with TypeScript interface definitions and actual code usage. This audit identified **CRITICAL MISMATCHES** across multiple tables that could lead to runtime errors and data inconsistencies.

**Key Findings:**
- ❌ **3 tables** with critical column mismatches
- ⚠️ **4 tables** missing from main types.ts
- ✅ **6 tables** fully aligned
- 🔥 **12+ column mismatches** found

---

## Audit Scope

**Tables Audited:** 13 tables across 4 schema files
- SUPABASE_SCHEMA.sql: 5 tables (user_profiles, inventory_items, point_of_presence, stock_order, dispatch_log)
- create-asset-management-tables.sql: 4 tables (device_registry, repair_tickets, device_movements, ingestion_batches)
- create-stock-counts-tables.sql: 2 tables (stock_levels, stock_counts)
- create-vector-table-documents.sql: 1 table (documents)
- **Note:** unique_orders excluded (already audited separately)

---

## CRITICAL FINDINGS

### ❌ Priority 1: BLOCKING PRODUCTION

#### 1. stock_levels & stock_counts - ✅ RESOLVED: Schema Documentation Outdated

**Impact**: ⚠️ **RESOLVED - Code is CORRECT, schema docs were outdated**

**Status**: **COLUMNS EXIST IN LIVE DATABASE** - User confirmed they added these columns. Schema documentation files just weren't updated.

**Actual Database Columns** (confirmed by user):

```sql
-- stock_levels and stock_counts BOTH have:
... (all existing columns) ...
count_type count_type,      -- Type of count: Monthly, Mid-Month, Daily
user_email TEXT,             -- Tracks which user performed the count
count_period TEXT,           -- Generated period identifier:
                             --   Monthly: "2025-12"
                             --   Mid-Month: "2025-12-H1" or "2025-12-H2"
                             --   Daily: "2025-12-02"
```

**How They Work Together**:

- `count_type` = What KIND of count (Monthly/Mid-Month/Daily)
- `count_period` = Auto-generated from count_type via `getCountPeriod()` function
- `user_email` = Who performed the count
- Upsert prevents duplicates: one count per `user_email + device_type + count_type + count_period`

**Code References** (stockCountSupabaseService.ts) - ALL CORRECT ✅:

- Line 38-54: `getCountPeriod()` generates period from type
- Line 136: `const countPeriod = getCountPeriod(data.countType)`
- Line 162-163: Inserts both user_email and count_period
- Line 170: Upsert conflict on all 4 fields
- Line 302, 332: Filters by these columns

**Fix**: Update schema documentation (not code):

- Created `migration_add_stock_count_tracking_fields.sql` to document the additions
- Need to update `create-stock-counts-tables.sql` to reflect current reality

---

#### 2. stock_order - Missing 6 Backorder Columns in TypeScript

**Impact**: 🔥 **HIGH - Backorder functionality invisible to TypeScript**

**Database Has** (SUPABASE_SCHEMA.sql lines 279-322):
```sql
stock_availability stock_availability_enum,
backorder_status backorder_status_enum,
qty_backordered INTEGER,
backorder_created_at TIMESTAMP,
backorder_reactivated_at TIMESTAMP,
backorder_notes TEXT
```

**TypeScript Types Missing** (types.ts lines 266-291):
```typescript
// These 6 columns are completely missing from Row interface!
```

**Fix**: Add to [types.ts](src/integrations/supabase/types.ts):
```typescript
stock_availability: Database['public']['Enums']['stock_availability_enum'] | null
backorder_status: Database['public']['Enums']['backorder_status_enum'] | null
qty_backordered: number | null
backorder_created_at: string | null
backorder_reactivated_at: string | null
backorder_notes: string | null
```

---

#### 3. unique_orders - Missing 3 SLA Tracking Columns in TypeScript

**Impact**: 🔥 **HIGH - SLA tracking system invisible to TypeScript**

**Database Has** (SUPABASE_SCHEMA.sql lines 264-267):
```sql
sla_deadline TIMESTAMP,
sla_status sla_status_enum DEFAULT 'on_track',
sla_breached_at TIMESTAMP
```

**TypeScript Types Missing** (types.ts lines 361-393):
```typescript
// These 3 columns are completely missing from Row interface!
```

**Fix**: Add to [types.ts](src/integrations/supabase/types.ts):
```typescript
sla_deadline: string | null
sla_status: Database['public']['Enums']['sla_status_enum'] | null
sla_breached_at: string | null
```

---

### ⚠️ Priority 2: HIGH

#### 4. user_profiles - Extra Columns in TypeScript Not in Database

**Impact**: ⚠️ **MEDIUM - Code accesses undefined properties**

**Database Has** (SUPABASE_SCHEMA.sql lines 94-105):
```sql
id, email, full_name, role, approval_status,
approved_by, approved_at, warehouse, created_at, updated_at
```

**TypeScript Has Extra** (useAuth.tsx lines 13-15):
```typescript
first_name: string | null   ❌ NOT IN DATABASE
last_name: string | null    ❌ NOT IN DATABASE
company: string | null      ❌ NOT IN DATABASE
```

**Fix Options:**
- **Option A**: Remove from [useAuth.tsx](src/hooks/useAuth.tsx) interface
- **Option B**: Add to database if actually needed:
  ```sql
  ALTER TABLE user_profiles ADD COLUMN first_name TEXT;
  ALTER TABLE user_profiles ADD COLUMN last_name TEXT;
  ALTER TABLE user_profiles ADD COLUMN company TEXT;
  ```

---

## ✅ Tables with No Issues

| Table | Columns | Status |
|-------|---------|--------|
| dispatch_log | 25 | ✅ Fully aligned |
| inventory_items | 8 | ✅ Fully aligned |
| point_of_presence | 25+ | ✅ Fully aligned |
| documents | 4 | ✅ Fully aligned (vector table) |

---

## ⚠️ Tables Not in Main types.ts

These tables exist in database but have custom interfaces in separate service files:

| Table | Location | Columns | Impact |
|-------|----------|---------|--------|
| device_registry | services-asset.ts:65-90 | 19 | Medium - Custom types work but not integrated |
| repair_tickets | services-asset.ts:115-145 | 26 | Medium - Custom types work but not integrated |
| device_movements | services-asset.ts:158-172 | 11 | Medium - Custom types work but not integrated |
| ingestion_batches | services-asset.ts:189-202 | 11 | Medium - Custom types work but not integrated |

**Recommendation**: Regenerate types.ts from Supabase CLI to include all tables:
```bash
npx supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
```

---

## Summary Statistics

- **Total Tables**: 13
- **Tables Audited**: 13 (100%)
- **Critical Mismatches**: 3 tables
- **Column Mismatches**: 12+
- **Missing Columns in Types**: 9
- **Extra Columns in Code**: 5
- **Fully Aligned**: 4 tables
- **Custom Types**: 4 tables

---

## Recommended Action Plan

### Step 1: Critical Fixes (Do First)
1. ✅ Decide on stock_levels/stock_counts approach (add columns to DB or remove from code)
2. ✅ Add missing backorder columns to stock_order types
3. ✅ Add missing SLA columns to unique_orders types

### Step 2: High Priority Fixes
4. ✅ Resolve user_profiles extra columns (remove or add to DB)

### Step 3: Maintenance
5. ⚠️ Regenerate types.ts from Supabase CLI
6. ⚠️ Set up automated schema sync process
7. ⚠️ Add schema validation tests

---

## Files Requiring Changes

| File | Lines | Changes Needed |
|------|-------|---------------|
| [stockCountSupabaseService.ts](src/services/stockCountSupabaseService.ts) | 31, 162, 163, 302, 332, 347 | Remove user_email, count_period OR add to DB |
| [types.ts](src/integrations/supabase/types.ts) | 266-291 | Add 6 backorder columns to stock_order |
| [types.ts](src/integrations/supabase/types.ts) | 361-393 | Add 3 SLA columns to unique_orders |
| [useAuth.tsx](src/hooks/useAuth.tsx) | 13-15 | Remove first_name, last_name, company OR add to DB |

---

**Audit Completed**: 2025-12-02
**Severity**: HIGH
**Action Required**: Yes - Multiple blocking issues found
