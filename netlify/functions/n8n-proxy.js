/**
 * Netlify Function: n8n Notification Proxy
 * Routes notification requests to appropriate n8n webhooks (HTTP)
 *
 * Usage:
 *   POST /.netlify/functions/n8n-proxy/order-placed
 *   POST /.netlify/functions/n8n-proxy/order-picked
 *   POST /.netlify/functions/n8n-proxy/order-dispatched
 *   POST /.netlify/functions/n8n-proxy?type=order-placed
 *
 * Environment Variables (set in Netlify Dashboard):
 *   N8N_ORDER_PLACED_URL
 *   N8N_ORDER_PICKED_URL
 *   N8N_ORDER_DISPATCHED_URL
 */

// n8n webhook URLs from Netlify environment variables
const N8N_WEBHOOKS = {
  'order-placed': process.env.N8N_ORDER_PLACED_URL || '',
  'order-picked': process.env.N8N_ORDER_PICKED_URL || '',
  'order-dispatched': process.env.N8N_ORDER_DISPATCHED_URL || '',
};

/**
 * Netlify Function handler
 */
export async function handler(event, context) {
  console.log('Received event:', JSON.stringify(event));

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    return errorResponse('Method not allowed', 405, headers);
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Determine notification type
    const notificationType = determineNotificationType(event, body);

    if (!notificationType) {
      return errorResponse(
        'Could not determine notification type. Use path (/order-placed) or query param (?type=order-placed)',
        400,
        headers
      );
    }

    // Get webhook URL
    const webhookUrl = N8N_WEBHOOKS[notificationType];

    if (!webhookUrl) {
      return errorResponse(
        `No webhook configured for: ${notificationType}. Set N8N_${notificationType.toUpperCase().replace(/-/g, '_')}_URL in Netlify environment variables.`,
        500,
        headers
      );
    }

    console.log(`Routing ${notificationType} to: ${webhookUrl}`);

    // Forward to n8n
    const n8nResponse = await forwardToN8n(webhookUrl, body);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${notificationType} notification sent`,
        notificationType,
        n8nResponse,
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return errorResponse(`Failed to send notification: ${error.message}`, 500, headers);
  }
}

/**
 * Determine notification type from path, query params, or payload
 * Priority: query param > path > payload inference
 */
function determineNotificationType(event, body) {
  // 1. Check query string: ?type=order-placed
  const queryParams = event.queryStringParameters || {};
  if (queryParams.type) {
    return queryParams.type;
  }

  // 2. Check path: /.netlify/functions/n8n-proxy/order-placed
  const path = event.path || '';
  if (path) {
    // Extract last segment after /n8n-proxy/
    const parts = path.split('/').filter(p => p);

    // Look for notification type in path
    for (const part of parts) {
      if (N8N_WEBHOOKS.hasOwnProperty(part)) {
        return part;
      }
    }
  }

  // 3. Check payload field
  if (body.notificationType) {
    return body.notificationType;
  }

  // 4. Infer from payload structure
  return inferFromPayload(body);
}

/**
 * Infer notification type from payload structure
 */
function inferFromPayload(body) {
  // Order placed indicators
  if (body.cartItems && body.formData) {
    return 'order-placed';
  }

  // Order picked indicators
  if (body.pickedItems || (body.metadata && body.metadata.pickerEmail)) {
    return 'order-picked';
  }

  // Order dispatched indicators
  if (body.metadata && body.metadata.dispatchMethod) {
    return 'order-dispatched';
  }

  if (body.waybillNumber || (body.metadata && body.metadata.waybillNumber)) {
    return 'order-dispatched';
  }

  return null;
}

/**
 * Forward request to n8n webhook
 */
async function forwardToN8n(webhookUrl, payload) {
  try {
    // Wrap payload in {"body": ...} format to match n8n webhook expectations
    // n8n workflows expect: $json.body.orderId, $json.body.items, etc.
    const wrappedPayload = {
      body: payload
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wrappedPayload),
      signal: AbortSignal.timeout(25000) // 25 second timeout
    });

    console.log(`n8n response status: ${response.status}`);

    const responseData = await response.text();

    try {
      return JSON.parse(responseData);
    } catch {
      return { raw: responseData };
    }

  } catch (error) {
    console.error('Error calling n8n:', error);

    if (error.name === 'AbortError') {
      throw new Error('n8n webhook timeout after 25 seconds');
    }

    throw new Error(`Failed to connect to n8n: ${error.message}`);
  }
}

/**
 * Create error response
 */
function errorResponse(message, statusCode, headers) {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: false,
      error: message,
    }),
  };
}
