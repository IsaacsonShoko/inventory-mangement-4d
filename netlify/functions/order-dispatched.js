/**
 * Netlify Function: Order Dispatched Notification
 * Sends an "Order Dispatched" or "Order Ready for Collection" email to the
 * recipient (falls back to orderedBy if no recipient email).
 *
 * Replaces n8n OrderDispatched-Supabase flow (email-only — unique_orders
 * dispatch_status/method/waybill updates happen app-side).
 *
 * Env vars:
 *   RESEND_API_KEY  - Resend API key
 *   FROM_EMAIL      - From address (e.g. admin@4danalytics.co.za)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'admin@4danalytics.co.za';
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  if (!to) throw new Error('No recipient email address');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${errBody}`);
  }
  return res.json();
};

const buildItemsHtml = (items) =>
  (items || [])
    .map(
      (i) => `
        <tr>
          <td style="padding:15px 0;border-bottom:1px solid #eee;">
            <h3 style="margin:0 0 5px;color:#333;font-size:16px;">${escapeHtml(i.deviceType)}</h3>
            <p style="margin:0;color:#666;font-size:13px;">Qty: ${escapeHtml(i.quantityOrdered ?? i.quantity ?? 1)}</p>
          </td>
        </tr>`,
    )
    .join('');

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const data = payload.body || payload;

    const orderId = data.orderId || 'Unknown';
    const dispatchMethod = data.metadata?.dispatchMethod || data.dispatchMethod;
    const waybillNumber = data.metadata?.waybillNumber || data.waybillNumber;
    const warehouseFulfilling = data.warehouseFulfilling || data.metadata?.warehouseFulfilling;
    const deliveryParty = data.deliveryParty;

    const isCollection = dispatchMethod === 'Collection' || dispatchMethod === 'Pickup';
    const headerTitle = isCollection ? 'Order Ready for Collection' : 'Order Dispatched';
    const alertMessage = isCollection
      ? `Please collect your order from: ${escapeHtml(warehouseFulfilling || 'the warehouse')}`
      : `Your order will be dispatched via ${escapeHtml(deliveryParty || 'courier')}`;

    const recipientEmail = data.recipientEmail || data.orderedBy;
    const recipientName = data.recipientName || 'Customer';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <table width="600" style="background:#fff;border-radius:8px;margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#9C0DD9,#7209B7);padding:40px 30px;text-align:center;">
      <h1 style="margin:0;color:#fff;">${escapeHtml(headerTitle)}</h1>
    </td></tr>
    <tr><td style="padding:30px;">
      <p>Hi <strong>${escapeHtml(recipientName)}</strong>,</p>
      <p>${alertMessage}</p>
      <table width="100%" style="background:#f8f9fa;border-radius:6px;margin:20px 0;">
        <tr><td style="padding:20px;">
          <p><strong>Order:</strong> ${escapeHtml(orderId)}</p>
          <p><strong>Date:</strong> ${escapeHtml(data.dateOrdered || '')}</p>
          <p><strong>Warehouse:</strong> ${escapeHtml(warehouseFulfilling || 'N/A')}</p>
          ${waybillNumber ? `<p><strong>Waybill:</strong> ${escapeHtml(waybillNumber)}</p>` : ''}
        </td></tr>
      </table>
      <h3>Items</h3>
      <table width="100%">${buildItemsHtml(data.items)}</table>
    </td></tr>
    <tr><td style="background:#f8f9fa;padding:25px;text-align:center;color:#999;font-size:13px;">
      4D Logistics Inventory Management System
    </td></tr>
  </table></body></html>`;

    const result = await sendEmail({
      to: recipientEmail,
      subject: `${headerTitle} - ${orderId}`,
      html,
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, message: 'Order dispatched notification sent', emailId: result.id }),
    };
  } catch (error) {
    console.error('[order-dispatched] Error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
