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
  const patientName =
    patientObj?.name ||
    (patientObj ? `${patientObj.firstName || ""} ${patientObj.lastName || ""}`.trim() : null) ||
    dto.patientName ||
    (dto.patientId ? `Patient #${dto.patientId}` : "Patient");

  const apptObj = appointmentLookup[dto.appointmentId];
  const serviceName =
    apptObj?.appointmentType ||
    dto.treatmentName ||
    dto.notes ||
    "Dental Consultation & Treatment";

  const doctorName =
    dto.doctorName ||
    apptObj?.doctorName ||
    apptObj?.dentistName ||
    "Attending Dentist";

  const total = Number(dto.totalAmount || 0);
  const paid = Number(dto.paidAmount || 0);
  const balance = Number(dto.balanceAmount != null ? dto.balanceAmount : Math.max(0, total - paid));
  const subtotal = Number(dto.subtotal != null ? dto.subtotal : total);
  const discount = Number(dto.discount || 0);
  const tax = Number(dto.tax || 0);

  let frontendStatus = "pending";
  if (dto.status === "CANCELLED") {
    frontendStatus = "cancelled";
  } else if (dto.status === "PAID" || (balance <= 0 && total > 0)) {
    frontendStatus = "paid";
  } else if (dto.status === "PARTIALLY_PAID" || (paid > 0 && balance > 0)) {
    frontendStatus = "partially-paid";
  } else if (dto.status === "UNPAID" || dto.status === "ISSUED") {
    frontendStatus = "unpaid";
  }

  const dateStr = dto.billDate ? String(dto.billDate).slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: dto.billNumber || `BILL-${dto.id}`,
    rawId: dto.id,
    billNumber: dto.billNumber,
    patientId: dto.patientId,
    patient: patientName,
    appointmentId: dto.appointmentId,
    treatmentId: dto.treatmentId || null,
    service: serviceName,
    doctor: doctorName,
    amount: formatLkr(total),
    rawAmount: total,
    subtotal,
    discount,
    tax,
    paidAmount: paid,
    balanceAmount: balance,
    date: dateStr,
    status: frontendStatus,
    rawStatus: dto.status || "UNPAID",
    notes: dto.notes || "",
  };
}

/**
 * Resolves receipt styling, stamp, and labels based on payment or bill status.
 *
 * @param {object|string} statusOrRecord - Receipt record or status string
 * @returns {object} Status configuration for receipt modal
 */
export function getReceiptStatusConfig(statusOrRecord) {
  let raw = "";
  if (!statusOrRecord) {
    raw = "PENDING";
  } else if (typeof statusOrRecord === "string") {
    raw = statusOrRecord.toUpperCase().trim();
  } else if (typeof statusOrRecord === "object") {
    raw = String(statusOrRecord.rawStatus || statusOrRecord.status || "PENDING").toUpperCase().trim();
  }

  // 1. Paid / Success states
  if (raw === "SUCCESS" || raw === "PAID" || raw === "COMPLETED" || raw === "VERIFIED") {
    return {
      status: "PAID",
      rawStatus: raw,
      displayStatus: "PAID",
      isPaid: true,
      stampText: "✓ PAID & VERIFIED",
      stampColor: "#16a34a",
      stampBorder: "2px solid #16a34a",
      badgeBg: "#dcfce7",
      amountLabel: "Total Paid Amount",
      amountColor: "#16a34a",
      footerNote: "Thank you for trusting DentaFlow with your dental health.",
    };
  }

  // 2. Refunded states
  if (raw === "REFUNDED") {
    return {
      status: "REFUNDED",
      rawStatus: raw,
      displayStatus: "REFUNDED",
      isPaid: false,
      stampText: "↺ REFUNDED",
      stampColor: "#64748b",
      stampBorder: "2px solid #64748b",
      badgeBg: "#f1f5f9",
      amountLabel: "Total Refunded Amount",
      amountColor: "#64748b",
      footerNote: "This transaction has been refunded back to the patient account.",
    };
  }

  // 3. Failed states
  if (raw === "FAILED" || raw === "REFUND_FAILED") {
    return {
      status: "FAILED",
      rawStatus: raw,
      displayStatus: "FAILED",
      isPaid: false,
      stampText: "✕ PAYMENT FAILED",
      stampColor: "#dc2626",
      stampBorder: "2px solid #dc2626",
      badgeBg: "#fee2e2",
      amountLabel: "Attempted Amount",
      amountColor: "#dc2626",
      footerNote: "Payment transaction was not successful.",
    };
  }

  // 4. Cancelled states
  if (raw === "CANCELLED" || raw === "CANCELED") {
    return {
      status: "CANCELLED",
      rawStatus: raw,
      displayStatus: "CANCELLED",
      isPaid: false,
      stampText: "✕ CANCELLED",
      stampColor: "#dc2626",
      stampBorder: "2px solid #dc2626",
      badgeBg: "#fee2e2",
      amountLabel: "Cancelled Amount",
      amountColor: "#dc2626",
      footerNote: "This transaction or invoice has been voided / cancelled.",
    };
  }

  // 5. Partially Paid states
  if (raw === "PARTIALLY_PAID" || raw === "PARTIAL") {
    return {
      status: "PARTIALLY_PAID",
      rawStatus: raw,
      displayStatus: "PARTIALLY PAID",
      isPaid: false,
      stampText: "⏳ PARTIALLY PAID",
      stampColor: "#d97706",
      stampBorder: "2px solid #d97706",
      badgeBg: "#fef3c7",
      amountLabel: "Payment Amount",
      amountColor: "#d97706",
      footerNote: "Partial payment recorded. Outstanding balance remains.",
    };
  }

  // 6. Refund Pending states
  if (raw === "REFUND_PENDING") {
    return {
      status: "REFUND_PENDING",
      rawStatus: raw,
      displayStatus: "REFUND PENDING",
      isPaid: false,
      stampText: "⏳ REFUND PENDING",
      stampColor: "#d97706",
      stampBorder: "2px solid #d97706",
      badgeBg: "#fef3c7",
      amountLabel: "Pending Refund Amount",
      amountColor: "#d97706",
      footerNote: "Refund request is submitted and awaiting review/approval.",
    };
  }

  // 7. Partially Refunded states
  if (raw === "PARTIALLY_REFUNDED") {
    return {
      status: "PARTIALLY_REFUNDED",
      rawStatus: raw,
      displayStatus: "PARTIALLY REFUNDED",
      isPaid: false,
      stampText: "↺ PARTIALLY REFUNDED",
      stampColor: "#d97706",
      stampBorder: "2px solid #d97706",
      badgeBg: "#fef3c7",
      amountLabel: "Refunded Amount",
      amountColor: "#d97706",
      footerNote: "A portion of this payment has been refunded to the patient.",
    };
  }

  // 8. Pending states: PENDING, WAITING, UNPAID, or default fallback
  return {
    status: "PENDING",
    rawStatus: raw,
    displayStatus: "PENDING",
    isPaid: false,
    stampText: "⏳ PAYMENT PENDING",
    stampColor: "#d97706",
    stampBorder: "2px solid #d97706",
    badgeBg: "#fef3c7",
    amountLabel: "Payment Amount",
    amountColor: "#d97706",
    footerNote: "Payment is pending confirmation. Not an official receipt of completed settlement.",
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
  const patient = bill?.patient || bill?.patientName || "Patient";
  const invoiceRef = bill?.billNumber || (dto.billId ? `BILL-${dto.billId}` : "N/A");
  const service = bill?.service || bill?.treatmentName || bill?.notes || "Dental Procedure";
  const amount = Number(dto.amount || 0);
  const refundAmount = Number(dto.refundAmount || 0);

  const statusConfig = getReceiptStatusConfig(dto.status);

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
    status: statusConfig.status,
    rawStatus: dto.status || "PENDING",
    statusConfig,
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

  /**
   * Cancel bill
   * PUT /api/billing/{id}/cancel
   */
  async cancelBill(id) {
    const response = await apiClient.put(`/billing/${id}/cancel`);
    return response.data;
  },

  /**
   * Get bill line items
   * GET /api/billing/{id}/items
   */
  async getBillItems(id) {
    const response = await apiClient.get(`/billing/${id}/items`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Add line item to bill
   * POST /api/billing/{id}/items
   */
  async addBillItem(id, item) {
    const response = await apiClient.post(`/billing/${id}/items`, item);
    return response.data;
  },

  /**
   * Remove line item from bill
   * DELETE /api/billing/items/{itemId}
   */
  async removeBillItem(itemId) {
    const response = await apiClient.delete(`/billing/items/${itemId}`);
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
   * Process refund on a successful payment (immediate approval)
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
   * Submit refund request for review (pending approval)
   * POST /api/payments/{id}/refund/request?amount={amount}&reason={reason}
   */
  async requestRefund(id, amount, reason) {
    const response = await apiClient.post(`/payments/${id}/refund/request`, null, {
      params: {
        amount,
        reason: reason || "Customer requested refund",
      },
    });
    return response.data;
  },

  /**
   * Approve a pending refund request
   * POST /api/payments/{id}/refund/approve
   */
  async approveRefund(id) {
    const response = await apiClient.post(`/payments/${id}/refund/approve`);
    return response.data;
  },

  /**
   * Cancel a pending refund request
   * POST /api/payments/{id}/refund/cancel
   */
  async cancelRefund(id) {
    const response = await apiClient.post(`/payments/${id}/refund/cancel`);
    return response.data;
  },

  /**
   * Delete a pending/draft refund request
   * DELETE /api/payments/{id}/refund
   */
  async deleteRefund(id) {
    const response = await apiClient.delete(`/payments/${id}/refund`);
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

  // =========================================================
  // CASHIER PATIENT SUMMARY & COMBINED BILLING ENDPOINTS
  // =========================================================

  /**
   * Fetch complete patient checkout summary including Treatment Plan,
   * Prescription, Dispensing status, Pharmacy charge, Grand Total, and Bill.
   * GET /api/billing/patient/{patientId}/checkout-summary
   */
  async getPatientCheckoutSummary(patientId) {
    const response = await apiClient.get(`/billing/patient/${patientId}/checkout-summary`);
    const data = response.data || {};
    const pId = data.patientId || data.patient?.id || patientId;
    const pName = data.patientName || data.patient?.name || `Patient #${pId}`;
    const pCode = data.patientCode || data.patient?.patientCode || "N/A";
    const pPhone = data.patientPhone || data.patient?.phone || "";
    const pEmail = data.patientEmail || data.patient?.email || "";

    const dId = data.dentistId || data.doctor?.id;
    const dName = data.doctorName || data.doctor?.name || "Attending Dentist";
    const dSpec = data.doctorSpecialization || data.doctor?.specialization || "Dental Specialist";

    const trtCost = Number(data.treatmentCost != null ? data.treatmentCost : (data.treatmentCharge != null ? data.treatmentCharge : 0));
    const isDispensed = Boolean(data.prescriptionDispensed || data.hasPharmacyPurchase || (data.prescriptionStatus === "DISPENSED" || data.prescriptionStatus === "COMPLETED"));
    const pharmCost = isDispensed ? Number(data.pharmacyCharge != null ? data.pharmacyCharge : (data.pharmacyCost != null ? data.pharmacyCost : 0)) : 0;
    const grandTotal = Number(data.grandTotal != null ? data.grandTotal : (trtCost + pharmCost));
    const paid = Number(data.paidAmount || 0);
    const balance = Number(data.balanceAmount != null ? data.balanceAmount : Math.max(0, grandTotal - paid));

    return {
      ...data,
      patientId: pId,
      patientName: pName,
      patientCode: pCode,
      patientPhone: pPhone,
      patientEmail: pEmail,
      patient: {
        id: pId,
        name: pName,
        patientCode: pCode,
        phone: pPhone,
        email: pEmail,
        ...(data.patient || {}),
      },
      doctor: {
        id: dId,
        name: dName,
        specialization: dSpec,
        ...(data.doctor || {}),
      },
      appointment: {
        id: data.appointmentId || data.appointment?.id,
        code: data.appointmentCode || data.appointment?.appointmentCode,
        date: data.appointmentDate || data.appointment?.date,
        time: data.appointmentTime || data.appointment?.time,
        ...(data.appointment || {}),
      },
      treatmentPlan: {
        id: data.treatmentPlanId || data.treatmentPlan?.id,
        code: data.treatmentPlanCode || data.treatmentPlan?.code,
        title: data.treatmentName || data.treatmentPlan?.title || "Dental Treatment",
        notes: data.treatmentDiagnosis || data.treatmentPlan?.notes || "",
        status: data.treatmentStatus || data.treatmentPlan?.status || "PLANNED",
        cost: trtCost,
        ...(data.treatmentPlan || {}),
      },
      prescription: {
        id: data.prescriptionId || data.prescription?.id,
        code: data.prescriptionCode || data.prescription?.code,
        date: data.prescriptionDate || data.prescription?.date,
        status: data.prescriptionStatus || data.prescription?.status,
        dispensed: isDispensed,
        ...(data.prescription || {}),
      },
      bill: {
        id: data.billId || data.bill?.id,
        billNumber: data.billNumber || data.bill?.billNumber,
        status: data.billStatus || data.bill?.status || "UNPAID",
        subtotal: Number(data.subtotal != null ? data.subtotal : grandTotal),
        discount: Number(data.discount || 0),
        tax: Number(data.tax || 0),
        paidAmount: paid,
        balanceAmount: balance,
        ...(data.bill || {}),
      },
      treatmentCost: trtCost,
      treatmentCharge: trtCost,
      hasPharmacyPurchase: isDispensed,
      pharmacyDispensingStatus: isDispensed ? "DISPENSED" : "NOT DISPENSED",
      pharmacyCost: pharmCost,
      pharmacyCharge: pharmCost,
      grandTotal,
      paidAmount: paid,
      balanceAmount: balance,
    };
  },

  /**
   * Search / lookup patients for checkout (by ID, patientCode, name, or phone)
   * GET /api/billing/patient/lookup?query={query}
   */
  async lookupPatients(query) {
    const response = await apiClient.get("/billing/patient/lookup", {
      params: { query },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Generate or update the combined authoritative bill
   * POST /api/billing/patient/{patientId}/generate-bill
   */
  async generateCombinedBill(patientId) {
    const response = await apiClient.post(`/billing/patient/${patientId}/generate-bill`);
    return response.data;
  },

  /**
   * Collect cash payment for a patient's combined bill
   * POST /api/billing/patient/{patientId}/pay-cash
   */
  async payCash(patientId, amount, notes) {
    const response = await apiClient.post(`/billing/patient/${patientId}/pay-cash`, null, {
      params: {
        ...(amount != null ? { amount } : {}),
        ...(notes ? { notes } : {}),
      },
    });
    return response.data;
  },

  // =========================================================
  // PAYHERE ONLINE CHECKOUT
  // =========================================================

  /**
   * Initiate PayHere checkout with signed MD5 hash from backend
   * POST /api/payments/payhere/initiate
   */
  async initiatePayHereCheckout({ billId, amount, patientId }) {
    const response = await apiClient.post("/payments/payhere/initiate", {
      billId,
      amount,
      patientId,
    });
    return response.data;
  },

  /**
   * Simulate verified PayHere callback (for sandbox testing & automated verification)
   * POST /api/payments/payhere/simulate-success/{paymentId}
   */
  async simulatePayHereSuccess(paymentId) {
    const response = await apiClient.post(`/payments/payhere/simulate-success/${paymentId}`);
    return response.data;
  },
};

export default billingApi;
