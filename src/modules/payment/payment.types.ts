export interface RazorpayCreateOrderResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
      };
    };
  };
}