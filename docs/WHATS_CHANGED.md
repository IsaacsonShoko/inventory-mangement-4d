# What's Changed - n8n Integration Cleanup

## Summary

We've cleaned up the n8n integration to follow best practices:
- **n8n = Communication layer only** (emails, SMS, notifications)
- **Supabase = Single source of truth** (all data operations)
- **AWS Lambda = HTTPS bridge** (React HTTPS → n8n HTTP)

## Files Changed

### ✅ New Files Created

1. **`n8n flows/OrderPlaced-Supabase-Clean.json`**
   - Clean workflow for order placed notifications
   - Only sends email, no database writes
   - Beautiful HTML email template

2. **`n8n flows/OrderPicked-Supabase-Clean.json`**
   - Clean workflow for order picked notifications
   - Shows serial numbers in email
   - No database writes (app handles dispatch_log)

3. **`n8n flows/OrderDispatched-Supabase-Clean.json`**
   - Clean workflow for order dispatched notifications
   - Handles both courier and collection
   - Shows waybill number if available
   - No database writes (app handles order status updates)

4. **`lambda/n8n-proxy.js`**
   - AWS Lambda function that bridges HTTPS → HTTP
   - Forwards requests from React app to n8n
   - Handles CORS and error responses

5. **`lambda/serverless.yml`**
   - Infrastructure as code for deploying Lambda
   - Creates 3 endpoints (order-placed, order-picked, order-dispatched)
   - Auto-configures API Gateway

6. **`lambda/README.md`**
   - Complete deployment guide for Lambda functions
   - Includes troubleshooting and cost analysis

7. **`docs/N8N_INTEGRATION_GUIDE.md`**
   - End-to-end setup guide
   - Testing procedures
   - Monitoring and logging

8. **`docs/WHATS_CHANGED.md`** (this file)
   - Summary of all changes

### ✏️ Files Modified

1. **`.env.example`**
   - Removed Airtable configuration (no longer needed)
   - Added n8n Lambda endpoint URLs
   - Added comments explaining each variable

### ❌ Old Files (Keep for Reference, Don't Use)

1. **`n8n flows/InventoryStockOrder-Supabase.json`**
   - Old version that tried to INSERT into database
   - **Don't use this** - use OrderPlaced-Supabase-Clean.json instead

2. **`n8n flows/OrderPicked-Supabase.json`**
   - Old version that tried to INSERT into dispatch_log
   - **Don't use this** - use OrderPicked-Supabase-Clean.json instead

3. **`n8n flows/OrderDispatched-Supabase.json`**
   - Old version that tried to UPDATE orders table
   - **Don't use this** - use OrderDispatched-Supabase-Clean.json instead

## What Changed in the Architecture

### Before (❌ Problems)

```
React App → Supabase (creates order)
    ↓
n8n webhook → Supabase (tries to create order again) ❌ Duplicate!
    ↓
Email sent
```

**Problems:**
- n8n tried to write to database (duplicate/conflicting writes)
- Data could get out of sync
- Hard to debug (two places writing data)

### After (✅ Clean)

```
React App → Supabase (creates order) ✅ Single source of truth
    ↓
AWS Lambda → n8n (HTTP bridge)
    ↓
Email sent ✅ n8n only handles communication
```

**Benefits:**
- Single source of truth (Supabase)
- n8n focused on its strength (notifications)
- HTTPS all the way (secure)
- Easy to test and debug

## What You Need to Do

### 1. Import New n8n Workflows

In your n8n:
1. Delete or deactivate old workflows
2. Import the 3 new `-Clean.json` workflows
3. Configure SMTP credentials
4. Activate workflows

### 2. Deploy Lambda Functions

Choose one:
- **Option A:** AWS Lambda (see `lambda/README.md`)
- **Option B:** Netlify Functions (let me know if you want this)

### 3. Update Environment Variables

In Netlify dashboard:
```env
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://your-lambda.amazonaws.com/order-placed
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://your-lambda.amazonaws.com/order-picked
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=https://your-lambda.amazonaws.com/order-dispatched
```

### 4. Test

1. Place a test order
2. Check email received
3. Verify CloudWatch logs
4. Verify n8n execution log

## Code Changes in the App

**Good news: NO CODE CHANGES NEEDED!**

The app already uses environment variables for webhook URLs ([src/integrations/n8n.ts:1-4](../src/integrations/n8n.ts#L1-L4)), so you just need to update the URLs to point to Lambda instead of n8n directly.

## Email Templates Preview

### Order Placed
- Purple gradient header
- Order summary in blue box
- Items list
- Delivery information
- "You'll receive notification when picked"

### Order Picked
- Green gradient header ("✓ Order Picked")
- Picked items table with serial numbers
- Delivery information
- "Will be dispatched shortly"

### Order Dispatched
- Blue gradient header
- Shows waybill number if courier
- Shows collection location if pickup
- Dispatched items with serials
- Delivery/collection instructions

## Next Steps

1. **Read:** `docs/N8N_INTEGRATION_GUIDE.md`
2. **Deploy:** Lambda functions using `lambda/README.md`
3. **Import:** New workflows in n8n
4. **Test:** Place a test order and verify emails

## Questions?

- **Do I need AWS?** Only if you want to use Lambda. We can use Netlify Functions instead (simpler, no AWS account needed).
- **Will old workflows still work?** Yes, but they'll try to write to database (not recommended).
- **Can I test locally?** Yes, just point environment variables to `http://localhost:5678/webhook/...` in `.env.local`

## Cost

- **AWS Lambda:** FREE (within free tier limits)
- **Netlify Functions:** FREE (125k requests/month)
- **n8n self-hosted:** FREE (you're already running it)

**Total: $0/month** for typical usage (< 100k orders/month)
