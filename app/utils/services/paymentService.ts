import { api } from "../api";
import * as T from "../types/payments";

export const paymentService = {
  getPayments: () => api.get<T.PaymentResponse[]>("api/v1/payments"),
  getPaymentsByTenant: (tenantId: string) => api.get<T.PaymentResponse[]>(`api/v1/payments/tenant/${tenantId}`),
  getPaymentById: (id: string) => api.get<T.PaymentResponse>(`api/v1/payments/${id}`),
  createPayment: (data: T.PaymentRequest) => api.post<T.PaymentResponse>("api/v1/payments", data),
  updatePayment: (id: string, data: T.PaymentRequest) => api.put<T.PaymentResponse>(`api/v1/payments/${id}`, data),
  deletePayment: (id: string) => api.delete<void>(`api/v1/payments/${id}`),
};
