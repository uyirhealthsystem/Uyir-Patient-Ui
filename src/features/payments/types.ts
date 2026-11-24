// payment-service.

export interface Payment {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | string;
  checkoutUrl: string | null;
  referenceType: string;
  referenceId: string;
  amount: number;
  currency: string;
  refundedAmount: number | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}
