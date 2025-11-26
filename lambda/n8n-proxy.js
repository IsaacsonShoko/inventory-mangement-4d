/**
 * AWS Lambda Proxy for n8n Webhooks
 * Bridges HTTPS (from React app) to HTTP (self-hosted n8n)
 *
 * Deploy this as 3 separate Lambda functions:
 * 1. order-placed-proxy
 * 2. order-picked-proxy
 * 3. order-dispatched-proxy
 *
 * Or use a single function with path-based routing (API Gateway routes)
 */

const https = require('http'); // Use http for your self-hosted n8n

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // CORS headers for OPTIONS preflight
  const headers = {
    'Access-Control-Allow-Origin': '*', // Update with your domain in production
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse incoming payload
    const payload = JSON.parse(event.body || '{}');

    // Determine which n8n webhook to call based on path or environment variable
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL environment variable not set');
    }

    console.log('Forwarding to n8n:', n8nWebhookUrl);

    // Forward request to self-hosted n8n
    const n8nResponse = await forwardToN8n(n8nWebhookUrl, payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        n8nResponse,
      }),
    };
  } catch (error) {
    console.error('Error forwarding to n8n:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to send notification',
      }),
    };
  }
};

/**
 * Forward request to n8n webhook
 */
function forwardToN8n(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 25000, // 25 second timeout (Lambda has 30s max by default)
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('n8n response status:', res.statusCode);
        console.log('n8n response body:', data);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ raw: data });
          }
        } else {
          reject(new Error(`n8n webhook returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('n8n webhook request timeout'));
    });

    // Send payload
    req.write(JSON.stringify(payload));
    req.end();
  });
}
