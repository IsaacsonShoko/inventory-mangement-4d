# n8n Lambda Proxy Functions

## Overview

These Lambda functions act as HTTPS bridges to your self-hosted n8n instance (HTTP). This allows your Netlify-hosted React app to securely communicate with n8n without HTTPS certificate issues.

## Architecture

```
React App (HTTPS) → AWS Lambda (HTTPS) → n8n (HTTP self-hosted)
```

## Deployment Options

### Option 1: Serverless Framework (Recommended)

1. **Install Serverless Framework:**
   ```bash
   npm install -g serverless
   ```

2. **Configure AWS credentials:**
   ```bash
   serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET
   ```

3. **Set environment variables:**
   Create a `.env` file in the `lambda/` directory:
   ```env
   N8N_ORDER_PLACED_URL=http://your-n8n-ip:5678/webhook/order-placed
   N8N_ORDER_PICKED_URL=http://your-n8n-ip:5678/webhook/order-picked
   N8N_ORDER_DISPATCHED_URL=http://your-n8n-ip:5678/webhook/order-dispatched
   ```

4. **Deploy:**
   ```bash
   cd lambda
   serverless deploy
   ```

5. **Get your endpoints:**
   After deployment, you'll see output like:
   ```
   endpoints:
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-placed
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-picked
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-dispatched
   ```

### Option 2: AWS Console (Manual)

1. **Create Lambda function:**
   - Go to AWS Lambda console
   - Create function → Author from scratch
   - Runtime: Node.js 20.x
   - Copy code from `n8n-proxy.js`

2. **Set environment variables:**
   - Configuration → Environment variables
   - Add: `N8N_WEBHOOK_URL = http://your-n8n-ip:5678/webhook/order-placed`

3. **Create API Gateway:**
   - Add trigger → API Gateway
   - HTTP API
   - Security: Open (or API key if needed)
   - Path: `/order-placed`
   - Method: POST

4. **Enable CORS:**
   - API Gateway → CORS settings
   - Allow: `*` (or your Netlify domain)

5. **Repeat for other endpoints** (order-picked, order-dispatched)

### Option 3: AWS SAM

See `template.yaml` (if you want to create one) for infrastructure as code deployment.

## Environment Variables

Each Lambda function needs:

| Variable | Description | Example |
|----------|-------------|---------|
| `N8N_WEBHOOK_URL` | Full URL to your n8n webhook | `http://192.168.1.100:5678/webhook/order-placed` |

## Security Considerations

1. **Network Access:**
   - If n8n is on a private network, deploy Lambda in a VPC with access to that network
   - Configure VPC settings in `serverless.yml` if needed

2. **Authentication:**
   - Add API key authentication in API Gateway if needed
   - Add header validation in Lambda if required

3. **Rate Limiting:**
   - Configure throttling in API Gateway (e.g., 100 requests/second)

## Testing

Test locally using AWS SAM:
```bash
sam local start-api
curl -X POST http://localhost:3000/order-placed -d '{"orderId":"ORD-0001"}'
```

Or test deployed endpoint:
```bash
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/order-placed \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-0001",
    "orderedBy": "test@example.com",
    "totalItems": 2
  }'
```

## Monitoring

View logs in CloudWatch:
```bash
serverless logs -f orderPlacedProxy --tail
```

Or in AWS Console:
- CloudWatch → Log groups → `/aws/lambda/inventory-n8n-proxy-order-placed-prod`

## Cost Estimation

AWS Lambda pricing (as of 2024):
- First 1M requests/month: Free
- After: $0.20 per 1M requests
- Compute: $0.0000166667 per GB-second

Expected monthly cost for typical usage (< 10k orders/month): **~$0.00 (Free tier)**

## Troubleshooting

### Lambda can't reach n8n

**Problem:** Timeout errors when calling n8n

**Solutions:**
1. Check n8n is accessible from internet (if Lambda not in VPC)
2. If n8n is on local network, deploy Lambda in VPC with VPN/Direct Connect
3. Use AWS VPN or expose n8n with ngrok temporarily for testing

### CORS errors

**Problem:** Browser blocks requests from Netlify to Lambda

**Solution:**
- Ensure Lambda returns proper CORS headers (already in code)
- Verify API Gateway CORS settings enabled

### 502 Bad Gateway

**Problem:** n8n returned an error

**Solution:**
- Check CloudWatch logs for n8n response
- Test n8n webhook directly with curl
- Verify n8n workflow is active

## Alternatives to Lambda

If you don't want to use Lambda, you can:

1. **Use Cloudflare Workers** (similar to Lambda, easier setup)
2. **Use ngrok** to expose n8n temporarily (not for production)
3. **Set up HTTPS on n8n** with Let's Encrypt and skip proxy
4. **Use Netlify Functions** (similar to Lambda, integrated with Netlify)

## Update React App

After deployment, update your `.env.production`:
```env
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://abc123.execute-api.us-east-1.amazonaws.com/order-placed
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://abc123.execute-api.us-east-1.amazonaws.com/order-picked
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=https://abc123.execute-api.us-east-1.amazonaws.com/order-dispatched
```

No code changes needed in the app - it will use these URLs automatically!
