/**
 * Netlify Function: Order Picked Notification
 * Sends a "Your order has been picked" email to the user who ordered.
 *
 * Replaces n8n OrderPicked-Supabase flow (email-only — dispatch_log writes
 * and unique_orders pick_status updates happen app-side).
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

const buildPickedItemsHtml = (pickedItems) => {
  if (!pickedItems || pickedItems.length === 0) return '<tr><td>No items</td></tr>';
  return pickedItems
    .map((item) => {
      const serials = [
        item.terminalSerialNumber && `Terminal: ${item.terminalSerialNumber}`,
        item.cradleSerialNumber && `Cradle: ${item.cradleSerialNumber}`,
        item.chargerSerialNumber && `Charger: ${item.chargerSerialNumber}`,
        item.cashConnectSerialNumber && `CashConnect: ${item.cashConnectSerialNumber}`,
      ]
        .filter(Boolean)
        .map(escapeHtml)
        .join('<br/>');

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(item.deviceType)}</strong><br/>
            <span style="color:#666;font-size:13px;">Qty: ${escapeHtml(item.quantity)} · Status: ${escapeHtml(item.pickStatus)}</span>
            ${serials ? `<div style="margin-top:6px;font-size:12px;color:#444;">${serials}</div>` : ''}
          </td>
        </tr>`;
    })
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
    const orderedBy = data.orderedBy;
    const pickedItems = data.pickedItems || [];
    const pickedAt = data.metadata?.pickedAt || new Date().toISOString();

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <table width="600" style="background:#fff;border-radius:8px;margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#9C0DD9,#7209B7);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;">Order Picked</h1>
    </td></tr>
    <tr><td style="padding:30px;">
      <p>Hi,</p>
      <p>Your order <strong>${escapeHtml(orderId)}</strong> has been picked and is ready for dispatch.</p>
      <p><strong>Picked at:</strong> ${escapeHtml(new Date(pickedAt).toLocaleString())}</p>
      <h3>Picked Items</h3>
      <table width="100%">${buildPickedItemsHtml(pickedItems)}</table>
    </td></tr>
    <tr><td style="background:#f8f9fa;padding:20px;text-align:center;color:#999;font-size:13px;">
      4D Logistics Inventory Management System
    </td></tr>
  </table></body></html>`;

    const result = await sendEmail({
      to: orderedBy,
      subject: `Your Order has been picked - ${orderId}`,
      html,
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, message: 'Order picked notification sent', emailId: result.id }),
    };
  } catch (error) {
    console.error('[order-picked] Error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
