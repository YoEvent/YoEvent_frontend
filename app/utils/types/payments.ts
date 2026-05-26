export interface PaymentRequest {
  orderId?: string;
  tenantId?: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  providerReference?: string;
  status?: string;
  paidAt?: string;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  tenantId: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  providerReference: string;
  status: string;
  paidAt: string;
  clientSecret?: string;
}
