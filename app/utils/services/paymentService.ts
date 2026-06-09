import { api } from "../api";
import * as T from "../types/payments";

export const paymentService = {
  getPayments: () => api.get<T.PaymentResponse[]>("api/v1/payments"),
  getMyPayments: () => api.get<T.PaymentResponse[]>("api/v1/payments/mine"),
  getPaymentsByOrderId: (orderId: string) =>
    api.get<T.PaymentResponse[]>(`api/v1/payments/by-order/${orderId}`, { suppressSessionClear: true }),
  getPaymentById: (id: string) => api.get<T.PaymentResponse>(`api/v1/payments/${id}`),
  createPayment: (data: T.PaymentRequest) => api.post<T.PaymentResponse>("api/v1/payments", data),
  updatePayment: (id: string, data: T.PaymentRequest) => api.put<T.PaymentResponse>(`api/v1/payments/${id}`, data),
  deletePayment: (id: string) => api.delete<void>(`api/v1/payments/${id}`),
  createRefund: (data: T.RefundRequest) => api.post<T.RefundResponse>("api/v1/refunds", data),
  getRefunds: () => api.get<T.RefundResponse[]>("api/v1/refunds"),
  checkMobileMoneyStatus: (paymentId: string) =>
    api.get<T.MobileMoneyStatusResponse>(`api/v1/payments/${paymentId}/mobile-money-status`),
  getAvailableBalance: () =>
    api.get<{ tenantId: string; availableBalance: number; currency: string }>("api/v1/payments/withdrawals/balance"),
  withdraw: (data: { amount: number; provider: string; currency?: string }) =>
    api.post<any>("api/v1/payments/withdrawals", data),
  getWithdrawals: () => api.get<any[]>("api/v1/payments/withdrawals"),
  createSubscription: (data: { tenantId: string; planId: string; amount: number; currency: string; provider: string; paymentMethodId?: string }) =>
    api.post<any>("api/v1/subscriptions", data),
};
