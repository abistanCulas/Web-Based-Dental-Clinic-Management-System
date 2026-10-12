import apiClient from "./client";

/**
 * Normalizes a backend MedicineDTO to frontend format.
 *
 * @param {object} dto - MedicineDTO
 * @returns {object} Normalized medicine object
 */
export function normalizeMedicine(dto) {
  if (!dto) return null;
  const stock = Number(dto.stockQuantity != null ? dto.stockQuantity : 0);
  const minStock = Number(dto.reorderLevel != null ? dto.reorderLevel : 50);
  const isLowStock = stock <= minStock;

  return {
    id: dto.medicineCode || `MED-${dto.id}`,
    rawId: dto.id,
    name: dto.name || "Unnamed Medicine",
    genericName: dto.genericName || "",
    brandName: dto.brandName || "",
    category: dto.category || "Antibiotics",
    stock: stock,
    unit: dto.dosageForm ? dto.dosageForm.toLowerCase() : "tablets",
    minStock: minStock,
    unitPrice: dto.unitPrice != null ? Number(dto.unitPrice) : 0,
    expiryDate: dto.expiryDate || "",
    allergyWarning: dto.allergyWarning || "",
    status: isLowStock ? "low-stock" : "in-stock",
    rawStatus: dto.status || "ACTIVE",
    raw: dto,
  };
}

/**
 * Evaluates medicine safety status (Stock & Expiry).
 * Badges:
 * 🟢 Available
 * 🟡 Low Stock
 * 🔴 Out of Stock
 * 🔴 Expired
 */
export function getMedicineSafetyStatus(medicine, requiredQuantity = 1) {
  if (!medicine) {
    return {
      status: "UNKNOWN",
      label: "Unknown",
      badgeClass: "df-badge-gray",
      canDispense: false,
      message: "Medicine details unavailable",
    };
  }

  // 1. Expiry Check
  const rawExpiry = medicine.expiryDate || medicine.raw?.expiryDate;
  if (rawExpiry) {
    const expDate = new Date(rawExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expDate < today) {
      return {
        status: "EXPIRED",
        label: "🔴 Expired",
        badgeClass: "df-badge-danger",
        isExpired: true,
        canDispense: false,
        message: `Expired on ${String(rawExpiry).slice(0, 10)} - Cannot dispense`,
      };
    }
  }

  // 2. Active status check
  const rawStatus = (medicine.rawStatus || medicine.raw?.status || medicine.status || "").toUpperCase();
  if (rawStatus === "INACTIVE" || rawStatus === "DISCONTINUED") {
    return {
      status: "INACTIVE",
      label: "🔴 Inactive",
      badgeClass: "df-badge-danger",
      canDispense: false,
      message: "Medicine is deactivated in pharmacy catalog",
    };
  }

  // 3. Stock Level Check
  const stock = Number(
    medicine.stockQuantity != null
      ? medicine.stockQuantity
      : (medicine.stock != null ? medicine.stock : 0)
  );

  if (stock <= 0) {
    return {
      status: "OUT_OF_STOCK",
      label: "🔴 Out of Stock",
      badgeClass: "df-badge-danger",
      isOutOfStock: true,
      canDispense: false,
      stock,
      message: "0 units in stock",
    };
  }

  const reqQty = Number(requiredQuantity) || 1;
  if (stock < reqQty) {
    return {
      status: "INSUFFICIENT_STOCK",
      label: `🔴 Shortfall (${stock}/${reqQty})`,
      badgeClass: "df-badge-danger",
      isInsufficient: true,
      canDispense: false,
      stock,
      message: `Only ${stock} units available (Need ${reqQty})`,
    };
  }

  const minStock = Number(
    medicine.reorderLevel != null
      ? medicine.reorderLevel
      : (medicine.minStock != null ? medicine.minStock : 20)
  );

  if (stock <= minStock) {
    return {
      status: "LOW_STOCK",
      label: `🟡 Low Stock (${stock})`,
      badgeClass: "df-badge-warning",
      isLowStock: true,
      canDispense: true,
      stock,
      message: `${stock} units remaining (At or below reorder level ${minStock})`,
    };
  }

  return {
    status: "AVAILABLE",
    label: `🟢 Available (${stock})`,
    badgeClass: "df-badge-success",
    isAvailable: true,
    canDispense: true,
    stock,
    message: `${stock} units in stock`,
  };
}

/**
 * Normalizes a backend PrescriptionDTO to frontend format.
 *
 * @param {object} dto - PrescriptionDTO
 * @param {object} patientLookup - Optional map of patient id -> patient object
 * @param {object} dentistLookup - Optional map of dentist id -> dentist object
 * @param {Array} items - Optional array of PrescriptionItem objects
 * @returns {object} Normalized prescription object
 */
export function normalizePrescription(dto, patientLookup = {}, dentistLookup = {}, items = []) {
  if (!dto) return null;
  const patientObj = patientLookup[dto.patientId];
  const patientName =
    patientObj?.name ||
    (patientObj ? `${patientObj.firstName || ""} ${patientObj.lastName || ""}`.trim() : null) ||
    `Patient #${dto.patientId}`;

  const dentistObj = dentistLookup[dto.dentistId];
  const dentistName =
    dentistObj?.name ||
    (dentistObj ? `Dr. ${dentistObj.firstName || ""} ${dentistObj.lastName || ""}`.trim() : null) ||
    `Dentist #${dto.dentistId}`;

  const medList =
    Array.isArray(items) && items.length > 0
      ? items.map((item) => ({
          id: item.id,
          medicineId: item.medicine?.id,
          name: item.medicine?.name || "Prescribed Medicine",
          dosage: item.dosage || "Standard",
          freq: item.frequency || "Daily",
          duration: item.durationDays ? `${item.durationDays} days` : "Course",
          quantity: item.quantity || 1,
          instructions: item.instructions || "",
        }))
      : [
          {
            name: dto.diagnosis ? `${dto.diagnosis} Treatment` : "Prescribed Medicine",
            dosage: "Standard",
            freq: "3x daily",
            duration: "7 days",
          },
        ];

  const primaryMedName = medList.length > 0 ? medList[0].name : "Prescribed Medicine";

  return {
    id: dto.prescriptionCode || `RX-${dto.id}`,
    rawId: dto.id,
    patient: patientName,
    patientId: dto.patientId,
    doctor: dentistName,
    dentistId: dto.dentistId,
    treatmentId: dto.treatmentId,
    date: dto.prescriptionDate ? String(dto.prescriptionDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    diagnosis: dto.diagnosis || "",
    instructions: dto.instructions || "Take as directed by dental surgeon.",
    dentistNotes: dto.dentistNotes || "",
    status: (dto.status === "COMPLETED" || dto.status === "DISPENSED")
      ? "dispensed"
      : (dto.status === "VERIFIED" ? "verified" : (dto.status === "CANCELLED" ? "cancelled" : "pending")),
    rawStatus: dto.status || "ACTIVE",
    medicine: primaryMedName,
    medicines: medList,
    raw: dto,
  };
}

/**
 * Normalizes a backend SupplierDTO to frontend format.
 *
 * @param {object} dto - SupplierDTO
 * @returns {object} Normalized supplier object
 */
export function normalizeSupplier(dto) {
  if (!dto) return null;
  return {
    id: dto.supplierCode || `SUP-${dto.id}`,
    rawId: dto.id,
    name: dto.supplierName || "Unnamed Supplier",
    category: dto.suppliedItems || "Dental Instruments & Supplies",
    email: dto.email || "",
    phone: dto.phone || "",
    contactPerson: dto.contactPerson || "Procurement Desk",
    address: dto.address || "",
    city: dto.city || "",
    terms: "Net 30",
    status: dto.status ? dto.status.toLowerCase() : "active",
    rawStatus: dto.status || "ACTIVE",
    notes: dto.notes || "",
    raw: dto,
  };
}

/**
 * Normalizes a PurchaseOrderDTO or Transaction into ledger row format.
 *
 * @param {object} dto - PurchaseOrderDTO
 * @param {object} supplierLookup - Optional map of supplier id -> supplier object
 * @returns {object} Normalized transaction
 */
export function normalizePurchaseOrder(dto, supplierLookup = {}) {
  if (!dto) return null;
  const supplierName = supplierLookup[dto.supplierId]?.name || `Supplier #${dto.supplierId}`;
  return {
    id: dto.purchaseOrderNumber || `PO-${dto.id}`,
    rawId: dto.id,
    medicine: dto.itemsDescription || `Consignment from ${supplierName}`,
    type: "Stock In",
    quantity: "+Consignment",
    reference: dto.purchaseOrderNumber || `PO-${dto.id}`,
    date: dto.orderDate ? String(dto.orderDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: dto.status === "COMPLETED" ? "completed" : "pending",
    rawStatus: dto.status || "PENDING",
    raw: dto,
  };
}

/**
 * Normalizes a PurchaseRequestDTO into standard frontend format.
 *
 * @param {object} dto - PurchaseRequestDTO
 * @returns {object} Normalized purchase request
 */
export function normalizePurchaseRequest(dto) {
  if (!dto) return null;
  return {
    id: dto.requestCode || `PR-${dto.id}`,
    rawId: dto.id,
    requestCode: dto.requestCode,
    medicine: dto.medicineName || "Dental Medicine",
    medicineName: dto.medicineName,
    medicineId: dto.medicineId,
    medicineCode: dto.medicineCode,
    requestedQty: dto.requestedQuantity != null ? `${dto.requestedQuantity} units` : "—",
    requestedQuantity: dto.requestedQuantity,
    reason: dto.reason || "Stock replenishment",
    requestedBy: dto.pharmacistName || dto.pharmacistEmail || "Pharmacist",
    pharmacistId: dto.pharmacistId,
    pharmacistEmail: dto.pharmacistEmail,
    requestedDate: dto.requestDate ? String(dto.requestDate).slice(0, 10) : (dto.createdAt ? String(dto.createdAt).slice(0, 10) : "—"),
    status: (dto.status || "PENDING").toUpperCase(),
    rawStatus: dto.status || "PENDING",
    adminNote: dto.adminNote || "",
    processedByName: dto.processedByName || "",
    processedAt: dto.processedAt ? String(dto.processedAt).replace("T", " ").slice(0, 16) : null,
    raw: dto,
  };
}

export const pharmacyApi = {
  // =========================================================
  // MEDICINES
  // =========================================================

  /**
   * Fetch all medicines
   * GET /api/medicines
   */
  async getAllMedicines() {
    const response = await apiClient.get("/medicines");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch active medicines
   * GET /api/medicines/active
   */
  async getActiveMedicines() {
    const response = await apiClient.get("/medicines/active");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch low stock medicines
   * GET /api/medicines/low-stock
   */
  async getLowStockMedicines() {
    const response = await apiClient.get("/medicines/low-stock");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch medicine by ID
   * GET /api/medicines/{id}
   */
  async getMedicineById(id) {
    const response = await apiClient.get(`/medicines/${id}`);
    return response.data;
  },

  /**
   * Create a new medicine
   * POST /api/medicines
   */
  async createMedicine(data) {
    const payload = {
      ...data,
      stockQuantity: data.stockQuantity != null ? data.stockQuantity : (data.currentStock != null ? data.currentStock : data.stock),
      reorderLevel: data.reorderLevel != null ? data.reorderLevel : (data.minimumStock != null ? data.minimumStock : data.minStock),
    };
    const response = await apiClient.post("/medicines", payload);
    return response.data;
  },

  /**
   * Update a medicine
   * PUT /api/medicines/{id}
   */
  async updateMedicine(id, data) {
    const response = await apiClient.put(`/medicines/${id}`, data);
    return response.data;
  },

  /**
   * Add stock to medicine
   * PUT /api/medicines/{id}/stock/add?quantity={quantity}
   */
  async addMedicineStock(id, quantity) {
    const response = await apiClient.put(`/medicines/${id}/stock/add`, null, {
      params: { quantity },
    });
    return response.data;
  },

  /**
   * Remove stock from medicine
   * PUT /api/medicines/{id}/stock/remove?quantity={quantity}
   */
  async removeMedicineStock(id, quantity) {
    const response = await apiClient.put(`/medicines/${id}/stock/remove`, null, {
      params: { quantity },
    });
    return response.data;
  },

  /**
   * Delete a medicine
   * DELETE /api/medicines/{id}
   */
  async deleteMedicine(id) {
    const response = await apiClient.delete(`/medicines/${id}`);
    return response.data;
  },

  // =========================================================
  // DRUG INTERACTIONS
  // =========================================================

  /**
   * Check drug-drug interactions for multiple medicines
   * POST /api/drug-interactions/check or /api/medicines/check-interactions
   */
  async checkDrugInteractions(medicineIds) {
    if (!medicineIds || medicineIds.length < 2) return [];
    try {
      const response = await apiClient.post("/drug-interactions/check", { medicineIds });
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      try {
        const fallback = await apiClient.post("/medicines/check-interactions", { medicineIds });
        return Array.isArray(fallback.data) ? fallback.data : [];
      } catch (err2) {
        console.warn("Could not check drug interactions:", err2);
        return [];
      }
    }
  },

  /**
   * Fetch drug interactions for a specific medicine
   * GET /api/drug-interactions/medicine/{medicineId}
   */
  async getMedicineInteractions(medicineId) {
    if (!medicineId) return [];
    try {
      const response = await apiClient.get(`/drug-interactions/medicine/${medicineId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.warn("Could not get interactions for medicine:", err);
      return [];
    }
  },

  // =========================================================
  // PRESCRIPTIONS & DISPENSING
  // =========================================================

  /**
   * Fetch all prescriptions
   * GET /api/prescriptions
   */
  async getAllPrescriptions() {
    const response = await apiClient.get("/prescriptions");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch prescription by ID
   * GET /api/prescriptions/{id}
   */
  async getPrescriptionById(id) {
    const response = await apiClient.get(`/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Fetch patient prescriptions
   * GET /api/prescriptions/patient/{patientId}
   */
  async getPatientPrescriptions(patientId) {
    const response = await apiClient.get(`/prescriptions/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch dentist prescriptions
   * GET /api/prescriptions/dentist/{dentistId}
   */
  async getDentistPrescriptions(dentistId) {
    const response = await apiClient.get(`/prescriptions/dentist/${dentistId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch items for a prescription
   * GET /api/prescriptions/{id}/items
   */
  async getPrescriptionItems(id) {
    const response = await apiClient.get(`/prescriptions/${id}/items`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create prescription
   * POST /api/prescriptions
   */
  async createPrescription(data) {
    const response = await apiClient.post("/prescriptions", data);
    return response.data;
  },

  /**
   * Add medicine item to prescription
   * POST /api/prescriptions/{id}/medicines/{medicineId}?acknowledgeAllergy=true
   */
  async addPrescriptionMedicine(id, medicineId, item, acknowledgeAllergy = false, acknowledgeInteraction = false) {
    const params = {};
    if (acknowledgeAllergy) params.acknowledgeAllergy = true;
    if (acknowledgeInteraction) params.acknowledgeInteraction = true;
    const response = await apiClient.post(`/prescriptions/${id}/medicines/${medicineId}`, item, { params });
    return response.data;
  },

  /**
   * Complete / dispense a prescription
   * PUT /api/prescriptions/{id}/complete
   */
  async completePrescription(id) {
    const response = await apiClient.put(`/prescriptions/${id}/complete`);
    return response.data;
  },

  /**
   * Dispense a prescription (deducts stock and marks DISPENSED)
   * PUT /api/prescriptions/{id}/dispense
   */
  async dispensePrescription(id) {
    const response = await apiClient.put(`/prescriptions/${id}/dispense`);
    return response.data;
  },

  /**
   * Verify a prescription (pharmacist safety review)
   * PUT /api/prescriptions/{id}/verify
   */
  async verifyPrescription(id) {
    const response = await apiClient.put(`/prescriptions/${id}/verify`);
    return response.data;
  },

  /**
   * Cancel prescription
   * PUT /api/prescriptions/{id}/cancel
   */
  async cancelPrescription(id) {
    const response = await apiClient.put(`/prescriptions/${id}/cancel`);
    return response.data;
  },

  /**
   * Update prescription
   * PUT /api/prescriptions/{id}
   */
  async updatePrescription(id, data) {
    const response = await apiClient.put(`/prescriptions/${id}`, data);
    return response.data;
  },

  /**
   * Delete prescription
   * DELETE /api/prescriptions/{id}
   */
  async deletePrescription(id) {
    const response = await apiClient.delete(`/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Remove item from prescription
   * DELETE /api/prescriptions/items/{itemId}
   */
  async removePrescriptionItem(itemId) {
    const response = await apiClient.delete(`/prescriptions/items/${itemId}`);
    return response.data;
  },

  // =========================================================
  // SUPPLIERS
  // =========================================================

  /**
   * Fetch all suppliers
   * GET /api/suppliers
   */
  async getAllSuppliers() {
    const response = await apiClient.get("/suppliers");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch active suppliers
   * GET /api/suppliers/active
   */
  async getActiveSuppliers() {
    const response = await apiClient.get("/suppliers/active");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch supplier by ID
   * GET /api/suppliers/{id}
   */
  async getSupplierById(id) {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  },

  /**
   * Create supplier
   * POST /api/suppliers
   */
  async createSupplier(data) {
    const payload = {
      ...data,
      supplierName: data.supplierName || data.name,
    };
    const response = await apiClient.post("/suppliers", payload);
    return response.data;
  },

  /**
   * Update supplier
   * PUT /api/suppliers/{id}
   */
  async updateSupplier(id, data) {
    const response = await apiClient.put(`/suppliers/${id}`, data);
    return response.data;
  },

  /**
   * Delete supplier
   * DELETE /api/suppliers/{id}
   */
  async deleteSupplier(id) {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },

  // =========================================================
  // PURCHASE ORDERS
  // =========================================================

  /**
   * Fetch all purchase orders
   * GET /api/purchase-orders
   */
  async getAllPurchaseOrders() {
    const response = await apiClient.get("/purchase-orders");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch purchase order by ID
   * GET /api/purchase-orders/{id}
   */
  async getPurchaseOrderById(id) {
    const response = await apiClient.get(`/purchase-orders/${id}`);
    return response.data;
  },

  /**
   * Create purchase order
   * POST /api/purchase-orders
   */
  async createPurchaseOrder(data) {
    const response = await apiClient.post("/purchase-orders", data);
    return response.data;
  },

  /**
   * Update purchase order
   * PUT /api/purchase-orders/{id}
   */
  async updatePurchaseOrder(id, data) {
    const response = await apiClient.put(`/purchase-orders/${id}`, data);
    return response.data;
  },

  /**
   * Approve purchase order
   * PUT /api/purchase-orders/{id}/approve
   */
  async approvePurchaseOrder(id) {
    const response = await apiClient.put(`/purchase-orders/${id}/approve`);
    return response.data;
  },

  /**
   * Ship purchase order
   * PUT /api/purchase-orders/{id}/ship
   */
  async shipPurchaseOrder(id) {
    const response = await apiClient.put(`/purchase-orders/${id}/ship`);
    return response.data;
  },

  /**
   * Receive purchase order
   * PUT /api/purchase-orders/{id}/receive
   */
  async receivePurchaseOrder(id) {
    const response = await apiClient.put(`/purchase-orders/${id}/receive`);
    return response.data;
  },

  /**
   * Cancel purchase order
   * PUT /api/purchase-orders/{id}/cancel
   */
  async cancelPurchaseOrder(id) {
    const response = await apiClient.put(`/purchase-orders/${id}/cancel`);
    return response.data;
  },

  /**
   * Delete purchase order
   * DELETE /api/purchase-orders/{id}
   */
  async deletePurchaseOrder(id) {
    const response = await apiClient.delete(`/purchase-orders/${id}`);
    return response.data;
  },

  // =========================================================
  // CLINIC INVENTORY
  // =========================================================

  /**
   * Fetch all inventory items
   * GET /api/inventory
   */
  async getAllInventoryItems() {
    const response = await apiClient.get("/inventory");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch low stock inventory
   * GET /api/inventory/low-stock
   */
  async getLowStockInventory() {
    const response = await apiClient.get("/inventory/low-stock");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create inventory item
   * POST /api/inventory
   */
  async createInventoryItem(data) {
    const response = await apiClient.post("/inventory", data);
    return response.data;
  },

  /**
   * Add stock to inventory item
   * PUT /api/inventory/{id}/add-stock/{quantity}
   */
  async addInventoryStock(id, quantity) {
    const response = await apiClient.put(`/inventory/${id}/add-stock/${quantity}`);
    return response.data;
  },

  /**
   * Remove stock from inventory item
   * PUT /api/inventory/{id}/remove-stock/{quantity}
   */
  async removeInventoryStock(id, quantity) {
    const response = await apiClient.put(`/inventory/${id}/remove-stock/${quantity}`);
    return response.data;
  },

  // =========================================================
  // PURCHASE REQUESTS / MEDICINE REQUESTS
  // =========================================================

  /**
   * Fetch all purchase requests (Admin)
   * GET /api/purchase-requests
   */
  async getAllPurchaseRequests(status) {
    const params = status && status !== "all" ? { status } : {};
    const response = await apiClient.get("/purchase-requests", { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch pharmacist's own purchase requests
   * GET /api/purchase-requests/my
   */
  async getMyPurchaseRequests(status) {
    const params = status && status !== "all" ? { status } : {};
    const response = await apiClient.get("/purchase-requests/my", { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch purchase request by ID
   * GET /api/purchase-requests/{id}
   */
  async getPurchaseRequestById(id) {
    const response = await apiClient.get(`/purchase-requests/${id}`);
    return response.data;
  },

  /**
   * Create a purchase request (Pharmacist)
   * POST /api/purchase-requests
   */
  async createPurchaseRequest(data) {
    const response = await apiClient.post("/purchase-requests", data);
    return response.data;
  },

  /**
   * Approve a purchase request (Admin)
   * PUT /api/purchase-requests/{id}/approve
   */
  async approvePurchaseRequest(id, adminNote = "") {
    const response = await apiClient.put(`/purchase-requests/${id}/approve`, {
      adminNote,
    });
    return response.data;
  },

  /**
   * Reject a purchase request (Admin)
   * PUT /api/purchase-requests/{id}/reject
   */
  async rejectPurchaseRequest(id, reason = "") {
    const response = await apiClient.put(`/purchase-requests/${id}/reject`, {
      reason,
    });
    return response.data;
  },

  /**
   * Update status of purchase request
   * PUT /api/purchase-requests/{id}/status
   */
  async updatePurchaseRequestStatus(id, status, adminNote = "") {
    const response = await apiClient.put(`/purchase-requests/${id}/status`, {
      status,
      adminNote,
    });
    return response.data;
  },
};

export default pharmacyApi;
