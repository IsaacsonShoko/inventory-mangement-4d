# Netlify Functions Setup for n8n Proxy

## Overview

This is **way simpler** than AWS Lambda. No AWS account, no serverless.yml, no CLI tools. Just git push and it works.

## Architecture

```
React App (Netlify HTTPS)
    ↓
Netlify Function (HTTPS) - Auto-deployed with your site
    ↓
Your n8n Server (HTTP)
    ↓
Email Notifications
```

## How It Works

1. **Function lives in your repo**: `netlify/functions/n8n-proxy.py`
2. **Auto-deploys with your site**: Every git push deploys the function
3. **Routes to n8n**: Function calls your n8n server (HTTP) on your behalf

## Setup (5 Minutes)

### Step 1: Set Environment Variables in Netlify

1. **Go to Netlify Dashboard**
2. **Your site** → Site settings → Environment variables
3. **Add these 3 variables:**

   | Variable Name | Value | Example |
   |---------------|-------|---------|
   | `N8N_ORDER_PLACED_URL` | Your n8n webhook URL | `http://192.168.1.100:5678/webhook/order-placed` |
   | `N8N_ORDER_PICKED_URL` | Your n8n webhook URL | `http://192.168.1.100:5678/webhook/order-picked` |
   | `N8N_ORDER_DISPATCHED_URL` | Your n8n webhook URL | `http://192.168.1.100:5678/webhook/order-dispatched` |

4. **Important:** Replace `192.168.1.100` with your n8n server's IP address or domain

### Step 2: Update Your App's Environment Variables

Still in Netlify Dashboard → Environment variables, **update these URLs:**

| Variable Name | New Value | Format |
|---------------|-----------|--------|
| `VITE_N8N_ORDER_PLACED_WEBHOOK_URL` | `https://your-site.netlify.app/.netlify/functions/n8n-proxy/order-placed` | |
| `VITE_N8N_ORDER_PICKED_WEBHOOK_URL` | `https://your-site.netlify.app/.netlify/functions/n8n-proxy/order-picked` | |
| `VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL` | `https://your-site.netlify.app/.netlify/functions/n8n-proxy/order-dispatched` | |

**Replace `your-site.netlify.app`** with your actual Netlify site URL.

### Step 3: Deploy

```bash
git add -A
git commit -m "Add Netlify Functions for n8n proxy"
git push
```

**That's it!** Netlify automatically:
- Detects the function in `netlify/functions/`
- Deploys it with your site
- Creates the endpoint: `https://your-site.netlify.app/.netlify/functions/n8n-proxy`

### Step 4: Test

After deployment (takes ~2 minutes), test with curl:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/n8n-proxy/order-placed \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-0001",
    "orderedBy": "test@example.com",
    "totalItems": 2,
    "cartItems": [{"itemName": "Test Device", "quantity": 2}],
    "formData": {"itemCategory": "Modems"}
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "order-placed notification sent",
  "notificationType": "order-placed"
}
```

## Function URLs

After deployment, your function is available at:

**Base URL:**
```
https://your-site.netlify.app/.netlify/functions/n8n-proxy
```

**With routing:**
- `POST /.netlify/functions/n8n-proxy/order-placed`
- `POST /.netlify/functions/n8n-proxy/order-picked`
- `POST /.netlify/functions/n8n-proxy/order-dispatched`

**With query parameter:**
- `POST /.netlify/functions/n8n-proxy?type=order-placed`

**Cleaner URL (via redirect in netlify.toml):**
- `POST /api/notify/order-placed`
- `POST /api/notify/order-picked`
- `POST /api/notify/order-dispatched`

## Advantages Over AWS Lambda

| Feature | Netlify Functions | AWS Lambda |
|---------|-------------------|------------|
| **Setup complexity** | Add file + git push | serverless.yml, AWS CLI, credentials |
| **Deployment** | Auto with site | Manual or CI/CD |
| **Environment variables** | Netlify Dashboard | AWS Console or serverless.yml |
| **Cost** | FREE (125k requests/month) | FREE (1M requests/month) |
| **Logs** | Netlify Dashboard → Functions | CloudWatch (separate login) |
| **Updates** | Git push | Re-run serverless deploy |

## Monitoring & Logs

### View Function Logs

1. **Netlify Dashboard** → Site → Functions
2. Click on **n8n-proxy**
3. See real-time logs

### Test Function in Dashboard

1. Go to Functions tab
2. Click on function
3. Use "Test" button with sample payload

## Troubleshooting

### Function not found (404)

**Cause:** Function not deployed yet

**Solution:**
- Check Netlify deploy log for errors
- Verify file is at: `netlify/functions/n8n-proxy.py`
- Wait 2-3 minutes after push

### "No webhook configured" error

**Cause:** Environment variables not set

**Solution:**
1. Go to Site settings → Environment variables
2. Add `N8N_ORDER_PLACED_URL`, `N8N_ORDER_PICKED_URL`, `N8N_ORDER_DISPATCHED_URL`
3. Trigger redeploy (Site → Deploys → Trigger deploy)

### "Failed to connect to n8n"

**Cause:** n8n server unreachable from Netlify

**Solutions:**
1. **If n8n is on local network (192.168.x.x):**
   - Netlify Functions run on Netlify's servers (cloud)
   - They **cannot** reach your local network
   - **Options:**
     - Expose n8n to internet (use ngrok temporarily, or proper domain)
     - Set up VPN/tunnel
     - Use AWS Lambda in VPC instead

2. **If n8n has public IP/domain:**
   - Check firewall allows inbound connections
   - Verify URL is correct

### Timeout errors

**Cause:** n8n taking too long (>26s)

**Solution:**
- Simplify n8n workflow
- Remove unnecessary nodes
- Check n8n server performance

## Network Requirements

**Important:** Netlify Functions run in the cloud, not on your local machine.

### If n8n is on local network:
- ❌ **Won't work** - Netlify can't reach `192.168.x.x` or `localhost`
- ✅ **Solutions:**
  - Use ngrok: `ngrok http 5678` → gives public URL
  - Set up domain with port forwarding
  - Use Cloudflare Tunnel
  - Deploy n8n to cloud (DigitalOcean, etc.)

### If n8n has public IP/domain:
- ✅ **Works perfectly** - Netlify Functions can reach any public URL

## Local Testing

To test the function locally before deploying:

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Set environment variables in `.env`:**
   ```env
   N8N_ORDER_PLACED_URL=http://localhost:5678/webhook/order-placed
   N8N_ORDER_PICKED_URL=http://localhost:5678/webhook/order-picked
   N8N_ORDER_DISPATCHED_URL=http://localhost:5678/webhook/order-dispatched
   ```

3. **Run dev server:**
   ```bash
   netlify dev
   ```

4. **Test function:**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/n8n-proxy/order-placed \
     -H "Content-Type: application/json" \
     -d '{"orderId": "ORD-0001"}'
   ```

## Cost

**Free tier:**
- 125,000 function invocations per month
- 100 hours of function runtime per month

**For 10,000 orders/month:**
- Order placed: 10,000 invocations
- Order picked: 10,000 invocations
- Order dispatched: 10,000 invocations
- **Total: 30,000 invocations/month**

**Monthly cost: $0** (well within free tier)

## Next Steps

After setup:
1. ✅ Place a test order in your app
2. ✅ Verify email received
3. ✅ Check Netlify function logs
4. ✅ Check n8n execution history

## Updating the Function

Just edit `netlify/functions/n8n-proxy.py` and push:
```bash
git add netlify/functions/n8n-proxy.py
git commit -m "Update n8n proxy logic"
git push
```

Netlify automatically redeploys!
