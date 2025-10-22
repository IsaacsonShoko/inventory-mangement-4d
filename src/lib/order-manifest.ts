import { format } from 'date-fns';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface ManifestItemRow {
  deviceType: string;
  serialNumber?: string | null;
  packageReference?: string | null;
  chargerIncluded?: boolean | null;
  cablesIncluded?: boolean | null;
}

export interface ManifestPayload {
  orderNumber: string;
  orderDate?: string | null;
  manifestDate?: Date;
  totalItems: number;
  waybillNumber?: string | null;
  customerName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  contactNumber?: string | null;
  deliveryInstructions?: string | null;
  items: ManifestItemRow[];
}

const buildInventoryRows = (items: ManifestItemRow[]): string => {
  if (!items.length) {
    return `<tr style="background-color: #ffffff;">
      <td colspan="5" style="color: #999999; font-size: 13px; padding: 12px 8px; border: 1px solid #e0e0e0; text-align: center;">
        No dispatch items were recorded.
      </td>
    </tr>`;
  }

  return items
    .map((item, index) => {
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      const serial = item.serialNumber ? escapeHtml(item.serialNumber) : '—';
      const pkg = item.packageReference ? escapeHtml(item.packageReference) : '—';
      const charger = item.chargerIncluded ? '✓' : '✗';
      const cables = item.cablesIncluded ? '✓' : '✗';

      return `<tr style="background-color: ${rowColor};">
        <td style="color: #333333; font-size: 13px; padding: 10px 8px; border: 1px solid #e0e0e0;">${escapeHtml(
          item.deviceType || 'Unknown device',
        )}</td>
        <td style="color: #333333; font-size: 13px; padding: 10px 8px; border: 1px solid #e0e0e0; font-family: monospace;">${serial}</td>
        <td style="color: #333333; font-size: 13px; padding: 10px 8px; border: 1px solid #e0e0e0;">${pkg}</td>
        <td style="color: ${item.chargerIncluded ? '#2e7d32' : '#d32f2f'}; font-size: 13px; padding: 10px 8px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${charger}</td>
        <td style="color: ${item.cablesIncluded ? '#2e7d32' : '#d32f2f'}; font-size: 13px; padding: 10px 8px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${cables}</td>
      </tr>`;
    })
    .join('');
};

const buildManifestHtml = (payload: ManifestPayload): string => {
  const manifestDate = payload.manifestDate ? format(payload.manifestDate, 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');
  const orderDate = payload.orderDate ? escapeHtml(payload.orderDate) : '—';
  const orderNumber = escapeHtml(payload.orderNumber || 'Unknown');
  const totalItems = payload.totalItems ?? 0;
  const waybill = payload.waybillNumber ? escapeHtml(payload.waybillNumber) : '—';
  const customerName = payload.customerName ? escapeHtml(payload.customerName) : '—';
  const addressLine1 = payload.addressLine1 ? escapeHtml(payload.addressLine1) : '—';
  const addressLine2 = payload.addressLine2 ? escapeHtml(payload.addressLine2) : '';
  const contactNumber = payload.contactNumber ? escapeHtml(payload.contactNumber) : '—';
  const deliveryInstructions = payload.deliveryInstructions ? escapeHtml(payload.deliveryInstructions) : '—';

  const itemsTableRows = buildInventoryRows(payload.items);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Manifest</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #9C0DD9 0%, #7209B7 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Order Manifest 📋</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">Delivery Documentation &amp; Handoff Form</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="5" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Order Number:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Order Date:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${orderDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Manifest Date:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${manifestDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Total Items:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${totalItems}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Waybill Number:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${waybill}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 30px 0 15px 0; color: #333333; font-size: 20px; font-weight: bold; border-bottom: 2px solid #9C0DD9; padding-bottom: 10px;">Delivery Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="5" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Customer Name:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Delivery Address:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${addressLine1}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"></td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${addressLine2}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Contact Number:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${contactNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">Delivery Instructions:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${deliveryInstructions}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 30px 0 15px 0; color: #333333; font-size: 20px; font-weight: bold; border-bottom: 2px solid #9C0DD9; padding-bottom: 10px;">Device Inventory</h2>
              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px; border: 1px solid #e0e0e0;">
                <tr style="background-color: #7209B7;">
                  <th style="color: #ffffff; font-size: 12px; font-weight: bold; text-align: left; padding: 12px 8px; border: 1px solid #6108a3;">Device Type</th>
                  <th style="color: #ffffff; font-size: 12px; font-weight: bold; text-align: left; padding: 12px 8px; border: 1px solid #6108a3;">Serial Number</th>
                  <th style="color: #ffffff; font-size: 12px; font-weight: bold; text-align: left; padding: 12px 8px; border: 1px solid #6108a3;">Package Ref</th>
                  <th style="color: #ffffff; font-size: 12px; font-weight: bold; text-align: center; padding: 12px 8px; border: 1px solid #6108a3;">Charger</th>
                  <th style="color: #ffffff; font-size: 12px; font-weight: bold; text-align: center; padding: 12px 8px; border: 1px solid #6108a3;">Cables</th>
                </tr>
                ${itemsTableRows}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbf0; border-left: 4px solid #ff9800; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #e65100; font-size: 16px; font-weight: bold;">📝 Additional Notes</h3>
                    <div style="color: #5f5f5f; font-size: 13px; line-height: 1.5;">${deliveryInstructions}</div>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 30px 0 20px 0; color: #333333; font-size: 20px; font-weight: bold; border-bottom: 2px solid #9C0DD9; padding-bottom: 10px;">Handoff Confirmation</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="vertical-align: top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #e0e0e0; border-radius: 6px; padding: 15px;">
                      <tr>
                        <td>
                          <h3 style="margin: 0 0 15px 0; color: #7209B7; font-size: 15px; font-weight: bold;">Staff Signature</h3>
                          <div style="border-bottom: 2px solid #333333; height: 60px; margin-bottom: 10px;"></div>
                          <table width="100%" cellpadding="3" cellspacing="0">
                            <tr>
                              <td style="color: #666666; font-size: 12px;">Name:</td>
                              <td style="border-bottom: 1px solid #cccccc;"></td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 12px; padding-top: 8px;">Date:</td>
                              <td style="border-bottom: 1px solid #cccccc; padding-top: 8px;"></td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 12px; padding-top: 8px;">Time:</td>
                              <td style="border-bottom: 1px solid #cccccc; padding-top: 8px;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align: top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #e0e0e0; border-radius: 6px; padding: 15px;">
                      <tr>
                        <td>
                          <h3 style="margin: 0 0 15px 0; color: #7209B7; font-size: 15px; font-weight: bold;">Delivery/Recipient Signature</h3>
                          <div style="border-bottom: 2px solid #333333; height: 60px; margin-bottom: 10px;"></div>
                          <table width="100%" cellpadding="3" cellspacing="0">
                            <tr>
                              <td style="color: #666666; font-size: 12px;">Name:</td>
                              <td style="border-bottom: 1px solid #cccccc;"></td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 12px; padding-top: 8px;">Date:</td>
                              <td style="border-bottom: 1px solid #cccccc; padding-top: 8px;"></td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 12px; padding-top: 8px;">Time:</td>
                              <td style="border-bottom: 1px solid #cccccc; padding-top: 8px;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #2e7d32; font-size: 12px; line-height: 1.6; font-style: italic;">
                      By signing above, I confirm that I have received the items listed in this manifest and that all devices, chargers, and cables are accounted for as indicated.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                This document serves as proof of delivery and handoff.
              </p>
              <p style="margin: 0; color: #666666; font-size: 14px; font-weight: bold;">
                4D Logistics Inventory Management System
              </p>
              <p style="margin: 8px 0 0 0; color: #999999; font-size: 12px;">
                © 2025 All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const generateOrderManifestHtml = (payload: ManifestPayload): string => buildManifestHtml(payload);

const sanitizeFileName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'order';
  }

  return trimmed
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-');
};

export const downloadOrderManifestPdf = async (payload: ManifestPayload) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const html = generateOrderManifestHtml(payload);
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.opacity = '0';
  wrapper.style.top = '-10000px';
  wrapper.style.left = '-10000px';
  wrapper.innerHTML = html;

  document.body.appendChild(wrapper);

  const element = wrapper.querySelector('table');

  if (!element) {
    document.body.removeChild(wrapper);
    throw new Error('Unable to build manifest layout');
  }

  const filename = `Order-Manifest-${sanitizeFileName(payload.orderNumber)}.pdf`;

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    await html2pdf()
      .from(element)
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
};
