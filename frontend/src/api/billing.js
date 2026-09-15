import apiClient from "./client";

/**
 * Formats a number or numeric string to LKR currency representation (e.g. "LKR 5,500").
 * @param {number|string} amount
 * @returns {string}
 */
export function formatLkr(amount) {
  if (amount == null || amount === "") return "LKR 0";
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return "LKR 0";
  return `LKR ${Math.round(num).toLocaleString()}`;
}

/**
 * Parses an LKR formatted string or number into a standard numeric float value.
 * @param {string|number} str
 * @returns {number}
 */
export function parseLkr(str) {
  if (str == null) return 0;
  if (typeof str === "number") return str;
  const cleaned = String(str).replace(/[^0-9.-]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Maps frontend UI payment method selection to backend supported enum values:
 * CARD, CASH, ONLINE
 * @param {string} uiMethod
 * @returns {"CARD"|"CASH"|"ONLINE"}
 */
export function mapPaymentMethodToBackend(uiMethod) {
  if (!uiMethod) return "CARD";
  const m = String(uiMethod).toLowerCase();
  if (m.includes("cash")) return "CASH";
  if (m.includes("bank") || m.includes("online") || m.includes("portal")) return "ONLINE";
  if (m.includes("card") || m.includes("visa") || m.includes("master")) return "CARD";
  if (m.includes("insurance")) return "ONLINE";
  return "CARD";
}

/**
 * Maps backend payment method to user-friendly frontend display.
 * @param {string} backendMethod
 * @returns {string}
 */
export function mapPaymentMethodToFrontend(backendMethod) {
  if (!backendMethod) return "Credit / Debit Card";
  const m = String(backendMethod).toUpperCase();
  if (m === "CASH") return "Cash";
  if (m === "ONLINE") return "Bank Transfer / Online Portal";
  if (m === "CARD") return "Credit / Debit Card";
  return "Credit / Debit Card";
}

/**
 * Normalizes a backend BillDTO into the frontend invoice format.
 *
 * @param {object} dto - BillingDTO from backend
 * @param {object} patientLookup - Optional lookup map { [patientId]: PatientDTO }
 * @param {object} appointmentLookup - Optional lookup map { [appointmentId]: AppointmentDTO }
 * @returns {object} Normalized invoice
 */
export function normalizeBill(dto, patientLookup = {}, appointmentLookup = {}) {
  if (!dto) return null;

  const patientObj = patientLookup[dto.patientId];
  const patientName = patientObj?.name || (patientObj ? `${patientObj.firstName || ""} ${patientObj.lastName || ""}`.trim() : null) || `Patient #${dto.patientId}`;

  const apptObj = appointmentLookup[dto.appointmentId];
  const serviceName = apptObj?.appointmentType || dto.notes || "Dental Consultation & Treatment";

  const total = Number(dto.totalAmount || 0);
  const paid = Number(dto.paidAmount || 0);
  const balance = Number(dto.balanceAmount != null ? dto.balanceAmount : Math.max(0, total - paid));

  let frontendStatus = "pending";
  if (dto.status === "PAID" || balance <= 0) {
    frontendStatus = "paid";
  }

  const dateStr = dto.billDate ? String(dto.billDate).slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: dto.billNumber || `BILL-${dto.id}`,
    rawId: dto.id,
    billNumber: dto.billNumber,
    patientId: dto.patientId,
    patient: patientName,
    appointmentId: dto.appointmentId,
    service: serviceName,
    amount: formatLkr(total),
    rawAmount: total,
    paidAmount: paid,
    balanceAmount: balance,
    date: dateStr,
    status: frontendStatus,
    rawStatus: dto.status || "UNPAID",
    notes: dto.notes || "",
  };
}

/**
 * Normalizes a backend PaymentDTO into the frontend payment / refund format.
 *
 * @param {object} dto - PaymentDTO from backend
 * @param {object} billLookup - Optional lookup map { [billId]: normalizedBill }
 * @returns {object} Normalized payment
 */
export function normalizePayment(dto, billLookup = {}) {
  if (!dto) return null;

  const bill = billLookup[dto.billId];
  const patient = bill?.patient || "Patient";
  const invoiceRef = bill?.billNumber || (dto.billId ? `BILL-${dto.billId}` : "N/A");
  const service = bill?.service || "Dental Procedure";
  const amount = Number(dto.amount || 0);
  const refundAmount = Number(dto.refundAmount || 0);

  let frontendStatus = "pending";
  if (dto.status === "SUCCESS") frontendStatus = "paid";
  else if (dto.status === "REFUNDED") frontendStatus = "completed";
  else if (dto.status === "REFUND_PENDING") frontendStatus = "pending";
  else if (dto.status === "FAILED") frontendStatus = "failed";
  else if (dto.status === "CANCELLED") frontendStatus = "cancelled";

  const dateStr = dto.paymentDate ? String(dto.paymentDate).slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: dto.paymentReference || `PAY-${dto.id}`,
    rawId: dto.id,
    paymentReference: dto.paymentReference,
    billId: dto.billId,
    patient,
    invoice: invoiceRef,
    service,
    amount: formatLkr(amount),
    rawAmount: amount,
    refundAmount,
    refundReference: dto.refundReference || "",
    refundReason: dto.refundReason || "",
    date: dateStr,
    status: frontendStatus,
    rawStatus: dto.status || "PENDING",
    method: mapPaymentMethodToFrontend(dto.paymentMethod),
    transactionId: dto.transactionId || "",
    notes: dto.notes || "",
  };
}

export const billingApi = {
  // =========================================================
  // BILLING ENDPOINTS
  // =========================================================

  /**
   * Fetch all bills across clinic
   * GET /api/billing
   */
  async getAllBills() {
    const response = await apiClient.get("/billing");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch bill by ID
   * GET /api/billing/{id}
   */
  async getBillById(id) {
    const response = await apiClient.get(`/billing/${id}`);
    return response.data;
  },

  /**
   * Fetch bill by billNumber (e.g. "BILL000001")
   * GET /api/billing/number/{billNumber}
   */
  async getBillByNumber(billNumber) {
    const response = await apiClient.get(`/billing/number/${billNumber}`);
    return response.data;
  },

  /**
   * Fetch bills for a specific patient
   * GET /api/billing/patient/{patientId}
   */
  async getPatientBills(patientId) {
    const response = await apiClient.get(`/billing/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch bills by payment status ("UNPAID", "PARTIALLY_PAID", "PAID")
   * GET /api/billing/status/{status}
   */
  async getBillsByStatus(status) {
    const response = await apiClient.get(`/billing/status/${status}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create a new bill
   * POST /api/billing
   */
  async createBill(data) {
    const response = await apiClient.post("/billing", data);
    return response.data;
  },

  /**
   * Update bill details
   * PUT /api/billing/{id}
   */
  async updateBill(id, data) {
    const response = await apiClient.put(`/billing/${id}`, data);
    return response.data;
  },

  /**
   * Direct bill payment shortcut
   * POST /api/billing/{id}/payment?amount={amount}
   */
  async addPaymentDirect(id, amount) {
    const response = await apiClient.post(`/billing/${id}/payment`, null, {
      params: { amount },
    });
    return response.data;
  },

  /**
   * Delete bill
   * DELETE /api/billing/{id}
   */
  async deleteBill(id) {
    const response = await apiClient.delete(`/billing/${id}`);
    return response.data;
  },

  // =========================================================
  // PAYMENT ENDPOINTS
  // =========================================================

  /**
   * Fetch all payments
   * GET /api/payments
   */
  async getAllPayments() {
    const response = await apiClient.get("/payments");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch payment by ID
   * GET /api/payments/{id}
   */
  async getPaymentById(id) {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  /**
   * Fetch payment by reference
   * GET /api/payments/reference/{reference}
   */
  async getPaymentByReference(reference) {
    const response = await apiClient.get(`/payments/reference/${reference}`);
    return response.data;
  },

  /**
   * Fetch payments for a bill
   * GET /api/payments/bill/{billId}
   */
  async getPaymentsForBill(billId) {
    const response = await apiClient.get(`/payments/bill/${billId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch only SUCCESS payments for a bill
   * GET /api/payments/bill/{billId}/successful
   */
  async getSuccessfulPaymentsForBill(billId) {
    const response = await apiClient.get(`/payments/bill/${billId}/successful`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch payments by status ("PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED")
   * GET /api/payments/status/{status}
   */
  async getPaymentsByStatus(status) {
    const response = await apiClient.get(`/payments/status/${status}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch payments by method ("ONLINE", "CARD", "CASH")
   * GET /api/payments/method/{method}
   */
  async getPaymentsByMethod(method) {
    const response = await apiClient.get(`/payments/method/${method}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create a new payment record
   * POST /api/payments
   */
  async createPayment(data) {
    const response = await apiClient.post("/payments", data);
    return response.data;
  },

  /**
   * Update payment record
   * PUT /api/payments/{id}
   */
  async updatePayment(id, data) {
    const response = await apiClient.put(`/payments/${id}`, data);
    return response.data;
  },

  /**
   * Verify and confirm payment (marks payment as SUCCESS and updates bill balance)
   * POST /api/payments/{id}/verify
   */
  async verifyPayment(id) {
    const response = await apiClient.post(`/payments/${id}/verify`);
    return response.data;
  },

  /**
   * Mark payment as failed
   * POST /api/payments/{id}/fail
   */
  async markPaymentFailed(id, gatewayResponse) {
    const response = await apiClient.post(`/payments/${id}/fail`, null, {
      params: gatewayResponse ? { gatewayResponse } : {},
    });
    return response.data;
  },

  /**
   * Cancel a payment
   * POST /api/payments/{id}/cancel
   */
  async cancelPayment(id) {
    const response = await apiClient.post(`/payments/${id}/cancel`);
    return response.data;
  },

  /**
   * Process refund on a successful payment
   * POST /api/payments/{id}/refund?amount={amount}&reason={reason}
   */
  async refundPayment(id, amount, reason) {
    const response = await apiClient.post(`/payments/${id}/refund`, null, {
      params: {
        amount,
        reason: reason || "Customer requested refund",
      },
    });
    return response.data;
  },

  /**
   * Delete payment
   * DELETE /api/payments/{id}
   */
  async deletePayment(id) {
    const response = await apiClient.delete(`/payments/${id}`);
    return response.data;
  },

  /**
   * Complete checkout helper: Creates payment record and immediately verifies it.
   * Updates the linked bill synchronously.
   */
  async processPaymentAndVerify({ billId, amount, paymentMethod, transactionId, notes }) {
    const created = await this.createPayment({
      billId,
      amount,
      paymentMethod: mapPaymentMethodToBackend(paymentMethod),
      transactionId: transactionId || `TXN-${Date.now()}`,
      notes: notes || "Payment collected at checkout",
    });

    // Verify payment to transition it to SUCCESS and update bill paid/balance
    const verified = await this.verifyPayment(created.id);
    return verified;
  },
};

export default billingApi;
