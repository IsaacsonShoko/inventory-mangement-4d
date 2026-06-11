/**
 * Netlify Function: Order Placed Notification
 * Sends a confirmation email to the user who placed the order.
 *
 * Replaces n8n InventoryStockOrder-Supabase flow (email-only — DB inserts
 * are already performed app-side via services-orders.ts).
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

const buildItemsHtml = (items) => {
  if (!items || items.length === 0) return '<tr><td>No items</td></tr>';
  return items
    .map(
      (i) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(i.deviceType || i.itemName)}</strong><br/>
            <span style="color:#666;font-size:13px;">Qty: ${escapeHtml(i.quantityOrdered ?? i.quantity ?? 1)}</span>
          </td>
        </tr>`,
    )
    .join('');
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const data = payload.body || payload;

    const orderId = data.orderId || 'Unknown';
    const orderedBy = data.orderedBy || data.formData?.orderedBy;
    const items = data.items || data.cartItems || [];

    const itemsHtml = buildItemsHtml(items);

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <table width="600" style="background:#fff;border-radius:8px;margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#9C0DD9,#7209B7);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;">Order Received</h1>
    </td></tr>
    <tr><td style="padding:30px;">
      <p>Hi,</p>
      <p>Your order <strong>${escapeHtml(orderId)}</strong> has been received and is awaiting picking.</p>
      <p><strong>Date:</strong> ${escapeHtml(data.dateOrdered || '')}</p>
      <p><strong>Total items:</strong> ${escapeHtml(data.totalItems ?? items.length)}</p>
      <h3>Items</h3>
      <table width="100%">${itemsHtml}</table>
    </td></tr>
    <tr><td style="background:#f8f9fa;padding:20px;text-align:center;color:#999;font-size:13px;">
      4D Logistics Inventory Management System
    </td></tr>
  </table></body></html>`;

    const result = await sendEmail({
      to: orderedBy,
      subject: `Order Received - ${orderId}`,
      html,
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, message: 'Order placed notification sent', emailId: result.id }),
    };
  } catch (error) {
    console.error('[order-placed] Error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
