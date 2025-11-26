# n8n Lambda Proxy Function (Python)

## Overview

This single Lambda function acts as an intelligent HTTPS bridge to your self-hosted n8n instance (HTTP). It routes notifications to the appropriate n8n webhook based on the notification type.

## Architecture

```
React App (HTTPS)
    ↓
AWS Lambda (HTTPS) - Intelligent Router
    ├─→ n8n /order-placed webhook (HTTP)
    ├─→ n8n /order-picked webhook (HTTP)
    └─→ n8n /order-dispatched webhook (HTTP)
```

## Features

✅ **Single Lambda function** - Routes all notification types
✅ **Multiple routing methods** - Path, query param, or payload-based
✅ **Auto-detection** - Infers notification type from payload structure
✅ **Python 3.12** - Fast cold start, easy to maintain
✅ **No external dependencies** - Uses built-in urllib3

## Deployment Options

### Option 1: Serverless Framework (Recommended)

1. **Install Serverless Framework and Python plugin:**
   ```bash
   npm install -g serverless
   npm install --save-dev serverless-python-requirements
   ```

2. **Configure AWS credentials:**
   ```bash
   serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET
   ```

3. **Configure n8n webhook URLs:**

   **IMPORTANT:** Environment variables in Lambda are configured via `serverless.yml`, NOT `.env` files.

   **Edit `serverless.yml`** and update the `environment` section:
   ```yaml
   environment:
     N8N_ORDER_PLACED_URL: http://192.168.1.100:5678/webhook/order-placed
     N8N_ORDER_PICKED_URL: http://192.168.1.100:5678/webhook/order-picked
     N8N_ORDER_DISPATCHED_URL: http://192.168.1.100:5678/webhook/order-dispatched
   ```

   **Replace `192.168.1.100`** with your n8n server IP address.

   > **Note:** The `.env` file approach is only for local testing. Serverless Framework reads from `serverless.yml` when deploying to AWS.

4. **Install Python plugin (in lambda/ directory):**
   ```bash
   cd lambda
   npm install
   ```

5. **Deploy:**
   ```bash
   serverless deploy
   ```

6. **Get your endpoints:**
   After deployment, you'll see output like:
   ```
   endpoints:
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-placed
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-picked
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/order-dispatched
     POST - https://abc123.execute-api.us-east-1.amazonaws.com/notify
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

### How Environment Variables Work in Lambda

Unlike local development where you use `.env` files, AWS Lambda gets environment variables from:

1. **`serverless.yml`** - Defined during deployment
2. **AWS Console** - Can be updated after deployment (Lambda → Configuration → Environment variables)
3. **AWS Systems Manager (SSM)** - Secure parameter store (recommended for sensitive data)

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `N8N_ORDER_PLACED_URL` | n8n webhook for order placed | `http://192.168.1.100:5678/webhook/order-placed` |
| `N8N_ORDER_PICKED_URL` | n8n webhook for order picked | `http://192.168.1.100:5678/webhook/order-picked` |
| `N8N_ORDER_DISPATCHED_URL` | n8n webhook for order dispatched | `http://192.168.1.100:5678/webhook/order-dispatched` |

### Configuration Methods

#### Method 1: serverless.yml (Recommended for Non-Sensitive Data)

Edit `serverless.yml`:
```yaml
provider:
  environment:
    N8N_ORDER_PLACED_URL: http://192.168.1.100:5678/webhook/order-placed
    N8N_ORDER_PICKED_URL: http://192.168.1.100:5678/webhook/order-picked
    N8N_ORDER_DISPATCHED_URL: http://192.168.1.100:5678/webhook/order-dispatched
```

Then deploy:
```bash
serverless deploy
```

#### Method 2: AWS Console (Quick Updates)

1. Go to AWS Lambda Console
2. Select your function: `inventory-n8n-proxy-prod`
3. Configuration → Environment variables
4. Add/Edit variables
5. Save

**Advantage:** No redeployment needed, changes take effect immediately.

#### Method 3: AWS SSM Parameter Store (Most Secure)

For sensitive values or shared configurations:

1. **Store in SSM:**
   ```bash
   aws ssm put-parameter \
     --name "/n8n/order-placed-url" \
     --value "http://192.168.1.100:5678/webhook/order-placed" \
     --type "String"
   ```

2. **Reference in serverless.yml:**
   ```yaml
   provider:
     environment:
       N8N_ORDER_PLACED_URL: ${ssm:/n8n/order-placed-url}
       N8N_ORDER_PICKED_URL: ${ssm:/n8n/order-picked-url}
       N8N_ORDER_DISPATCHED_URL: ${ssm:/n8n/order-dispatched-url}
   ```

3. **Add IAM permission:**
   ```yaml
   provider:
     iam:
       role:
         statements:
           - Effect: Allow
             Action:
               - ssm:GetParameter
             Resource: arn:aws:ssm:*:*:parameter/n8n/*
   ```

**Advantage:** Encrypted, centralized, can be rotated without code changes.

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
