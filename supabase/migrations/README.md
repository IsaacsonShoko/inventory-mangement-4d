# Supabase Database Migrations

This directory contains SQL migration scripts for the 4D Analytics Inventory Management System database.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard at https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of the migration file (e.g., `create_bot_usage_logs.sql`)
6. Paste into the SQL editor
7. Click **Run** to execute the migration

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Run a specific migration
supabase db execute -f supabase/migrations/create_bot_usage_logs.sql

# Or push all migrations
supabase db push
```

### Option 3: Direct Database Connection

Using `psql` or your preferred PostgreSQL client:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/create_bot_usage_logs.sql
```

## Available Migrations

### `create_bot_usage_logs.sql`

**Purpose**: Creates the `bot_usage_logs` table for tracking Xlink-Sage bot analytics

**What it creates**:
- `bot_usage_logs` table with comprehensive tracking fields
- Indexes for optimized queries
- Row Level Security (RLS) policies for data protection
- Comments for documentation

**Tables Created**:
- `bot_usage_logs`: Main analytics table

**Policies Created**:
- Users can view their own logs
- Users can insert their own logs
- Users can rate their own bot responses
- Admins can view all logs
- Back office can view all logs

**Indexes Created**:
- `idx_bot_usage_logs_user_id`: Fast user queries
- `idx_bot_usage_logs_session_id`: Session-based queries
- `idx_bot_usage_logs_created_at`: Time-based queries (DESC for recent first)
- `idx_bot_usage_logs_user_role`: Role-based analytics
- `idx_bot_usage_logs_satisfaction`: Satisfaction queries
- `idx_bot_usage_logs_work_related`: Work classification queries

**When to Run**: Before enabling bot usage logging in the application

## Verifying Migrations

After running a migration, verify it succeeded:

```sql
-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'bot_usage_logs';

-- Check table structure
\d bot_usage_logs

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'bot_usage_logs';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bot_usage_logs';
```

## Rollback

If you need to rollback the bot_usage_logs migration:

```sql
-- Drop all policies
DROP POLICY IF EXISTS "Users can view own bot logs" ON bot_usage_logs;
DROP POLICY IF EXISTS "Users can insert own bot logs" ON bot_usage_logs;
DROP POLICY IF EXISTS "Users can rate own bot responses" ON bot_usage_logs;
DROP POLICY IF EXISTS "Admins can view all bot logs" ON bot_usage_logs;
DROP POLICY IF EXISTS "Back office can view all bot logs" ON bot_usage_logs;

-- Drop indexes (will be dropped automatically with table, but listed for reference)
DROP INDEX IF EXISTS idx_bot_usage_logs_user_id;
DROP INDEX IF EXISTS idx_bot_usage_logs_session_id;
DROP INDEX IF EXISTS idx_bot_usage_logs_created_at;
DROP INDEX IF EXISTS idx_bot_usage_logs_user_role;
DROP INDEX IF EXISTS idx_bot_usage_logs_satisfaction;
DROP INDEX IF EXISTS idx_bot_usage_logs_work_related;

-- Drop table
DROP TABLE IF EXISTS bot_usage_logs CASCADE;
```

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in a development environment first
3. **Review the SQL** before executing to understand what changes will be made
4. **Check dependencies** - ensure referenced tables (like `user_profiles`) exist
5. **Verify RLS policies** match your security requirements
6. **Monitor performance** after adding indexes on large tables

## Support

For migration issues:
1. Check Supabase logs in the dashboard
2. Verify your PostgreSQL version compatibility
3. Review RLS policy conflicts
4. Contact 4D Analytics support team
