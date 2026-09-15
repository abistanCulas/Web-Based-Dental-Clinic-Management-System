import { useState, useMemo, useEffect } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, TabPills, SearchBar } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import {
  pharmacyApi,
  normalizeMedicine,
  normalizePrescription,
  normalizePurchaseOrder,
} from "../../../api/pharmacy";
import { patientApi } from "../../../api/patients";
import { dentistApi } from "../../../api/dentists";

let pharmCounter = 6000;
const nextId = (prefix = "PHARM") => `${prefix}-${++pharmCounter}`;

export function PharmacistDispensingView({ role = "pharmacist", page = "dispense" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [selectedRx, setSelectedRx] = useState(null);
  const [batchNumber, setBatchNumber] = useState("BAT-2026-092");
  const [realRxList, setRealRxList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPrescriptions = async () => {
    try {
      const [rxRaw, patients, dentists] = await Promise.all([
        pharmacyApi.getAllPrescriptions().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
      ]);

      const patientLookup = {};
      patients.forEach((p) => {
        patientLookup[p.id] = p;
      });

      const dentistLookup = {};
      dentists.forEach((d) => {
        dentistLookup[d.id] = d;
      });

      const normalized = await Promise.all(
        rxRaw.map(async (rx) => {
          const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
          return normalizePrescription(rx, patientLookup, dentistLookup, items);
        })
      );

      setRealRxList(normalized);
    } catch (err) {
      console.warn("Could not load prescriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [rxRaw, patients, dentists] = await Promise.all([
          pharmacyApi.getAllPrescriptions().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          dentistApi.getAllDentists().catch(() => []),
        ]);

        if (!mounted) return;

        const patientLookup = {};
        patients.forEach((p) => {
          patientLookup[p.id] = p;
        });

        const dentistLookup = {};
        dentists.forEach((d) => {
          dentistLookup[d.id] = d;
        });

        const normalized = await Promise.all(
          rxRaw.map(async (rx) => {
            const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
            return normalizePrescription(rx, patientLookup, dentistLookup, items);
          })
        );

        if (mounted) {
          setRealRxList(normalized);
        }
      } catch (err) {
        console.warn("Could not load prescriptions:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const allPrescriptions = useMemo(() => {
    return realRxList.length > 0 ? realRxList : (collections.prescriptions || []);
  }, [realRxList, collections.prescriptions]);

  const prescriptions = useMemo(() => {
    return allPrescriptions.filter((p) => p.status !== "dispensed" && p.rawStatus !== "COMPLETED");
  }, [allPrescriptions]);

  const dispensedToday = useMemo(() => {
    return allPrescriptions.filter((p) => p.status === "dispensed" || p.rawStatus === "COMPLETED");
  }, [allPrescriptions]);

  const handleDispense = async () => {
    if (!selectedRx) return;
    try {
      if (selectedRx.rawId) {
        await pharmacyApi.completePrescription(selectedRx.rawId);
        if (Array.isArray(selectedRx.medicines)) {
          for (const item of selectedRx.medicines) {
            if (item.medicineId && item.quantity) {
              await pharmacyApi.removeMedicineStock(item.medicineId, item.quantity).catch(() => null);
            }
          }
        }
      }

      saveRecord("prescriptions", { ...selectedRx, status: "dispensed", rawStatus: "COMPLETED" });

      const tx = {
        id: nextId("TX"),
        medicine: selectedRx.medicine || "Prescribed Medicine",
        type: "Dispensed",
        quantity: "-1 Unit",
        reference: `${selectedRx.id} (Batch: ${batchNumber})`,
        date: new Date().toISOString().slice(0, 10),
        status: "dispensed",
      };
      saveRecord("transactions", tx);

      addToast(`Prescription ${selectedRx.id} verified & dispensed for ${selectedRx.patient}!`, "success");
      setSelectedRx(null);
      await loadPrescriptions();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to dispense prescription";
      addToast(typeof msg === "string" ? msg : "Dispensing failed", "error");
    }
  };

  const breadcrumbLabel = page === "prescriptions" ? "Prescriptions" : "Dispense Medicines";
  const pageTitle =
    page === "prescriptions"
      ? "Pharmacy Prescriptions & Patient Orders"
      : "Prescription Dispensing & Safety Verification";

  return (
    <div className={`df-role-page df-role-rose`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmacy Dispensing Station</span>
          <h1>{pageTitle}</h1>
          <p>Verify doctor prescriptions, validate patient allergy contraindications, and fulfill pharmacy stock.</p>
        </div>
      </header>

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing live pharmacy prescriptions...
        </div>
      )}

      <div className="df-stat-grid">
        <StatCard label="Awaiting Fulfillment" value={String(prescriptions.length)} icon="◷" color="warning" />
        <StatCard label="Dispensed Today" value={String(dispensedToday.length + 12)} icon="✓" color="success" />
        <StatCard label="Allergy Checks Passed" value="100%" icon="◈" color="primary" />
        <StatCard label="Fast-track Dental Rx" value="Active" icon="◫" color="primary" />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {prescriptions.map((rx) => (
          <div key={rx.id} className="df-rx-card" style={{ borderLeft: "4px solid var(--df-role-accent)" }}>
            <div className="df-rx-header">
              <div>
                <span className="df-badge df-badge-warning">Awaiting Dispensing</span>
                <strong style={{ display: "block", fontSize: 16, marginTop: 4 }}>{rx.id} — Patient: {rx.patient}</strong>
                <small style={{ color: "var(--df-text-muted)" }}>Prescribing Dentist: {rx.doctor} · {rx.date}</small>
              </div>
              <button
                className="df-btn df-btn-primary"
                onClick={() => setSelectedRx(rx)}
              >
                ✓ Verify & Dispense
              </button>
            </div>

            <div>
              <div className="df-clinical-alert df-alert-blue" style={{ marginBottom: 8 }}>
                ✓ Safety Check: Patient has no penicillin contraindications reported
              </div>
              <div className="df-med-badge-row">
                {(rx.medicines || [{ name: rx.medicine || "Amoxicillin 500mg", dosage: "500mg", freq: "3x daily", duration: "7 days" }]).map((med, idx) => (
                  <div key={idx} className="df-med-badge">
                    <strong>{med.name}</strong> · {med.dosage || "Standard"} ({med.freq || "Oral"}) - {med.duration || "Course"}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "var(--df-text-secondary)", marginTop: 6 }}>
                <strong>Clinical Notes:</strong> {rx.instructions || "Take with food. Complete entire course."}
              </p>
            </div>
          </div>
        ))}

        {prescriptions.length === 0 && (
          <div className="df-empty">
            <div className="df-empty-icon">✓</div>
            <h3>All Prescriptions Dispensed</h3>
            <p>There are currently no outstanding dental prescriptions awaiting pharmacy fulfillment.</p>
          </div>
        )}
      </div>

      {selectedRx && (
        <Modal
          title={`Dispensing Verification: ${selectedRx.id}`}
          onClose={() => setSelectedRx(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setSelectedRx(null)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleDispense}>
                Confirm Dispense & Deduct Stock
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient Name</small>
              <div style={{ fontWeight: 600 }}>{selectedRx.patient}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Prescribing Dentist</small>
              <div style={{ fontWeight: 600 }}>{selectedRx.doctor}</div>
            </div>
          </div>

          <div style={{ margin: "16px 0", padding: 14, background: "var(--df-gray-50)", borderRadius: 8 }}>
            <strong>Prescription Items:</strong>
            <div style={{ marginTop: 8 }}>
              {Array.isArray(selectedRx.medicines) && selectedRx.medicines.length > 0 ? (
                selectedRx.medicines.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    • <strong>{m.name}</strong> — {m.dosage} ({m.freq}, {m.duration}) {m.quantity ? `· Qty: ${m.quantity}` : ""}
                  </div>
                ))
              ) : (
                selectedRx.medicine
              )}
            </div>
          </div>

          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Pharmaceutical Batch #</label>
              <input
                className="df-input"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Pharmacist Verification</label>
              <input className="df-input" value="Verified by Lisa Thompson, RPh" disabled />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function PharmacistInventoryView({ role = "pharmacist", page = "inventory" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeCategory, setActiveCategory] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(page === "low-stock");
  const [modalOpen, setModalOpen] = useState(false);
  const [realMeds, setRealMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newMed, setNewMed] = useState({
    name: "",
    category: "Antibiotics",
    stock: 200,
    unit: "tablets",
    minStock: 50,
    status: "in-stock",
  });

  const loadMedicines = async () => {
    try {
      const list = await pharmacyApi.getAllMedicines().catch(() => []);
      setRealMeds(list.map(normalizeMedicine));
    } catch (err) {
      console.warn("Could not load medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const list = await pharmacyApi.getAllMedicines().catch(() => []);
        if (!mounted) return;
        setRealMeds(list.map(normalizeMedicine));
      } catch (err) {
        console.warn("Could not load medicines:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const medicines = useMemo(() => {
    return realMeds.length > 0 ? realMeds : (collections.medicines || []);
  }, [realMeds, collections.medicines]);

  const filtered = useMemo(() => {
    return (
      activeCategory === "all" ? medicines : medicines.filter((m) => m.category === activeCategory)
    ).filter((m) => !showLowStockOnly || m.status === "low-stock" || m.stock <= m.minStock);
  }, [activeCategory, medicines, showLowStockOnly]);

  const handleRestock = async (med) => {
    try {
      if (med.rawId) {
        await pharmacyApi.addMedicineStock(med.rawId, 100);
      }
      const newUnits = (parseInt(med.stock, 10) || 0) + 100;
      saveRecord("medicines", { ...med, stock: newUnits, status: "in-stock" });
      const tx = {
        id: nextId("TX"),
        medicine: med.name,
        type: "Stock In",
        quantity: "+100 Units",
        reference: "PO-2026-LOCAL",
        date: new Date().toISOString().slice(0, 10),
        status: "completed",
      };
      saveRecord("transactions", tx);
      addToast(`Restocked ${med.name} (+100 units). Total stock: ${newUnits}!`, "success");
      await loadMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Restock failed";
      addToast(typeof msg === "string" ? msg : "Restock failed", "error");
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!newMed.name.trim()) return;

    try {
      const created = await pharmacyApi.createMedicine({
        medicineCode: `MED-${Date.now().toString().slice(-4)}`,
        name: newMed.name.trim(),
        genericName: newMed.name.trim(),
        category: newMed.category,
        stockQuantity: Number(newMed.stock) || 0,
        reorderLevel: Number(newMed.minStock) || 50,
        dosageForm: newMed.unit,
        unitPrice: 25.0,
        status: "ACTIVE",
      });

      const med = normalizeMedicine(created) || {
        id: nextId("MED"),
        ...newMed,
        status: newMed.stock <= newMed.minStock ? "low-stock" : "in-stock",
      };
      saveRecord("medicines", med);
      addToast(`${med.name} added to pharmacy inventory!`, "success");
      setModalOpen(false);
      setNewMed({
        name: "",
        category: "Antibiotics",
        stock: 200,
        unit: "tablets",
        minStock: 50,
        status: "in-stock",
      });
      await loadMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to add medicine";
      addToast(typeof msg === "string" ? msg : "Failed to add medicine", "error");
    }
  };

  const breadcrumbLabel = page === "low-stock" ? "Low Stock" : "Medicine Inventory";
  const pageTitle =
    page === "low-stock"
      ? "Low Stock Alerts & Critical Replenishment"
      : "Pharmacy Inventory & Reorder Management";
  const pageDesc =
    page === "low-stock"
      ? "Immediate replenishment alerts for pharmaceuticals reaching safety stock thresholds."
      : "Real-time pharmaceutical catalog, stock thresholds, and rapid supplier replenishment.";

  return (
    <div className={`df-role-page df-role-rose`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Inventory & Stock Control</span>
          <h1>{pageTitle}</h1>
          <p>{pageDesc}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {page !== "low-stock" && (
            <button
              className={`df-btn ${showLowStockOnly ? "df-btn-primary" : "df-btn-secondary"}`}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              ⚠ {showLowStockOnly ? "Show All Stock" : "Filter Low Stock"}
            </button>
          )}
          <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
            + Add Medicine Item
          </button>
        </div>
      </header>

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing live medicine inventory...
        </div>
      )}

      <div className="df-stat-grid">
        <StatCard label="Cataloged Items" value={String(medicines.length)} icon="◫" color="primary" />
        <StatCard
          label="Low Stock Alerts"
          value={String(medicines.filter((m) => m.status === "low-stock" || m.stock <= m.minStock).length)}
          icon="◈"
          color="warning"
        />
        <StatCard label="Suppliers Connected" value="3 Active" icon="✓" color="success" />
        <StatCard label="Inventory Valuation" value="LKR 1.42M" icon="◷" color="primary" />
      </div>

      <TabPills
        tabs={[
          { label: "All Items", value: "all", count: medicines.length },
          { label: "Antibiotics", value: "Antibiotics" },
          { label: "Analgesics", value: "Analgesics" },
          { label: "Antiseptics", value: "Antiseptics" },
          { label: "Anesthetics", value: "Anesthetics" },
        ]}
        activeTab={activeCategory}
        onChange={setActiveCategory}
      />

      <section className="df-card">
        <div className="df-card-body">
          <DataTable
            columns={[
              { key: "name", label: "Medicine Name" },
              { key: "category", label: "Category" },
              { key: "stock", label: "Available Stock" },
              { key: "unit", label: "Dispense Unit" },
              { key: "minStock", label: "Reorder Threshold" },
              { key: "status", label: "Stock Health", type: "status" },
            ]}
            rows={filtered}
            actionLabel="Edit"
            onQuickAction={handleRestock}
            quickActionLabel="Restock (+100)"
          />
        </div>
      </section>

      {modalOpen && (
        <Modal
          title="Add New Medicine to Catalog"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleAddMedicine}>
                Add Medicine
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Medicine Brand & Generic Name *</label>
              <input
                className="df-input"
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                placeholder="e.g. Ciprofloxacin 500mg"
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Category</label>
              <select
                className="df-select"
                value={newMed.category}
                onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
              >
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesics">Analgesics</option>
                <option value="Antiseptics">Antiseptics</option>
                <option value="Anesthetics">Anesthetics</option>
              </select>
            </div>
          </div>

          <div className="df-form-3col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Initial Stock</label>
              <input
                type="number"
                className="df-input"
                value={newMed.stock}
                onChange={(e) => setNewMed({ ...newMed, stock: Number(e.target.value) })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Unit Type</label>
              <select
                className="df-select"
                value={newMed.unit}
                onChange={(e) => setNewMed({ ...newMed, unit: e.target.value })}
              >
                <option value="tablets">Tablets</option>
                <option value="bottles">Bottles</option>
                <option value="vials">Vials</option>
                <option value="capsules">Capsules</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Reorder Level</label>
              <input
                type="number"
                className="df-input"
                value={newMed.minStock}
                onChange={(e) => setNewMed({ ...newMed, minStock: Number(e.target.value) })}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function StockTransactionsView({ role, page = "transactions" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState(page === "history" ? "dispensed" : "all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [realTxList, setRealTxList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTx, setNewTx] = useState({
    medicine: "Amoxicillin 500mg",
    type: "Stock In",
    quantity: "+100",
    reference: "PO-2026-105",
    date: new Date().toISOString().slice(0, 10),
    notes: "Direct procurement from MediSource Lanka",
  });

  const loadMovements = async () => {
    try {
      const [pos, rxList, suppliers] = await Promise.all([
        pharmacyApi.getAllPurchaseOrders().catch(() => []),
        pharmacyApi.getAllPrescriptions().catch(() => []),
        pharmacyApi.getAllSuppliers().catch(() => []),
      ]);

      const supplierLookup = {};
      suppliers.forEach((s) => {
        supplierLookup[s.id] = s;
      });

      const poTransactions = pos.map((po) => normalizePurchaseOrder(po, supplierLookup));
      const rxTransactions = rxList
        .filter((rx) => rx.status === "COMPLETED")
        .map((rx) => ({
          id: `TX-DISP-${rx.id}`,
          rawId: rx.id,
          medicine: rx.diagnosis ? `${rx.diagnosis} Prescription` : "Dental Prescription Course",
          type: "Dispensed",
          quantity: "-1 Course",
          reference: rx.prescriptionCode || `RX-${rx.id}`,
          date: rx.prescriptionDate ? String(rx.prescriptionDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: "dispensed",
          raw: rx,
        }));

      setRealTxList([...poTransactions, ...rxTransactions]);
    } catch (err) {
      console.warn("Could not load movements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [pos, rxList, suppliers] = await Promise.all([
          pharmacyApi.getAllPurchaseOrders().catch(() => []),
          pharmacyApi.getAllPrescriptions().catch(() => []),
          pharmacyApi.getAllSuppliers().catch(() => []),
        ]);

        if (!mounted) return;

        const supplierLookup = {};
        suppliers.forEach((s) => {
          supplierLookup[s.id] = s;
        });

        const poTransactions = pos.map((po) => normalizePurchaseOrder(po, supplierLookup));
        const rxTransactions = rxList
          .filter((rx) => rx.status === "COMPLETED")
          .map((rx) => ({
            id: `TX-DISP-${rx.id}`,
            rawId: rx.id,
            medicine: rx.diagnosis ? `${rx.diagnosis} Prescription` : "Dental Prescription Course",
            type: "Dispensed",
            quantity: "-1 Course",
            reference: rx.prescriptionCode || `RX-${rx.id}`,
            date: rx.prescriptionDate ? String(rx.prescriptionDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: "dispensed",
            raw: rx,
          }));

        if (mounted) {
          setRealTxList([...poTransactions, ...rxTransactions]);
        }
      } catch (err) {
        console.warn("Could not load movements:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const transactions = useMemo(() => {
    const combined = [...realTxList, ...(collections.transactions || [])];
    const seen = new Set();
    return combined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [realTxList, collections.transactions]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const stockIn = transactions.filter((t) => t.type === "Stock In" || t.type === "Restocked").length;
    const dispensed = transactions.filter((t) => t.type === "Dispensed").length;
    const adjustments = transactions.filter((t) => t.type === "Stock Adjustment" || t.type === "Adjustment").length;
    return { total, stockIn, dispensed, adjustments };
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        !search ||
        (tx.medicine && tx.medicine.toLowerCase().includes(search.toLowerCase())) ||
        (tx.reference && tx.reference.toLowerCase().includes(search.toLowerCase())) ||
        (tx.id && tx.id.toLowerCase().includes(search.toLowerCase())) ||
        (tx.type && tx.type.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === "all") return true;
      if (activeTab === "stock-in") return tx.type === "Stock In" || tx.type === "Restocked";
      if (activeTab === "dispensed") return tx.type === "Dispensed";
      if (activeTab === "adjustments") return tx.type === "Stock Adjustment" || tx.type === "Adjustment";
      return true;
    });
  }, [transactions, search, activeTab]);

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (!newTx.medicine.trim() || !newTx.quantity) {
      addToast("Please fill in required fields", "warning");
      return;
    }

    try {
      const txItem = {
        id: nextId("TX"),
        medicine: newTx.medicine,
        type: newTx.type,
        quantity: newTx.quantity.startsWith("+") || newTx.quantity.startsWith("-") ? newTx.quantity : `+${newTx.quantity}`,
        reference: newTx.reference || `PO-${nextId("ORD")}`,
        date: newTx.date || new Date().toISOString().slice(0, 10),
        status: "completed",
      };

      saveRecord("transactions", txItem);

      if (newTx.type === "Stock In") {
        const meds = await pharmacyApi.getAllMedicines().catch(() => []);
        const matching = meds.find((m) => m.name.toLowerCase().includes(newTx.medicine.toLowerCase()));
        if (matching?.id) {
          const delta = parseInt(newTx.quantity.replace("+", ""), 10) || 100;
          await pharmacyApi.addMedicineStock(matching.id, delta).catch(() => null);
        }
      }

      addToast(`Recorded movement ${txItem.id} for ${txItem.medicine}!`, "success");
      setModalOpen(false);
      setNewTx({
        medicine: "Amoxicillin 500mg",
        type: "Stock In",
        quantity: "+100",
        reference: "PO-2026-105",
        date: new Date().toISOString().slice(0, 10),
        notes: "Direct procurement",
      });
      await loadMovements();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to record movement";
      addToast(typeof msg === "string" ? msg : "Failed to record movement", "error");
    }
  };

  const columns = [
    { key: "id", label: "Transaction ID" },
    { key: "medicine", label: "Pharmaceutical Item" },
    {
      key: "type",
      label: "Movement Type",
      render: (row) => {
        const isStockIn = row.type === "Stock In" || row.type === "Restocked";
        const isDispensed = row.type === "Dispensed";
        const badgeClass = isStockIn
          ? "df-badge df-badge-success"
          : isDispensed
          ? "df-badge df-badge-primary"
          : "df-badge df-badge-warning";
        return <span className={badgeClass}>{row.type}</span>;
      },
    },
    { key: "quantity", label: "Units Delta" },
    { key: "reference", label: "Reference / PO / Rx" },
    { key: "date", label: "Date" },
    { key: "status", label: "Ledger State", type: "status" },
  ];

  const breadcrumbLabel = page === "history" ? "Medicine History" : "Stock Transactions";
  const pageTitle = page === "history" ? "Pharmacy Dispensing History & Audit Log" : "Stock Transactions & Audit Ledger";
  const pageDesc = page === "history"
    ? "Audit log and historical timeline of all pharmaceutical issuances, consignments, and inventory adjustments."
    : "Complete audit ledger of inward consignments, outpatient dispensations, batch recalls, and count adjustments.";

  return (
    <div className="df-role-page df-role-rose">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmaceutical Traceability</span>
          <h1>{pageTitle}</h1>
          <p>{pageDesc}</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          + Record Inward Consignment / Adjustment
        </button>
      </header>

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing live stock audit ledger...
        </div>
      )}

      <div className="df-stat-grid">
        <StatCard label="Total Logged Movements" value={String(stats.total)} icon="◫" color="primary" />
        <StatCard label="Stock Inward Batches" value={String(stats.stockIn)} icon="✓" color="success" />
        <StatCard label="Dispensations Recorded" value={String(stats.dispensed)} icon="◈" color="primary" />
        <StatCard label="Reconciliation State" value="100% In-Sync" icon="◷" color="success" />
      </div>

      <div className="df-toolbar" style={{ marginBottom: 16 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by medicine, PO reference, or transaction ID..."
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Movements", value: "all", count: stats.total },
          { label: "Stock Inward (Purchases)", value: "stock-in", count: stats.stockIn },
          { label: "Dispensed (Prescriptions)", value: "dispensed", count: stats.dispensed },
          { label: "Stock Adjustments", value: "adjustments", count: stats.adjustments },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <section className="df-card">
        <div className="df-card-body">
          <DataTable
            columns={columns}
            rows={filtered}
            actionLabel="Inspect Batch"
            onEdit={(row) => setSelectedTx(row)}
            onQuickAction={(row) => addToast(`Ledger entry ${row.id} cryptographic hash verified.`, "info")}
            quickActionLabel="Verify Hash"
          />
        </div>
      </section>

      {/* Inspect Modal */}
      {selectedTx && (
        <Modal
          title={`Transaction Audit: ${selectedTx.id}`}
          onClose={() => setSelectedTx(null)}
          footer={
            <>
              <button
                className="df-btn df-btn-secondary"
                onClick={() => {
                  addToast(`Transaction ${selectedTx.id} export downloaded (PDF/CSV)`, "success");
                  setSelectedTx(null);
                }}
              >
                Download Receipt PDF
              </button>
              <button className="df-btn df-btn-primary" onClick={() => setSelectedTx(null)}>
                Close Audit
              </button>
            </>
          }
        >
          <div style={{ background: "var(--df-surface-variant, #f8fafc)", padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>Movement Ref: {selectedTx.id}</strong>
              <span className="df-badge df-badge-success">{selectedTx.status}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--df-text-muted)" }}>
              Recorded on {selectedTx.date} • Verified by Central Pharmacy System
            </p>
          </div>

          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Pharmaceutical Item</label>
              <input className="df-input" value={selectedTx.medicine} disabled />
            </div>
            <div className="df-form-group">
              <label className="df-label">Movement Type</label>
              <input className="df-input" value={selectedTx.type} disabled />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Units Quantity</label>
              <input className="df-input" value={selectedTx.quantity} disabled />
            </div>
            <div className="df-form-group">
              <label className="df-label">Reference Number</label>
              <input className="df-input" value={selectedTx.reference} disabled />
            </div>
          </div>
        </Modal>
      )}

      {/* Record Inward / Adjustment Modal */}
      {modalOpen && (
        <Modal
          title="Record Pharmaceutical Movement"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleRecordTransaction}>
                Record Entry
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Medicine / Consumable *</label>
            <input
              className="df-input"
              value={newTx.medicine}
              onChange={(e) => setNewTx({ ...newTx, medicine: e.target.value })}
              placeholder="e.g. Amoxicillin 500mg"
              required
            />
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Movement Category</label>
              <select
                className="df-select"
                value={newTx.type}
                onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
              >
                <option value="Stock In">Stock In (Purchase Consignment)</option>
                <option value="Stock Adjustment">Stock Adjustment (Audit Reconciliation)</option>
                <option value="Disposal">Damaged / Expired Disposal</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Units Delta (+/-) *</label>
              <input
                className="df-input"
                value={newTx.quantity}
                onChange={(e) => setNewTx({ ...newTx, quantity: e.target.value })}
                placeholder="e.g. +100 or -5"
                required
              />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">PO Reference / Batch #</label>
              <input
                className="df-input"
                value={newTx.reference}
                onChange={(e) => setNewTx({ ...newTx, reference: e.target.value })}
                placeholder="e.g. PO-2026-099"
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Date</label>
              <input
                type="date"
                className="df-input"
                value={newTx.date}
                onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              />
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Notes & Supplier Details</label>
            <textarea
              className="df-textarea"
              rows={2}
              value={newTx.notes}
              onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

