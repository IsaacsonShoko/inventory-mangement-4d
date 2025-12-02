"""
Netlify Function: n8n Notification Proxy
Routes notification requests to appropriate n8n webhooks (HTTP)

Usage:
  POST /.netlify/functions/n8n-proxy/order-placed
  POST /.netlify/functions/n8n-proxy/order-picked
  POST /.netlify/functions/n8n-proxy/order-dispatched
  POST /.netlify/functions/n8n-proxy?type=order-placed

Environment Variables (set in Netlify Dashboard):
  N8N_ORDER_PLACED_URL
  N8N_ORDER_PICKED_URL
  N8N_ORDER_DISPATCHED_URL
"""

import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

# n8n webhook URLs from Netlify environment variables
N8N_WEBHOOKS = {
    'order-placed': os.environ.get('N8N_ORDER_PLACED_URL', ''),
    'order-picked': os.environ.get('N8N_ORDER_PICKED_URL', ''),
    'chat': os.environ.get('VITE_N8N_CHAT_WEBHOOK_URL', ''), 
    'order-dispatched': os.environ.get('N8N_ORDER_DISPATCHED_URL', ''),
}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Netlify Function handler

    Args:
        event: Netlify event object
        context: Netlify context object

    Returns:
        Response object with statusCode, headers, and body
    """
    print(f"Received event: {json.dumps(event)}")

    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    }

    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': '',
        }

    # Only allow POST
    if event.get('httpMethod') != 'POST':
        return error_response('Method not allowed', 405, headers)

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))

        # Determine notification type
        notification_type = determine_notification_type(event, body)

        if not notification_type:
            return error_response(
                'Could not determine notification type. Use path (/order-placed) or query param (?type=order-placed)',
                400,
                headers
            )

        # Get webhook URL
        webhook_url = N8N_WEBHOOKS.get(notification_type)

        if not webhook_url:
            return error_response(
                f'No webhook configured for: {notification_type}. Set N8N_{notification_type.upper().replace("-", "_")}_URL in Netlify environment variables.',
                500,
                headers
            )

        print(f"Routing {notification_type} to: {webhook_url}")

        # Forward to n8n
        n8n_response = forward_to_n8n(webhook_url, body)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f'{notification_type} notification sent',
                'notificationType': notification_type,
                'n8nResponse': n8n_response,
            }),
        }

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return error_response('Invalid JSON in request body', 400, headers)

    except Exception as e:
        print(f"Error: {e}")
        return error_response(f'Failed to send notification: {str(e)}', 500, headers)


def determine_notification_type(event: Dict[str, Any], body: Dict[str, Any]) -> Optional[str]:
    """
    Determine notification type from path, query params, or payload

    Priority: query param > path > payload inference
    """
    # 1. Check query string: ?type=order-placed
    query_params = event.get('queryStringParameters') or {}
    if 'type' in query_params:
        return query_params['type']

    # 2. Check path: /.netlify/functions/n8n-proxy/order-placed
    path = event.get('path', '')
    if path:
        # Extract last segment after /n8n-proxy/
        parts = [p for p in path.split('/') if p]

        # Look for notification type in path
        for part in parts:
            if part in N8N_WEBHOOKS:
                return part

    # 3. Check payload field
    if 'notificationType' in body:
        return body['notificationType']

    # 4. Infer from payload structure
    return infer_from_payload(body)


def infer_from_payload(body: Dict[str, Any]) -> Optional[str]:
    """Infer notification type from payload structure"""
    # Order placed indicators
    if 'cartItems' in body and 'formData' in body:
        return 'order-placed'

    # Order picked indicators
    if 'pickedItems' in body or ('metadata' in body and 'pickerEmail' in body.get('metadata', {})):
        return 'order-picked'

    # Order dispatched indicators
    if 'metadata' in body and 'dispatchMethod' in body.get('metadata', {}):
        return 'order-dispatched'

    if 'waybillNumber' in body or body.get('metadata', {}).get('waybillNumber'):
        return 'order-dispatched'

    return None


def forward_to_n8n(webhook_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Forward request to n8n webhook using urllib

    Args:
        webhook_url: n8n webhook URL (HTTP)
        payload: Request payload

    Returns:
        n8n response data

    Raises:
        Exception: If request fails
    """
    try:
        # Wrap payload in {"body": ...} format to match n8n webhook expectations
        # n8n workflows expect: $json.body.orderId, $json.body.items, etc.
        wrapped_payload = {
            'body': payload
        }

        # Prepare request
        data = json.dumps(wrapped_payload).encode('utf-8')
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        # Send request with timeout
        with urllib.request.urlopen(req, timeout=25) as response:
            response_data = response.read().decode('utf-8')
            print(f"n8n response status: {response.status}")

            try:
                return json.loads(response_data)
            except json.JSONDecodeError:
                return {'raw': response_data}

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"n8n HTTP error {e.code}: {error_body}")
        raise Exception(f'n8n webhook returned {e.code}: {error_body}')

    except urllib.error.URLError as e:
        print(f"URL error: {e.reason}")
        raise Exception(f'Failed to connect to n8n: {e.reason}')

    except Exception as e:
        print(f"Error calling n8n: {e}")
        raise


def error_response(message: str, status_code: int, headers: Dict[str, str]) -> Dict[str, Any]:
    """Create error response"""
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps({
            'success': False,
            'error': message,
        }),
    }
