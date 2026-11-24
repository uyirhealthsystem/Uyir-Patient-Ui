// payment-service /api/payments (read own payments).
import { baseApi } from "../../services/baseApi";
import type { Payment } from "./types";

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    payment: b.query<Payment, string>({
      query: (id) => ({ url: `/api/payments/${id}` }),
    }),
    refreshPayment: b.mutation<Payment, string>({
      query: (id) => ({ url: `/api/payments/${id}/refresh`, method: "POST" }),
      invalidatesTags: ["AmbulanceBookings", "CareBookings"],
    }),
  }),
});

export const { usePaymentQuery, useRefreshPaymentMutation } = paymentsApi;
