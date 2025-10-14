const submitOrderWebhookUrl = import.meta.env.VITE_N8N_SUBMIT_ORDER_WEBHOOK_URL;
const orderPlacedWebhookUrl = import.meta.env.VITE_N8N_ORDER_PLACED_WEBHOOK_URL;

const assertWebhookConfigured = (url: string | undefined, name: string) => {
  if (!url || url.trim().length === 0) {
    throw new Error(`Missing ${name} configuration. Please set the ${name} environment variable.`);
  }

  return url;
};

const postWebhook = async (url: string, payload: Record<string, unknown>, context: string) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`n8n ${context} webhook failed with status ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ''}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Unexpected error calling n8n ${context} webhook`);
  }
};

export type OrderLineWebhookPayload = Record<string, unknown> & {
  orderId: string;
  dateOrdered: string;
  itemCategory: string;
  itemNature: string;
  deviceType: string;
  quantityOrdered: number;
  contractorCompany?: string;
  region?: string;
  technician?: string;
  orderedBy: string;
  orderLocation?: string;
  deliverToPart: string;
  onBehalfOf?: string;
  popId?: string;
  recipientName?: string;
  recipientCompanyName?: string;
  recipientAddress?: string;
  recipientContactNumber?: string;
  recipientEmail?: string;
};

export type OrderPlacedWebhookPayload = Record<string, unknown> & {
  orderId: string;
  totalItems: number;
  dateOrdered: string;
  orderedBy: string;
  deliveryParty: string;
  contractorCompany?: string;
  region?: string;
};

export const n8nService = {
  async submitOrderLine(payload: OrderLineWebhookPayload) {
    const url = assertWebhookConfigured(submitOrderWebhookUrl, 'VITE_N8N_SUBMIT_ORDER_WEBHOOK_URL');
    await postWebhook(url, payload, 'order line submission');
  },

  async notifyOrderPlaced(payload: OrderPlacedWebhookPayload & { items: Array<Pick<OrderLineWebhookPayload, 'deviceType' | 'quantityOrdered'>> }) {
    const url = assertWebhookConfigured(orderPlacedWebhookUrl, 'VITE_N8N_ORDER_PLACED_WEBHOOK_URL');
    await postWebhook(url, payload, 'order placed notification');
  }
};
