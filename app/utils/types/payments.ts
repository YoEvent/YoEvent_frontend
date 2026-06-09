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
  phoneNumber?: string;
}

export interface MobileMoneyStatusResponse {
  paymentId: string;
  status: string;
  provider: string;
  reference: string;
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

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
  status?: string;
}

export interface RefundResponse {
  refundId: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: string;
  processedAt: string;
}
