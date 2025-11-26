"""
AWS Lambda Proxy for n8n Webhooks (Python)
Intelligently routes notification requests to appropriate n8n webhooks

Single Lambda function handles all notification types:
- order-placed
- order-picked
- order-dispatched

Routes based on:
1. Query parameter: ?type=order-placed
2. Path parameter: /order-placed
3. Payload field: {"notificationType": "order-placed"}
"""

import json
import os
import urllib3
from typing import Dict, Any, Optional

# Initialize HTTP client
http = urllib3.PoolManager()

# n8n webhook URLs from environment variables
N8N_WEBHOOKS = {
    'order-placed': os.environ.get('N8N_ORDER_PLACED_URL', ''),
    'order-picked': os.environ.get('N8N_ORDER_PICKED_URL', ''),
    'order-dispatched': os.environ.get('N8N_ORDER_DISPATCHED_URL', ''),
}

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',  # Update with your domain in production
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler

    Args:
        event: Lambda event object
        context: Lambda context object

    Returns:
        API Gateway response
    """
    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS preflight for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': '',
        }

    # Only allow POST
    if event.get('httpMethod') != 'POST':
        return error_response('Method not allowed', 405)

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))

        # Determine notification type and route to appropriate webhook
        notification_type = determine_notification_type(event, body)

        if not notification_type:
            return error_response('Could not determine notification type. Please specify via query parameter (?type=order-placed), path (/order-placed), or payload field (notificationType)', 400)

        # Get webhook URL for this notification type
        webhook_url = N8N_WEBHOOKS.get(notification_type)

        if not webhook_url:
            return error_response(f'No webhook configured for notification type: {notification_type}', 500)

        print(f"Routing {notification_type} to: {webhook_url}")

        # Forward request to n8n
        n8n_response = forward_to_n8n(webhook_url, body)

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'message': f'{notification_type} notification sent successfully',
                'notificationType': notification_type,
                'n8nResponse': n8n_response,
            }),
        }

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return error_response('Invalid JSON in request body', 400)

    except Exception as e:
        print(f"Error processing request: {e}")
        return error_response(f'Failed to send notification: {str(e)}', 500)


def determine_notification_type(event: Dict[str, Any], body: Dict[str, Any]) -> Optional[str]:
    """
    Determine notification type from multiple sources
    Priority: query parameter > path parameter > payload field

    Args:
        event: Lambda event object
        body: Parsed request body

    Returns:
        Notification type string or None
    """
    # 1. Check query string parameter: ?type=order-placed
    query_params = event.get('queryStringParameters') or {}
    if 'type' in query_params:
        notification_type = query_params['type']
        print(f"Notification type from query parameter: {notification_type}")
        return notification_type

    # 2. Check path parameter: /order-placed
    path = event.get('path', '')
    if path:
        # Extract notification type from path
        # Examples: /order-placed, /prod/order-picked, /dev/order-dispatched
        path_parts = [p for p in path.split('/') if p]

        # Look for known notification types in path
        for part in path_parts:
            if part in N8N_WEBHOOKS:
                print(f"Notification type from path: {part}")
                return part

    # 3. Check raw path (for API Gateway v2)
    raw_path = event.get('rawPath', '')
    if raw_path:
        for part in raw_path.split('/'):
            if part in N8N_WEBHOOKS:
                print(f"Notification type from rawPath: {part}")
                return part

    # 4. Check payload field: {"notificationType": "order-placed"}
    if 'notificationType' in body:
        notification_type = body['notificationType']
        print(f"Notification type from payload: {notification_type}")
        return notification_type

    # 5. Infer from payload structure
    notification_type = infer_from_payload(body)
    if notification_type:
        print(f"Notification type inferred from payload: {notification_type}")
        return notification_type

    return None


def infer_from_payload(body: Dict[str, Any]) -> Optional[str]:
    """
    Infer notification type from payload structure

    Args:
        body: Request payload

    Returns:
        Notification type or None
    """
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
    Forward request to n8n webhook

    Args:
        webhook_url: n8n webhook URL
        payload: Request payload

    Returns:
        n8n response

    Raises:
        Exception: If request fails
    """
    try:
        # Send POST request to n8n
        response = http.request(
            'POST',
            webhook_url,
            body=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
            },
            timeout=25.0,  # 25 second timeout (Lambda has 30s max)
        )

        print(f"n8n response status: {response.status}")

        if response.status >= 200 and response.status < 300:
            try:
                return json.loads(response.data.decode('utf-8'))
            except json.JSONDecodeError:
                return {'raw': response.data.decode('utf-8')}
        else:
            error_body = response.data.decode('utf-8')
            print(f"n8n error response: {error_body}")
            raise Exception(f'n8n webhook returned {response.status}: {error_body}')

    except urllib3.exceptions.TimeoutError:
        raise Exception('n8n webhook request timeout')

    except Exception as e:
        print(f"Error calling n8n webhook: {e}")
        raise


def error_response(message: str, status_code: int = 500) -> Dict[str, Any]:
    """
    Create error response

    Args:
        message: Error message
        status_code: HTTP status code

    Returns:
        API Gateway response
    """
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'success': False,
            'error': message,
        }),
    }
