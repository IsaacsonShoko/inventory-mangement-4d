# n8n Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Production Architecture                      │
└─────────────────────────────────────────────────────────────────┘

React App (Netlify HTTPS)
    │
    │ HTTPS POST
    ▼
AWS Lambda Proxy Functions (HTTPS)
    │
    │ HTTP POST (no SSL required)
    ▼
Self-Hosted n8n (HTTP)
    │
    │ SMTP
    ▼
Email Notifications
```

## Why Lambda Proxy?

Your React app is hosted on Netlify (HTTPS) and your n8n is self-hosted (HTTP). Modern browsers block mixed content (HTTPS → HTTP). Lambda acts as a bridge:

- ✅ React app calls Lambda (HTTPS → HTTPS) ✓ Secure
- ✅ Lambda calls n8n (HTTPS → HTTP) ✓ Server-side, allowed
- ✅ No SSL certificates needed on n8n
- ✅ n8n can stay on private network

## Setup Steps

### Step 1: Import Clean n8n Workflows

1. **Open n8n** (http://your-n8n-server:5678)

2. **Import workflows:**
   - Go to: Workflows → Import from File
   - Import: `n8n flows/OrderPlaced-Supabase-Clean.json`
   - Import: `n8n flows/OrderPicked-Supabase-Clean.json`
   - Import: `n8n flows/OrderDispatched-Supabase-Clean.json`

3. **Configure SMTP credentials:**
   - Go to: Credentials → Add Credential → SMTP
   - Fill in your email server details:
     ```
     Host: smtp.gmail.com (or your SMTP server)
     Port: 587
     User: your-email@gmail.com
     Password: your-app-password
     ```
   - Save as: "SMTP account"

4. **Activate workflows:**
   - Open each workflow
   - Click "Active" toggle (top right)
   - Verify webhook URLs:
     - Order Placed: `http://your-ip:5678/webhook/order-placed`
     - Order Picked: `http://your-ip:5678/webhook/order-picked`
     - Order Dispatched: `http://your-ip:5678/webhook/order-dispatched`

### Step 2: Deploy Lambda Proxy

#### Option A: Serverless Framework (Recommended)

1. **Install Serverless:**
   ```bash
   npm install -g serverless
   ```

2. **Configure AWS:**
   ```bash
   serverless config credentials --provider aws --key YOUR_ACCESS_KEY --secret YOUR_SECRET_KEY
   ```

3. **Update `lambda/serverless.yml`:**
   ```yaml
   environment:
     N8N_WEBHOOK_URL: http://YOUR_N8N_IP:5678/webhook/order-placed
   ```
   Replace `YOUR_N8N_IP` with your n8n server IP (or domain if you have one)

4. **Deploy:**
   ```bash
   cd lambda
   serverless deploy
   ```

5. **Save the endpoints** from output:
   ```
   endpoints:
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-placed
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-picked
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-dispatched
   ```

#### Option B: Netlify Functions (Simpler, No AWS Account Needed)

If you want to avoid AWS entirely:

1. **Create `netlify/functions/n8n-proxy.js`** (I can create this if you want)

2. **Deploy with your Netlify site** (auto-deploys on git push)

3. **Endpoints will be:**
   ```
   https://your-site.netlify.app/.netlify/functions/n8n-proxy?type=order-placed
   ```

**Let me know if you want Option B instead!**

### Step 3: Update Environment Variables

#### Local Development (.env.local)

```env
# For local testing, you can point directly to n8n if on same network
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=http://localhost:5678/webhook/order-placed
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=http://localhost:5678/webhook/order-picked
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=http://localhost:5678/webhook/order-dispatched
```

#### Production (Netlify Dashboard)

1. **Go to:** Netlify Dashboard → Site settings → Environment variables

2. **Add:**
   ```
   VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://abc123.execute-api.us-east-1.amazonaws.com/order-placed
   VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://abc123.execute-api.us-east-1.amazonaws.com/order-picked
   VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=https://abc123.execute-api.us-east-1.amazonaws.com/order-dispatched
   ```

3. **Redeploy site** (Netlify → Deploys → Trigger deploy)

### Step 4: Test the Flow

#### Test Order Placed

1. **Place a test order** in your app
2. **Check CloudWatch Logs** (AWS Console → CloudWatch → Log groups)
3. **Check n8n execution history** (n8n → Executions)
4. **Verify email sent**

#### Manual Test with cURL

```bash
# Test Lambda endpoint
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/order-placed \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-0001",
    "orderedBy": "test@example.com",
    "orderedByEmail": "test@example.com",
    "totalItems": 2,
    "totalQuantity": 5,
    "dateOrdered": "2024-01-15",
    "deliveryParty": "Technician",
    "formData": {
      "itemCategory": "Modems",
      "itemNature": "Serialised"
    },
    "cartItems": [
      {
        "itemName": "Test Device",
        "quantity": 2
      }
    ]
  }'
```

#### Test n8n directly (from server with n8n access)

```bash
curl -X POST http://localhost:5678/webhook/order-placed \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-0001", "orderedBy": "test@example.com"}'
```

## Email Templates

### Order Placed Email
- **Subject:** Order ORD-XXXX - Placed Successfully
- **Sent to:** Person who placed order
- **Content:** Order summary, items list, delivery info

### Order Picked Email
- **Subject:** Order ORD-XXXX - Picked and Ready
- **Sent to:** Person who placed order
- **Content:** Picked items with serial numbers, next steps

### Order Dispatched Email
- **Subject:** Order ORD-XXXX - Dispatched (or Ready for Collection)
- **Sent to:** Recipient email
- **Content:** Waybill number, tracking info, delivery details

## Troubleshooting

### Issue: "Failed to connect to n8n webhook"

**Cause:** Lambda can't reach your n8n server

**Solutions:**
1. Ensure n8n is accessible from internet (check firewall)
2. Use public IP or domain, not `localhost`
3. If n8n is on private network, deploy Lambda in VPC

### Issue: "CORS error in browser"

**Cause:** Lambda not returning CORS headers

**Solution:** Already handled in code, but verify API Gateway CORS is enabled

### Issue: "Email not sent"

**Cause:** SMTP credentials incorrect or n8n workflow inactive

**Solutions:**
1. Check SMTP credentials in n8n
2. Verify workflow is "Active" (toggle in top right)
3. Check n8n execution log for errors

### Issue: "Timeout"

**Cause:** n8n taking too long or unreachable

**Solutions:**
1. Increase Lambda timeout (currently 30s)
2. Check n8n server performance
3. Simplify email template

## Monitoring & Logs

### Lambda Logs (CloudWatch)
```bash
# Via Serverless CLI
serverless logs -f orderPlacedProxy --tail

# Or AWS Console
CloudWatch → Log groups → /aws/lambda/inventory-n8n-proxy-order-placed-prod
```

### n8n Execution Logs
- n8n UI → Executions tab
- View each execution with full payload and errors

### React App Logs
- Browser DevTools → Console
- Look for `[n8n]` prefixed messages

## Cost Analysis

### AWS Lambda Free Tier
- 1M requests/month: FREE
- 400,000 GB-seconds: FREE

### Expected Usage (10,000 orders/month)
- Order Placed: 10,000 requests
- Order Picked: 10,000 requests
- Order Dispatched: 10,000 requests
- **Total: 30,000 requests/month**

**Monthly cost: $0.00** (well within free tier)

### After Free Tier (if you exceed 1M requests/month)
- $0.20 per 1M requests
- For 30k requests: ~$0.006/month

## Security Best Practices

1. **API Gateway:**
   - Enable API key authentication (optional)
   - Set up rate limiting (100 req/sec)

2. **Lambda:**
   - Use IAM roles, not hardcoded credentials
   - Store n8n URL in AWS SSM Parameter Store

3. **n8n:**
   - Keep on private network if possible
   - Use VPN or AWS VPC for Lambda → n8n communication
   - Enable basic auth on n8n webhooks

4. **React App:**
   - Don't expose n8n URL directly
   - Always go through Lambda proxy

## Alternative: Netlify Functions

If you don't want to use AWS Lambda, we can deploy the proxy as Netlify Functions instead. This keeps everything in one place (Netlify).

**Pros:**
- No AWS account needed
- Auto-deploys with your site
- Free tier: 125k requests/month

**Cons:**
- Slightly higher latency than Lambda
- Less flexible for future scaling

**Would you like me to create the Netlify Functions version instead?**
