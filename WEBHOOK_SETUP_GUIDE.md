# Webhook Setup & Troubleshooting Guide

## 🚨 Quick Fix for "Failed to Fetch" Error

The "Failed to submit: Failed to fetch" error means the app can't connect to your n8n webhook.

---

## ✅ Step 1: Check Your `.env` File

Open `.env` in your project root and verify:

```env
# Required for Order Picking
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://your-n8n-instance.com/webhook/order-picked

# Required for Order Placement
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://your-n8n-instance.com/webhook/order-placed

# Required for Order Dispatch
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=https://your-n8n-instance.com/webhook/order-dispatched
```

### **Common Mistakes:**

❌ **Using localhost when deployed:**
```env
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=http://localhost:5678/webhook/...
```
This ONLY works if running React app and n8n on the same machine.

✅ **Use your actual n8n domain:**
```env
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/order-picked
```

---

## ✅ Step 2: Get Correct Webhook URL from n8n

### **In your n8n workflow:**

1. Open the workflow that handles order picking
2. Find the **Webhook** trigger node
3. Click on it
4. Look for **Webhook URLs** section
5. Copy the **Production URL** (NOT Test URL)

**Example Production URL:**
```
https://n8n.yourdomain.com/webhook/a02fb1f6-4a82-45cf-95ba-c834c7f33772
```

### **Workflow Settings:**

Make sure these are configured:

1. **Webhook Response:**
   - Set to "Respond to Webhook"
   - Response Code: 200
   - Response Data: "success" or custom JSON

2. **CORS (if needed):**
   - In Webhook node settings
   - Add allowed origin: Your React app domain
   - Example: `https://your-app.com` or `*` for development

---

## ✅ Step 3: Activate Your Workflow

1. In n8n, open your workflow
2. Look for the toggle in top-right corner
3. Make sure it's **ON** (active)
4. If it was off, turn it on and save

---

## ✅ Step 4: Test the Connection

### **Quick Browser Test:**

Open your browser console (F12) and run:

```javascript
fetch('https://your-n8n-instance.com/webhook/order-picked', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ test: 'hello' })
})
.then(res => res.text())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

**Expected Results:**

✅ **Success:** Console shows "Success: ..." with response
❌ **Failed:** Console shows error message

### **Common Errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch` | Can't reach URL | Check URL is accessible |
| `CORS error` | CORS not configured | Enable CORS in n8n webhook |
| `404 Not Found` | Wrong URL | Verify webhook URL is correct |
| `Workflow not active` | n8n workflow is off | Activate the workflow |

---

## ✅ Step 5: Restart Your App

After updating `.env`:

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

**Important:** Environment variables are only loaded when the app starts!

---

## 📊 Complete Webhook Configuration

Your `.env` should have all these for full functionality:

```env
# Airtable Configuration
VITE_AIRTABLE_PAT=your_airtable_personal_access_token
VITE_AIRTABLE_BASE_ID=your_base_id
VITE_AIRTABLE_INVENTORY_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_UNIQUE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_DISPATCH_LOG_TABLE_ID=tblXXXXXXXXXXXXXX

# n8n Webhook URLs
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/order-placed
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/order-picked
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/order-dispatched
```

---

## 🔍 Debug Mode

The app now logs detailed webhook information to the browser console.

### **How to View Logs:**

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for messages starting with `[n8n]`

**Example logs:**
```
[n8n] Calling order picked notification webhook at: https://...
[n8n] Payload: { orderId: "ORD-0011", ... }
[n8n] Response status: 200
[n8n] Success response: { success: true }
```

**If something fails:**
```
[n8n] Webhook call failed: TypeError: Failed to fetch
```

This tells you exactly what went wrong!

---

## 🎯 Quick Checklist

Before submitting a picked order, verify:

- [ ] `.env` file has `VITE_N8N_ORDER_PICKED_WEBHOOK_URL`
- [ ] Webhook URL uses `https://` not `http://localhost`
- [ ] n8n workflow is **active** (toggle is ON)
- [ ] Webhook URL is from **Production** not Test
- [ ] App was restarted after changing `.env`
- [ ] Browser console shows `[n8n]` logs when submitting

---

## 💡 Still Not Working?

### **Check Network Tab:**

1. Open DevTools (F12)
2. Go to **Network** tab
3. Submit the order
4. Look for the webhook request (it will be red if failed)
5. Click on it to see:
   - Request URL
   - Status code
   - Response body
   - Error message

### **Share These for Support:**

- Browser console logs (`[n8n]` messages)
- Network tab screenshot showing failed request
- Your `.env` webhook URL (hide sensitive parts)
- n8n workflow webhook URL

---

## 🚀 Testing Payload Structure

Your n8n workflow should expect this payload:

```json
{
  "orderId": "ORD-0011",
  "uniqueOrderRecordId": "recXXXXXXXXXXXXXX",
  "totalQuantity": 5,
  "pickedQuantity": 5,
  "dateOrdered": "2025-10-19",
  "orderedBy": "user@example.com",
  "deliveryParty": "Technician",
  "pickedItems": [
    {
      "stockOrderId": "recYYYYYYYYYYYYYY",
      "deviceType": "red-long-sleeved-shirt",
      "quantity": 2,
      "stockAvailability": "In Stock",
      "pickStatus": "Picked in full",
      "packer": "picker@example.com",
      "terminalSerialNumber": "SN123456",
      "chargerPacked": "Y",
      "cables": "Y"
    }
  ],
  "metadata": {
    "pickedAt": "2025-10-19T12:30:00.000Z",
    "pickerEmail": "picker@example.com"
  }
}
```

In n8n, loop through `pickedItems` array to write to `Dispatch_Log` table.

---

Need more help? Check the browser console for detailed error messages!
