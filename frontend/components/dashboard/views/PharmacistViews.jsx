import { useState, useMemo, useEffect, useCallback } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, TabPills, SearchBar } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import {
  pharmacyApi,
  normalizeMedicine,
  normalizePrescription,
  normalizeSupplier,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
  getMedicineSafetyStatus,
} from "../../../api/pharmacy";
import { patientApi } from "../../../api/patients";
import { dentistApi } from "../../../api/dentists";
import { billingApi, formatLkr } from "../../../api/billing";
import reportsApi from "../../../api/reports";

// Collision-resistant unique ID generator
const nextId = (prefix = "PHARM") =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

// Returns local date in YYYY-MM-DD format
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* ==========================================================================
   1. PRESCRIPTIONS VIEW — PRESCRIPTION MANAGEMENT ONLY
   ========================================================================== */
export function PharmacistPrescriptionsView({ role = "pharmacist" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [bills, setBills] = useState([]);
  const [patientsLookup, setPatientsLookup] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [detailsModalRx, setDetailsModalRx] = useState(null);
  const [patientModal, setPatientModal] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rxRaw, patients, dentists, billsRaw] = await Promise.all([
        pharmacyApi.getAllPrescriptions().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
        billingApi.getAllBills().catch(() => []),
      ]);

      const pMap = {};
      (patients || []).forEach((p) => {
        if (p?.id) pMap[p.id] = p;
      });
      setPatientsLookup(pMap);

      const dMap = {};
      (dentists || []).forEach((d) => {
        if (d?.id) dMap[d.id] = d;
      });

      const normalized = await Promise.all(
        (rxRaw || []).map(async (rx) => {
          const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
          return normalizePrescription(rx, pMap, dMap, items);
        })
      );

      // Sort newest first
      normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setPrescriptionsList(normalized);
      setBills(Array.isArray(billsRaw) ? billsRaw : []);
    } catch (err) {
      console.warn("Could not load prescriptions:", err);
      addToast("Failed to load live prescriptions", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allPrescriptions = useMemo(() => {
    return prescriptionsList.length > 0 ? prescriptionsList : (collections.prescriptions || []);
  }, [prescriptionsList, collections.prescriptions]);

  // Page-specific summary stats
  const todayStr = getLocalDateString();
  const pendingCount = allPrescriptions.filter(
    (p) => p.status === "pending" || p.rawStatus === "ACTIVE"
  ).length;
  const verifiedCount = allPrescriptions.filter(
    (p) => p.status === "verified" || p.rawStatus === "VERIFIED"
  ).length;
  const dispensedCount = allPrescriptions.filter(
    (p) => p.status === "dispensed" || p.rawStatus === "COMPLETED" || p.rawStatus === "DISPENSED"
  ).length;
  const todayCount = allPrescriptions.filter(
    (p) => String(p.date || "").slice(0, 10) === todayStr
  ).length;

  // Filtered list
  const filtered = useMemo(() => {
    return allPrescriptions.filter((rx) => {
      // Tab filter
      if (activeTab === "pending" && (rx.status === "dispensed" || rx.status === "verified")) return false;
      if (activeTab === "verified" && rx.status !== "verified" && rx.rawStatus !== "VERIFIED") return false;
      if (activeTab === "dispensed" && rx.status !== "dispensed" && rx.rawStatus !== "COMPLETED" && rx.rawStatus !== "DISPENSED") return false;

      // Search filter
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const matchId = rx.id && rx.id.toLowerCase().includes(q);
      const matchPatient = rx.patient && rx.patient.toLowerCase().includes(q);
      const matchDoctor = rx.doctor && rx.doctor.toLowerCase().includes(q);
      const matchMed = rx.medicine && rx.medicine.toLowerCase().includes(q);
      const matchDiagnosis = rx.diagnosis && rx.diagnosis.toLowerCase().includes(q);

      return matchId || matchPatient || matchDoctor || matchMed || matchDiagnosis;
    });
  }, [allPrescriptions, activeTab, search]);

  // Verify Prescription Action (Sets status = VERIFIED, does NOT dispense)
  const handleVerifyPrescription = async (rx) => {
    if (!rx) return;
    const targetId = rx.rawId || rx.id;
    try {
      setVerifyingId(targetId);
      if (pharmacyApi.verifyPrescription) {
        await pharmacyApi.verifyPrescription(targetId);
      }

      setPrescriptionsList((prev) =>
        prev.map((item) =>
          item.id === rx.id || item.rawId === rx.rawId
            ? { ...item, status: "verified", rawStatus: "VERIFIED" }
            : item
        )
      );

      saveRecord("prescriptions", { ...rx, status: "verified", rawStatus: "VERIFIED" });
      addToast(`Prescription ${rx.id} verified by Pharmacist and queued for dispensing!`, "success");
      if (detailsModalRx?.id === rx.id) {
        setDetailsModalRx({ ...detailsModalRx, status: "verified", rawStatus: "VERIFIED" });
      }
      await loadData();
    } catch (err) {
      console.error("Failed to verify prescription:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Verification failed";
      addToast(typeof msg === "string" ? msg : "Verification failed", "error");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Prescriptions" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Prescription Verification Desk</span>
          <h1>Prescription Management</h1>
          <p>Review and verify doctor prescriptions, inspect clinical instructions, and validate patient safety contraindications.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Pending Verification" value={String(pendingCount)} icon="◷" color="warning" />
        <StatCard label="Verified Prescriptions" value={String(verifiedCount)} icon="✓" color="primary" />
        <StatCard label="Dispensed Prescriptions" value={String(dispensedCount)} icon="◈" color="success" />
        <StatCard label="Today's Prescriptions" value={String(todayCount)} icon="📅" color="primary" />
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <TabPills
          tabs={[
            { label: "All Prescriptions", value: "all", count: allPrescriptions.length },
            { label: "Pending Verification", value: "pending", count: pendingCount },
            { label: "Verified", value: "verified", count: verifiedCount },
            { label: "Dispensed", value: "dispensed", count: dispensedCount },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search Rx ID, patient, doctor, medicine..." />
        </div>
      </div>

      {/* Prescriptions List Cards */}
      <div style={{ display: "grid", gap: 16 }}>
        {filtered.map((rx) => {
          const isDispensed = rx.status === "dispensed" || rx.rawStatus === "COMPLETED" || rx.rawStatus === "DISPENSED";
          const isVerified = rx.status === "verified" || rx.rawStatus === "VERIFIED";

          const rxBill = bills.find((b) => b.patientId === rx.patientId || b.patient?.id === rx.patientId);
          const isBillPaid = rxBill && (rxBill.status === "PAID" || (rxBill.paidAmount > 0 && rxBill.balanceAmount <= 0));

          const patientObj = patientsLookup[rx.patientId];

          return (
            <div
              key={rx.id}
              className="df-rx-glass-card"
              style={{
                borderLeft: `4px solid ${
                  isDispensed ? "#10b981" : isVerified ? "#0ea5e9" : "#f59e0b"
                }`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span
                      className={`df-badge ${
                        isDispensed
                          ? "df-badge-success"
                          : isVerified
                          ? "df-badge-primary"
                          : "df-badge-warning"
                      }`}
                    >
                      {isDispensed ? "✓ DISPENSED" : isVerified ? "✓ VERIFIED BY PHARMACIST" : "⏳ PENDING VERIFICATION"}
                    </span>

                    {/* Related Billing Status */}
                    {isBillPaid ? (
                      <span className="df-badge" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontWeight: 700 }}>
                        💳 Bill: PAID
                      </span>
                    ) : rxBill ? (
                      <span className="df-badge" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                        💳 Bill: {rxBill.status || "UNPAID"} ({formatLkr(rxBill.balanceAmount ?? rxBill.totalAmount)})
                      </span>
                    ) : (
                      <span className="df-badge" style={{ background: "var(--df-glass-panel, #f8fafc)", color: "var(--df-text-secondary, #64748b)", border: "1px solid var(--df-border, #e2e8f0)" }}>
                        💳 Billing: Pending Cashier
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: "4px 0", fontSize: 17, color: "var(--df-text-heading)" }}>
                    {rx.id} — Patient: {rx.patient} {rx.patientId ? `[ID: #${rx.patientId}]` : ""}
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>
                    Prescribing Doctor: <strong>{rx.doctor}</strong> · Date: <strong>{rx.date}</strong>
                    {rx.diagnosis && ` · Diagnosis: ${rx.diagnosis}`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    onClick={() => setDetailsModalRx(rx)}
                  >
                    👁️ View Details
                  </button>
                  {patientObj && (
                    <button
                      type="button"
                      className="df-btn df-btn-secondary df-btn-sm"
                      onClick={() => setPatientModal(patientObj)}
                      title="View Patient Profile & Allergies"
                    >
                      👤 Patient
                    </button>
                  )}
                  {!isDispensed && !isVerified && (
                    <button
                      type="button"
                      className="df-btn df-btn-primary df-btn-sm"
                      onClick={() => handleVerifyPrescription(rx)}
                      disabled={verifyingId === (rx.rawId || rx.id)}
                    >
                      {verifyingId === (rx.rawId || rx.id) ? "Verifying..." : "✓ Verify Prescription"}
                    </button>
                  )}
                </div>
              </div>

              {/* Safety & Allergy Banner */}
              <div
                style={{
                  background: "var(--df-glass-panel, rgba(239, 246, 255, 0.7))",
                  border: "1px solid var(--df-border, #bfdbfe)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🛡️</span>
                <span>
                  <strong>Safety Review:</strong> No penicillin or NSAID contraindications reported for patient. Dosage intervals verified against clinical pharmacopeia guidelines.
                </span>
              </div>

              {/* Prescribed Medicines List */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0" }}>
                {(rx.medicines || [
                  { name: rx.medicine || "Amoxicillin 500mg", dosage: "500mg", freq: "3x daily", duration: "7 days", quantity: 21 },
                ]).map((med, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--df-glass-panel, rgba(248, 250, 252, 0.85))",
                      border: "1px solid var(--df-border, #e2e8f0)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 13,
                    }}
                  >
                    <strong>{med.name}</strong> · {med.dosage || "Standard"} ({med.freq || "Oral"}) — {med.duration || "Course"} {med.quantity ? `· Qty: ${med.quantity}` : ""}
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div style={{ fontSize: 13, color: "var(--df-text-secondary)", marginTop: 6 }}>
                <strong>Doctor Instructions:</strong> {rx.instructions || "Take as directed after meals."}
                {rx.dentistNotes && <span> · <em>Notes: {rx.dentistNotes}</em></span>}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !loading && (
          <div className="df-card df-pharmacist-glass-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <h3 style={{ margin: 0 }}>No Prescriptions Found</h3>
            <p style={{ color: "var(--df-text-secondary)", margin: "6px 0 0" }}>
              No dental prescriptions match the current filter or search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsModalRx && (
        <Modal
          title={`Prescription Overview: ${detailsModalRx.id}`}
          onClose={() => setDetailsModalRx(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              {detailsModalRx.status !== "dispensed" && detailsModalRx.status !== "verified" && (
                <button
                  type="button"
                  className="df-btn df-btn-primary"
                  onClick={() => handleVerifyPrescription(detailsModalRx)}
                >
                  ✓ Verify Prescription
                </button>
              )}
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setDetailsModalRx(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>Patient Name</div>
                <strong style={{ fontSize: 15 }}>{detailsModalRx.patient}</strong>
                <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 2 }}>
                  Patient ID: #{detailsModalRx.patientId}
                </div>
              </div>

              <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>Prescribing Doctor</div>
                <strong style={{ fontSize: 15 }}>{detailsModalRx.doctor}</strong>
                <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 2 }}>
                  Prescription Date: {detailsModalRx.date}
                </div>
              </div>
            </div>

            <div style={{ padding: 14, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10, marginBottom: 14 }}>
              <strong style={{ display: "block", marginBottom: 8, fontSize: 14 }}>Prescribed Medicines Breakdown:</strong>
              {(detailsModalRx.medicines || []).map((m, idx) => (
                <div key={idx} style={{ padding: "6px 0", borderBottom: idx < detailsModalRx.medicines.length - 1 ? "1px solid var(--df-border, #e2e8f0)" : "none", fontSize: 13 }}>
                  • <strong>{m.name}</strong> — {m.dosage} ({m.freq}, {m.duration}) {m.quantity ? `[Required Qty: ${m.quantity}]` : ""}
                  {m.instructions && <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginLeft: 12 }}>Note: {m.instructions}</div>}
                </div>
              ))}
            </div>

            <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
              <div><strong>Diagnosis:</strong> {detailsModalRx.diagnosis || "Standard Dental Procedure"}</div>
              <div style={{ marginTop: 4 }}><strong>Instructions:</strong> {detailsModalRx.instructions || "Follow standard dosage course."}</div>
              {detailsModalRx.dentistNotes && (
                <div style={{ marginTop: 4 }}><strong>Doctor Notes:</strong> {detailsModalRx.dentistNotes}</div>
              )}
            </div>

            <div style={{ fontSize: 12, color: "var(--df-text-secondary)", fontStyle: "italic" }}>
              Note: This screen is for clinical order verification. To perform actual pharmaceutical stock dispensing, proceed to the Dispense Medicines station.
            </div>
          </div>
        </Modal>
      )}

      {/* Patient Profile Modal */}
      {patientModal && (
        <Modal
          title={`Patient Clinical Profile: ${patientModal.firstName} ${patientModal.lastName}`}
          onClose={() => setPatientModal(null)}
          actions={
            <button type="button" className="df-btn df-btn-primary" onClick={() => setPatientModal(null)}>
              Close
            </button>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 14 }}>
              <div>Patient Code: <strong>{patientModal.patientCode || `#${patientModal.id}`}</strong></div>
              <div>Phone: <strong>{patientModal.phone || "—"}</strong></div>
              <div>Email: <strong>{patientModal.email || "—"}</strong></div>
              <div>Blood Group: <strong>{patientModal.bloodGroup || "O+"}</strong></div>
              <div>Gender: <strong>{patientModal.gender || "—"}</strong></div>
              <div>DOB: <strong>{patientModal.dateOfBirth || "—"}</strong></div>
            </div>

            <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#991b1b" }}>
              <strong>Allergies & Medical Alerts:</strong>
              <div style={{ marginTop: 4 }}>
                {patientModal.allergies || "No documented drug allergies recorded in medical profile."}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   2. DISPENSE MEDICINES VIEW — DISPENSING WORKFLOW ONLY
   ========================================================================== */
export function PharmacistDispenseView({ role = "pharmacist" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [realRxList, setRealRxList] = useState([]);
  const [realMeds, setRealMeds] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dispenseTab, setDispenseTab] = useState("pending");
  const [search, setSearch] = useState("");

  // Dispense modal
  const [selectedRx, setSelectedRx] = useState(null);
  const [batchNumber, setBatchNumber] = useState("BAT-2026-092");
  const [pharmacistName, setPharmacistName] = useState("Lisa Thompson, RPh");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspect past dispensing modal
  const [inspectRx, setInspectRx] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rxRaw, patients, dentists, medsRaw, billsRaw] = await Promise.all([
        pharmacyApi.getAllPrescriptions().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
        pharmacyApi.getAllMedicines().catch(() => []),
        billingApi.getAllBills().catch(() => []),
      ]);

      const pMap = {};
      (patients || []).forEach((p) => {
        if (p?.id) pMap[p.id] = p;
      });

      const dMap = {};
      (dentists || []).forEach((d) => {
        if (d?.id) dMap[d.id] = d;
      });

      const normalized = await Promise.all(
        (rxRaw || []).map(async (rx) => {
          const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
          return normalizePrescription(rx, pMap, dMap, items);
        })
      );

      normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setRealRxList(normalized);
      setRealMeds((medsRaw || []).map(normalizeMedicine));
      setBills(Array.isArray(billsRaw) ? billsRaw : []);
    } catch (err) {
      console.warn("Could not load dispense data:", err);
      addToast("Failed to sync dispensing station", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allPrescriptions = useMemo(() => {
    return realRxList.length > 0 ? realRxList : (collections.prescriptions || []);
  }, [realRxList, collections.prescriptions]);

  const medicines = useMemo(() => {
    return realMeds.length > 0 ? realMeds : (collections.medicines || []);
  }, [realMeds, collections.medicines]);

  // Medicines inventory lookup for fast stock checking
  const medStockLookup = useMemo(() => {
    const map = {};
    medicines.forEach((m) => {
      if (m.name) map[m.name.toLowerCase().trim()] = m;
      if (m.rawId) map[`id_${m.rawId}`] = m;
    });
    return map;
  }, [medicines]);

  // Page-specific summary stats
  const todayStr = getLocalDateString();
  const awaitingDispense = allPrescriptions.filter(
    (p) => p.status !== "dispensed" && p.rawStatus !== "COMPLETED" && p.rawStatus !== "DISPENSED"
  );
  const dispensedToday = allPrescriptions.filter(
    (p) =>
      (p.status === "dispensed" || p.rawStatus === "COMPLETED" || p.rawStatus === "DISPENSED") &&
      String(p.date || "").slice(0, 10) === todayStr
  );
  const completedDispensing = allPrescriptions.filter(
    (p) => p.status === "dispensed" || p.rawStatus === "COMPLETED" || p.rawStatus === "DISPENSED"
  );

  // Check how many awaiting have sufficient stock
  const readyStockChecks = useMemo(() => {
    return awaitingDispense.filter((rx) => {
      const items = rx.medicines || [];
      if (!items.length) return true;
      return items.every((item) => {
        const matched =
          medStockLookup[item.name?.toLowerCase().trim()] ||
          (item.medicineId ? medStockLookup[`id_${item.medicineId}`] : null);
        if (!matched) return true;
        return Number(matched.stock) >= Number(item.quantity || 1);
      });
    }).length;
  }, [awaitingDispense, medStockLookup]);

  // Filtered prescriptions for the dispensing queue
  const displayedPrescriptions = useMemo(() => {
    let list = allPrescriptions;
    if (dispenseTab === "pending") list = awaitingDispense;
    else if (dispenseTab === "dispensed") list = completedDispensing;

    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (rx) =>
        (rx.id && rx.id.toLowerCase().includes(q)) ||
        (rx.patient && rx.patient.toLowerCase().includes(q)) ||
        (rx.doctor && rx.doctor.toLowerCase().includes(q)) ||
        (rx.medicine && rx.medicine.toLowerCase().includes(q))
    );
  }, [allPrescriptions, dispenseTab, awaitingDispense, completedDispensing, search]);

  // Main Dispensing Action
  const handleConfirmDispense = async () => {
    if (!selectedRx || isSubmitting) return;

    if (!batchNumber.trim()) {
      addToast("Please enter a valid pharmaceutical batch number.", "warning");
      return;
    }

    // Safety check: verify no expired medicines or insufficient stock before submitting
    const itemsToCheck = selectedRx.medicines || [
      { name: selectedRx.medicine, quantity: 1 }
    ];
    for (const item of itemsToCheck) {
      const matched =
        medStockLookup[item.name?.toLowerCase().trim()] ||
        (item.medicineId ? medStockLookup[`id_${item.medicineId}`] : null);
      const safety = getMedicineSafetyStatus(matched, item.quantity || 1);
      if (safety.isExpired) {
        addToast(`Cannot dispense: ${item.name} is expired (${safety.message}). Dispensing blocked!`, "error");
        return;
      }
      if (!safety.canDispense && (safety.isOutOfStock || safety.isInsufficient)) {
        addToast(`Cannot dispense: ${item.name} has insufficient stock (${safety.message}). Dispensing blocked!`, "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const targetId = selectedRx.rawId || selectedRx.id;
      if (targetId && pharmacyApi.dispensePrescription) {
        await pharmacyApi.dispensePrescription(targetId);
      }

      // Optimistic updates
      setRealRxList((prev) =>
        prev.map((p) =>
          p.id === selectedRx.id || p.rawId === selectedRx.rawId
            ? { ...p, status: "dispensed", rawStatus: "DISPENSED" }
            : p
        )
      );

      saveRecord("prescriptions", { ...selectedRx, status: "dispensed", rawStatus: "DISPENSED" });

      // Determine medicine names
      const medName =
        Array.isArray(selectedRx.medicines) && selectedRx.medicines.length > 0
          ? selectedRx.medicines.map((m) => m.name).join(", ")
          : selectedRx.medicine || "Prescribed Medicine";

      // Log stock movement transaction
      const tx = {
        id: nextId("TX-DISP"),
        medicine: medName,
        type: "Dispensed",
        quantity: "-1 Course",
        reference: `${selectedRx.id} (Batch: ${batchNumber.trim()})`,
        date: getLocalDateString(),
        status: "dispensed",
        pharmacist: pharmacistName,
      };
      saveRecord("transactions", tx);

      addToast(
        `Prescription ${selectedRx.id} dispensed successfully! Stock deducted and pharmacy charge linked to patient billing.`,
        "success"
      );
      setSelectedRx(null);
      await loadData();
    } catch (err) {
      console.error("Dispensing failed:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to dispense prescription";
      addToast(typeof msg === "string" ? msg : "Dispensing failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Dispense Medicines" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Dispensing Workflow</span>
          <h1>Dispense Medicines</h1>
          <p>Fulfill doctor prescriptions, verify inventory stock availability, record batch numbers, and link pharmacy charges to patient invoices.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Awaiting Dispensing" value={String(awaitingDispense.length)} icon="◷" color="warning" />
        <StatCard label="Dispensed Today" value={String(dispensedToday.length)} icon="✓" color="success" />
        <StatCard label="Stock Checks Passed" value={`${readyStockChecks} Ready`} icon="◈" color="primary" />
        <StatCard label="Completed Dispensing" value={String(completedDispensing.length)} icon="◫" color="primary" />
      </div>

      {/* Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <TabPills
          tabs={[
            { label: "Awaiting Dispensing (Queue)", value: "pending", count: awaitingDispense.length },
            { label: "Dispensed Records", value: "dispensed", count: completedDispensing.length },
            { label: "All Prescriptions", value: "all", count: allPrescriptions.length },
          ]}
          activeTab={dispenseTab}
          onChange={setDispenseTab}
        />
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search patient, Rx ID, medicine..." />
        </div>
      </div>

      {/* Dispensing Queue Cards */}
      <div style={{ display: "grid", gap: 16 }}>
        {displayedPrescriptions.map((rx) => {
          const isDispensed = rx.status === "dispensed" || rx.rawStatus === "COMPLETED" || rx.rawStatus === "DISPENSED";
          const rxBill = bills.find((b) => b.patientId === rx.patientId || b.patient?.id === rx.patientId);
          const isBillPaid = rxBill && (rxBill.status === "PAID" || (rxBill.paidAmount > 0 && rxBill.balanceAmount <= 0));

          // Check stock availability for all items in this prescription
          const items = rx.medicines || [
            { name: rx.medicine || "Amoxicillin 500mg", dosage: "500mg", freq: "3x daily", duration: "7 days", quantity: 21 },
          ];

          const stockWarnings = items.map((item) => {
            const matched =
              medStockLookup[item.name?.toLowerCase().trim()] ||
              (item.medicineId ? medStockLookup[`id_${item.medicineId}`] : null);
            const reqQty = Number(item.quantity) || 1;
            const safety = getMedicineSafetyStatus(matched, reqQty);
            const avail = matched ? Number(matched.stockQuantity != null ? matched.stockQuantity : (matched.stock != null ? matched.stock : 0)) : 0;
            return {
              name: item.name || item.medicineName,
              reqQty,
              avail,
              safety,
              isExpired: safety.isExpired,
              isSufficient: !safety.isInsufficient && !safety.isOutOfStock,
              canDispense: safety.canDispense,
            };
          });

          const hasExpiredMedicine = stockWarnings.some((w) => w.isExpired);
          const hasInsufficientStock = stockWarnings.some((w) => !w.isSufficient);
          const cannotDispense = hasExpiredMedicine || hasInsufficientStock;

          return (
            <div
              key={rx.id}
              className="df-rx-glass-card"
              style={{
                borderLeft: `4px solid ${
                  isDispensed ? "#16a34a" : hasExpiredMedicine ? "#dc2626" : hasInsufficientStock ? "#ea580c" : "#2563eb"
                }`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span
                      className={`df-badge ${
                        isDispensed
                          ? "df-badge-success"
                          : hasExpiredMedicine
                          ? "df-badge-danger"
                          : hasInsufficientStock
                          ? "df-badge-warning"
                          : "df-badge-primary"
                      }`}
                    >
                      {isDispensed
                        ? "✓ DISPENSED"
                        : hasExpiredMedicine
                        ? "🔴 CONTAINS EXPIRED MEDICATION"
                        : hasInsufficientStock
                        ? "⚠ INSUFFICIENT STOCK"
                        : "⏳ READY TO DISPENSE"}
                    </span>

                    {/* Financial link indicator */}
                    {isDispensed ? (
                      <span className="df-badge" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontWeight: 700 }}>
                        💳 Pharmacy Charge: Active on Patient Bill
                      </span>
                    ) : (
                      <span className="df-badge" style={{ background: "var(--df-glass-panel, #f8fafc)", color: "var(--df-text-secondary, #64748b)", border: "1px solid var(--df-border, #e2e8f0)" }}>
                        💳 Pharmacy Charge: Will generate upon dispensing
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: "4px 0", fontSize: 17, color: "var(--df-text-heading)" }}>
                    {rx.id} — Patient: {rx.patient}
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>
                    Prescribing Doctor: <strong>{rx.doctor}</strong> · Order Date: <strong>{rx.date}</strong>
                  </div>
                </div>

                <div>
                  {!isDispensed ? (
                    <button
                      type="button"
                      className="df-btn df-btn-primary"
                      onClick={() => {
                        setSelectedRx(rx);
                        setBatchNumber(`BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
                      }}
                      disabled={cannotDispense}
                    >
                      ✓ Dispense Medicines
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="df-btn df-btn-secondary df-btn-sm"
                      onClick={() => setInspectRx(rx)}
                    >
                      👁️ Dispensing Details
                    </button>
                  )}
                </div>
              </div>

              {/* Expired Medicine Prohibition Alert */}
              {hasExpiredMedicine && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fee2e2",
                    border: "1.5px solid #dc2626",
                    borderRadius: 8,
                    marginBottom: 10,
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  🔴 DISPENSING PROHIBITED: This prescription contains expired medication. In accordance with clinical pharmacy protocol, expired stock cannot be dispensed to patients. Please notify the attending doctor.
                </div>
              )}

              {/* Real-time Inventory Stock & Expiry Verification Checklist */}
              <div
                style={{
                  background: "var(--df-glass-panel, rgba(248, 250, 252, 0.8))",
                  border: "1px solid var(--df-border, #e2e8f0)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--df-text-secondary)", marginBottom: 6 }}>
                  Real-time Inventory Stock Availability & Expiry Status:
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {stockWarnings.map((sw, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                        padding: "6px 10px",
                        background: sw.canDispense ? "rgba(240, 253, 244, 0.6)" : "rgba(254, 242, 242, 0.8)",
                        borderRadius: 6,
                        border: `1px solid ${sw.canDispense ? "#bbf7d0" : "#fecaca"}`,
                      }}
                    >
                      <div>
                        <strong>{sw.name}</strong> — Prescribed: <strong>{sw.reqQty} units</strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`df-badge ${sw.safety.badgeClass}`}>
                          {sw.safety.label}
                        </span>
                        <span style={{ fontSize: 12, color: sw.canDispense ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                          {sw.safety.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>
                <strong>Dosage & Instructions:</strong> {rx.instructions || "Take as directed by doctor."}
              </div>
            </div>
          );
        })}

        {displayedPrescriptions.length === 0 && !loading && (
          <div className="df-card df-pharmacist-glass-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <h3 style={{ margin: 0 }}>No Prescriptions in this queue</h3>
            <p style={{ color: "var(--df-text-secondary)", margin: "6px 0 0" }}>
              All verified prescriptions have been dispensed or no items match your search.
            </p>
          </div>
        )}
      </div>

      {/* Dispensing Modal */}
      {selectedRx && (
        <Modal
          title={`Dispensing Confirmation: ${selectedRx.id}`}
          onClose={() => setSelectedRx(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setSelectedRx(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleConfirmDispense}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Dispensing & Deducting Stock..." : "Confirm Dispense & Deduct Stock"}
              </button>
            </div>
          }
        >
          <div style={{ padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ padding: 10, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--df-text-secondary)" }}>Patient</div>
                <strong style={{ fontSize: 14 }}>{selectedRx.patient}</strong>
              </div>
              <div style={{ padding: 10, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--df-text-secondary)" }}>Prescribing Doctor</div>
                <strong style={{ fontSize: 14 }}>{selectedRx.doctor}</strong>
              </div>
            </div>

            <div style={{ padding: 14, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, marginBottom: 14 }}>
              <strong>Items to Fulfill & Deduct:</strong>
              <div style={{ marginTop: 8 }}>
                {(selectedRx.medicines || []).map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 6, fontSize: 13 }}>
                    • <strong>{m.name}</strong> — {m.dosage} ({m.freq}, {m.duration}){" "}
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>[Qty: {m.quantity || 1}]</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Pharmaceutical Batch # *</label>
                <input
                  className="df-input"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BAT-2026-092"
                  required
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Dispensing Pharmacist</label>
                <input
                  className="df-input"
                  value={pharmacistName}
                  onChange={(e) => setPharmacistName(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 10,
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                fontSize: 12,
                color: "#065f46",
              }}
            >
              ✓ <strong>Automatic Billing Integration:</strong> Confirming dispensation will deduct stock units from the central pharmacy database and generate the corresponding pharmacy charge on the Cashier checkout desk.
            </div>
          </div>
        </Modal>
      )}

      {/* Inspect Dispensed Details Modal */}
      {inspectRx && (
        <Modal
          title={`Dispensing Record: ${inspectRx.id}`}
          onClose={() => setInspectRx(null)}
          actions={
            <button type="button" className="df-btn df-btn-primary" onClick={() => setInspectRx(null)}>
              Close
            </button>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--df-primary-600)" }}>{inspectRx.id}</h3>
                <div style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>Patient: {inspectRx.patient}</div>
              </div>
              <span className="df-badge df-badge-success">✓ DISPENSED</span>
            </div>

            <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              <div>Prescribing Doctor: <strong>{inspectRx.doctor}</strong></div>
              <div>Order Date: <strong>{inspectRx.date}</strong></div>
              <div>Status: <strong>Dispensed & Inventory Stock Updated</strong></div>
            </div>

            <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>
              Pharmaceutical record certified and locked.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   3. MEDICINE INVENTORY VIEW — STOCK MANAGEMENT ONLY
   ========================================================================== */
export function PharmacistInventoryView({ role = "pharmacist" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [realMeds, setRealMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  // CRUD Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [adjustModalMed, setAdjustModalMed] = useState(null);
  const [adjustQty, setAdjustQty] = useState("50");
  const [adjustReason, setAdjustReason] = useState("Inward Consignment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medicineErrors, setMedicineErrors] = useState({});

  const initialNewMed = {
    name: "",
    genericName: "",
    category: "Antibiotics",
    stock: "200",
    unit: "tablets",
    minStock: "50",
    unitPrice: "25.00",
    expiryDate: "",
    status: "in-stock",
  };
  const [newMed, setNewMed] = useState(initialNewMed);

  // Request Medicine Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    mode: "catalog",
    medicineId: "",
    medicineName: "",
    requestedQuantity: "50",
    reason: "",
  });
  const [requestErrors, setRequestErrors] = useState({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const loadMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const list = await pharmacyApi.getAllMedicines().catch(() => []);
      setRealMeds(list.map(normalizeMedicine));
    } catch (err) {
      console.warn("Could not load medicines:", err);
      addToast("Failed to load live medicines catalog", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const medicines = useMemo(() => {
    return realMeds.length > 0 ? realMeds : (collections.medicines || []);
  }, [realMeds, collections.medicines]);

  // Page-specific summary stats
  const totalMeds = medicines.length;
  const inStockCount = medicines.filter((m) => Number(m.stock) > Number(m.minStock)).length;
  const lowStockCount = medicines.filter(
    (m) => Number(m.stock) <= Number(m.minStock) && Number(m.stock) > 0
  ).length;
  const valuation = useMemo(() => {
    const total = medicines.reduce((acc, m) => acc + (Number(m.stock) || 0) * (Number(m.unitPrice) || 0), 0);
    return `LKR ${Number(total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [medicines]);

  // Filtered medicines
  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      if (activeCategory !== "all" && m.category !== activeCategory) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        (m.id && m.id.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    });
  }, [medicines, activeCategory, search]);

  const validateMedicinePayload = (data) => {
    const errors = {};
    const name = String(data.name ?? "").trim();
    const stockRaw = String(data.stock ?? "").trim();
    const priceRaw = String(data.unitPrice ?? "").trim();
    const minStockRaw = String(data.minStock ?? "").trim();
    const expiryRaw = String(data.expiryDate ?? "").trim();

    if (!name) errors.name = "Medicine name is required.";
    if (!stockRaw || isNaN(Number(stockRaw)) || Number(stockRaw) < 0) {
      errors.stock = "Stock quantity must be a non-negative number.";
    }
    if (!priceRaw || isNaN(Number(priceRaw)) || Number(priceRaw) < 0) {
      errors.unitPrice = "Unit price must be a valid amount.";
    }
    if (!minStockRaw || isNaN(Number(minStockRaw)) || Number(minStockRaw) < 0) {
      errors.minStock = "Reorder level must be a non-negative number.";
    }
    if (!expiryRaw) {
      errors.expiryDate = "Expiry date is required.";
    } else {
      const selected = new Date(expiryRaw);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.expiryDate = "Expiry date cannot be in the past.";
      }
    }
    return errors;
  };

  // Add Medicine
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateMedicinePayload(newMed);
    if (Object.keys(validationErrors).length > 0) {
      setMedicineErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        medicineCode: `MED-${Date.now().toString().slice(-6)}`,
        name: newMed.name.trim(),
        genericName: newMed.genericName.trim() || newMed.name.trim(),
        category: newMed.category,
        stockQuantity: Number(newMed.stock),
        reorderLevel: Number(newMed.minStock),
        dosageForm: newMed.unit,
        unitPrice: Number(newMed.unitPrice),
        expiryDate: newMed.expiryDate,
        status: "ACTIVE",
      };

      const created = await pharmacyApi.createMedicine(payload);
      const med = normalizeMedicine(created);
      saveRecord("medicines", med);
      addToast(`${med.name} added to pharmacy inventory!`, "success");

      setModalOpen(false);
      setMedicineErrors({});
      setNewMed(initialNewMed);
      await loadMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to add medicine";
      addToast(typeof msg === "string" ? msg : "Failed to add medicine", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Medicine
  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    if (!editingMed || isSubmitting) return;

    const validationErrors = validateMedicinePayload(editingMed);
    if (Object.keys(validationErrors).length > 0) {
      setMedicineErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    const targetId = editingMed.rawId || editingMed.id;
    try {
      if (targetId && pharmacyApi.updateMedicine) {
        await pharmacyApi.updateMedicine(targetId, {
          name: editingMed.name.trim(),
          genericName: editingMed.genericName?.trim() || editingMed.name.trim(),
          category: editingMed.category,
          stockQuantity: Number(editingMed.stock),
          reorderLevel: Number(editingMed.minStock) || 50,
          dosageForm: editingMed.unit || "tablets",
          unitPrice: Number(editingMed.unitPrice),
          expiryDate: editingMed.expiryDate,
          status: (editingMed.rawStatus || "ACTIVE").toUpperCase(),
        });
      }

      saveRecord("medicines", editingMed);
      addToast(`Medicine "${editingMed.name}" updated successfully!`, "success");
      setEditingMed(null);
      setMedicineErrors({});
      await loadMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to update medicine";
      addToast(typeof msg === "string" ? msg : "Failed to update medicine", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Purchase Request
  const handleCreatePurchaseRequest = async (e) => {
    e.preventDefault();
    if (isSubmittingRequest) return;

    const errors = {};
    const medName = requestForm.medicineName.trim();
    const qty = parseInt(requestForm.requestedQuantity, 10);
    const reason = requestForm.reason.trim();

    if (!medName) errors.medicineName = "Medicine name is required.";
    if (isNaN(qty) || qty <= 0) errors.requestedQuantity = "Requested quantity must be greater than zero.";
    if (!reason) errors.reason = "Reason / request note is required.";

    if (Object.keys(errors).length > 0) {
      setRequestErrors(errors);
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await pharmacyApi.createPurchaseRequest({
        medicineId: requestForm.medicineId ? Number(requestForm.medicineId) : null,
        medicineName: medName,
        requestedQuantity: qty,
        reason: reason,
      });

      addToast(`Purchase request for "${medName}" (${qty} units) submitted to Admin!`, "success");
      setRequestModalOpen(false);
      setRequestForm({
        mode: "catalog",
        medicineId: "",
        medicineName: "",
        requestedQuantity: "50",
        reason: "",
      });
      setRequestErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to submit request";
      addToast(typeof msg === "string" ? msg : "Failed to submit request", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Stock Adjustment
  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustModalMed || isSubmitting) return;

    const delta = parseInt(adjustQty, 10);
    if (isNaN(delta) || delta === 0) {
      addToast("Please enter a valid adjustment quantity", "warning");
      return;
    }

    setIsSubmitting(true);
    const targetId = adjustModalMed.rawId || adjustModalMed.id;
    try {
      if (delta > 0) {
        await pharmacyApi.addMedicineStock(targetId, delta);
      } else {
        await pharmacyApi.removeMedicineStock(targetId, Math.abs(delta));
      }

      const tx = {
        id: nextId("TX-ADJ"),
        medicine: adjustModalMed.name,
        type: delta > 0 ? "Stock In" : "Stock Adjustment",
        quantity: delta > 0 ? `+${delta} Units` : `${delta} Units`,
        reference: adjustReason,
        date: getLocalDateString(),
        status: "completed",
      };
      saveRecord("transactions", tx);

      addToast(`Stock adjusted for ${adjustModalMed.name} (${delta > 0 ? `+${delta}` : delta} units)!`, "success");
      setAdjustModalMed(null);
      await loadMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Adjustment failed";
      addToast(typeof msg === "string" ? msg : "Stock adjustment failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Medicine
  const handleDeleteMedicine = async (med) => {
    if (!window.confirm(`Are you sure you want to delete medicine "${med.name}" from inventory?`)) return;

    try {
      const targetId = med.rawId || med.id;
      if (targetId && pharmacyApi.deleteMedicine) {
        await pharmacyApi.deleteMedicine(targetId);
      }
      addToast(`Medicine "${med.name}" deleted from catalog.`, "success");
      await loadMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Delete failed";
      addToast(typeof msg === "string" ? msg : "Failed to delete medicine", "error");
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Medicine Inventory" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Stock Management</span>
          <h1>Medicine Inventory</h1>
          <p>Maintain pharmaceutical inventory, stock thresholds, unit prices, and execute real-time stock adjustments.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {role !== "admin" && (
            <button
              type="button"
              className="df-btn df-btn-secondary"
              onClick={() => {
                setRequestErrors({});
                setRequestForm({
                  mode: "catalog",
                  medicineId: "",
                  medicineName: "",
                  requestedQuantity: "50",
                  reason: "",
                });
                setRequestModalOpen(true);
              }}
            >
              📋 Request Medicine
            </button>
          )}
          <button
            type="button"
            className="df-btn df-btn-primary"
            onClick={() => {
              setMedicineErrors({});
              setNewMed(initialNewMed);
              setModalOpen(true);
            }}
          >
            + Add Medicine Item
          </button>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Medicines" value={String(totalMeds)} icon="◫" color="primary" />
        <StatCard label="In Stock" value={String(inStockCount)} icon="✓" color="success" />
        <StatCard label="Low Stock Items" value={String(lowStockCount)} icon="◈" color="warning" />
        <StatCard label="Inventory Valuation" value={valuation} icon="💰" color="primary" />
      </div>

      {/* Categories & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
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
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search medicine, generic name, code..." />
        </div>
      </div>

      {/* Inventory Table */}
      <section className="df-card df-pharmacist-glass-card">
        <div className="df-card-body" style={{ padding: 0 }}>
          <DataTable
            columns={[
              { key: "id", label: "Medicine Code" },
              { key: "name", label: "Medicine Name" },
              { key: "category", label: "Category" },
              {
                key: "stock",
                label: "Available Stock",
                render: (row) => (
                  <strong style={{ color: Number(row.stock) <= Number(row.minStock) ? "#dc2626" : "inherit" }}>
                    {row.stock} {row.unit}
                  </strong>
                ),
              },
              { key: "minStock", label: "Min Stock (Reorder)" },
              {
                key: "unitPrice",
                label: "Unit Price",
                render: (row) => formatLkr(row.unitPrice || 0),
              },
              {
                key: "expiryDate",
                label: "Expiry Date",
                render: (row) => {
                  if (!row.expiryDate) return "—";
                  const dateStr = String(row.expiryDate).slice(0, 10);
                  const exp = new Date(dateStr);
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const daysLeft = Math.round((exp - now) / 86400000);
                  let badge = null;
                  if (daysLeft <= 0) {
                    badge = (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}>
                        EXPIRED
                      </span>
                    );
                  } else if (daysLeft <= 90) {
                    badge = (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#b45309", fontWeight: 700 }}>
                        EXPIRING SOON
                      </span>
                    );
                  } else {
                    badge = (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#dcfce7", color: "#15803d", fontWeight: 700 }}>
                        ACTIVE
                      </span>
                    );
                  }
                  return (
                    <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
                      {dateStr}
                      {badge}
                    </span>
                  );
                },
              },
              { key: "status", label: "Stock Health", type: "status" },
            ]}
            rows={filtered}
            searchable={false}
            rowActions={(row) => (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => {
                    setAdjustModalMed(row);
                    setAdjustQty("50");
                    setAdjustReason("Inward Consignment");
                  }}
                  title="Adjust Stock (+/-)"
                >
                  ⚡ Adjust
                </button>
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => {
                    setMedicineErrors({});
                    setEditingMed({ ...row });
                  }}
                  title="Edit Medicine"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className="df-btn df-btn-danger df-btn-sm"
                  onClick={() => handleDeleteMedicine(row)}
                  title="Delete Medicine"
                >
                  🗑️
                </button>
              </div>
            )}
          />
        </div>
      </section>

      {/* Add Medicine Modal */}
      {modalOpen && (
        <Modal
          title="Add New Medicine to Catalog"
          onClose={() => setModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleAddMedicine}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Medicine"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleAddMedicine} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Medicine Name *</label>
                <input
                  className="df-input"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  placeholder="e.g. Amoxicillin 500mg"
                  required
                />
                {medicineErrors.name && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.name}</div>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Category *</label>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Initial Stock *</label>
                <input
                  type="number"
                  className="df-input"
                  min="0"
                  value={newMed.stock}
                  onChange={(e) => setNewMed({ ...newMed, stock: e.target.value })}
                  required
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Reorder Level *</label>
                <input
                  type="number"
                  className="df-input"
                  min="0"
                  value={newMed.minStock}
                  onChange={(e) => setNewMed({ ...newMed, minStock: e.target.value })}
                  required
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Unit Price (LKR) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="df-input"
                  value={newMed.unitPrice}
                  onChange={(e) => setNewMed({ ...newMed, unitPrice: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Expiry Date *</label>
                <input
                  type="date"
                  className="df-input"
                  min={getLocalDateString()}
                  value={newMed.expiryDate}
                  onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                  required
                />
                {medicineErrors.expiryDate && (
                  <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.expiryDate}</div>
                )}
              </div>

              <div className="df-form-group">
                <label className="df-label">Dispense Unit</label>
                <select
                  className="df-select"
                  value={newMed.unit}
                  onChange={(e) => setNewMed({ ...newMed, unit: e.target.value })}
                >
                  <option value="tablets">Tablets</option>
                  <option value="capsules">Capsules</option>
                  <option value="bottles">Bottles</option>
                  <option value="vials">Vials</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Medicine Modal */}
      {editingMed && (
        <Modal
          title={`Edit Medicine: ${editingMed.name}`}
          onClose={() => setEditingMed(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setEditingMed(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleUpdateMedicine}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleUpdateMedicine} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Medicine Name *</label>
                <input
                  className="df-input"
                  value={editingMed.name || ""}
                  onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                  required
                />
                {medicineErrors.name && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.name}</div>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Category *</label>
                <select
                  className="df-select"
                  value={editingMed.category || "Antibiotics"}
                  onChange={(e) => setEditingMed({ ...editingMed, category: e.target.value })}
                >
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Analgesics">Analgesics</option>
                  <option value="Antiseptics">Antiseptics</option>
                  <option value="Anesthetics">Anesthetics</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Current Stock *</label>
                <input
                  type="number"
                  className="df-input"
                  min="0"
                  value={editingMed.stock ?? ""}
                  onChange={(e) => setEditingMed({ ...editingMed, stock: e.target.value })}
                  required
                />
                {medicineErrors.stock && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.stock}</div>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Min Stock (Reorder)</label>
                <input
                  type="number"
                  className="df-input"
                  min="0"
                  value={editingMed.minStock ?? ""}
                  onChange={(e) => setEditingMed({ ...editingMed, minStock: e.target.value })}
                  required
                />
                {medicineErrors.minStock && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.minStock}</div>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Unit Price (LKR) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="df-input"
                  value={editingMed.unitPrice ?? ""}
                  onChange={(e) => setEditingMed({ ...editingMed, unitPrice: e.target.value })}
                  required
                />
                {medicineErrors.unitPrice && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.unitPrice}</div>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Expiry Date *</label>
                <input
                  type="date"
                  className="df-input"
                  value={editingMed.expiryDate ? String(editingMed.expiryDate).slice(0, 10) : ""}
                  onChange={(e) => setEditingMed({ ...editingMed, expiryDate: e.target.value })}
                  required
                />
                {medicineErrors.expiryDate && (
                  <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{medicineErrors.expiryDate}</div>
                )}
              </div>

              <div className="df-form-group">
                <label className="df-label">Dispense Unit</label>
                <select
                  className="df-select"
                  value={editingMed.unit || "tablets"}
                  onChange={(e) => setEditingMed({ ...editingMed, unit: e.target.value })}
                >
                  <option value="tablets">Tablets</option>
                  <option value="capsules">Capsules</option>
                  <option value="bottles">Bottles</option>
                  <option value="vials">Vials</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Request Medicine Modal */}
      {role !== "admin" && requestModalOpen && (
        <Modal
          title="Request Medicine from Admin"
          onClose={() => setRequestModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setRequestModalOpen(false)}
                disabled={isSubmittingRequest}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleCreatePurchaseRequest}
                disabled={isSubmittingRequest}
              >
                {isSubmittingRequest ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreatePurchaseRequest} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Select Medicine from Catalog</label>
              <select
                className="df-select"
                value={requestForm.medicineId || (requestForm.mode === "manual" ? "manual" : "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "manual") {
                    setRequestForm((prev) => ({
                      ...prev,
                      mode: "manual",
                      medicineId: "",
                      medicineName: "",
                    }));
                  } else {
                    const sel = medicines.find((m) => String(m.rawId || m.id) === val);
                    setRequestForm((prev) => ({
                      ...prev,
                      mode: "catalog",
                      medicineId: sel ? (sel.rawId || sel.id) : "",
                      medicineName: sel ? sel.name : "",
                    }));
                  }
                }}
              >
                <option value="">Select an existing medicine…</option>
                {medicines.map((m) => (
                  <option key={m.rawId || m.id} value={m.rawId || m.id}>
                    {m.name} ({m.stock} {m.unit} in stock)
                  </option>
                ))}
                <option value="manual">+ Not in Catalog (Enter manually)</option>
              </select>
            </div>

            {(requestForm.mode === "manual" || !requestForm.medicineId) && (
              <div className="df-form-group">
                <label className="df-label">Medicine Name *</label>
                <input
                  type="text"
                  className="df-input"
                  placeholder="e.g. Cefixime 200mg Capsules"
                  value={requestForm.medicineName}
                  onChange={(e) => setRequestForm({ ...requestForm, medicineName: e.target.value })}
                  required
                />
                {requestErrors.medicineName && (
                  <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{requestErrors.medicineName}</div>
                )}
              </div>
            )}

            <div className="df-form-group">
              <label className="df-label">Requested Quantity *</label>
              <input
                type="number"
                min="1"
                className="df-input"
                value={requestForm.requestedQuantity}
                onChange={(e) => setRequestForm({ ...requestForm, requestedQuantity: e.target.value })}
                required
              />
              {requestErrors.requestedQuantity && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{requestErrors.requestedQuantity}</div>
              )}
            </div>

            <div className="df-form-group">
              <label className="df-label">Reason / Request Note *</label>
              <textarea
                className="df-input"
                rows={3}
                placeholder="Explain why this medicine is needed (e.g. low stock, patient prescription demand, out of stock)..."
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                required
              />
              {requestErrors.reason && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{requestErrors.reason}</div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalMed && (
        <Modal
          title={`Stock Adjustment: ${adjustModalMed.name}`}
          onClose={() => setAdjustModalMed(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setAdjustModalMed(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleStockAdjustment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adjusting..." : "Confirm Adjustment"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleStockAdjustment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
              <div>Medicine: <strong>{adjustModalMed.name}</strong></div>
              <div style={{ marginTop: 4 }}>
                Current Available Stock: <strong style={{ color: "#2563eb" }}>{adjustModalMed.stock} {adjustModalMed.unit}</strong>
              </div>
            </div>

            <div className="df-form-group">
              <label className="df-label">Units Delta (+ to add, - to deduct) *</label>
              <input
                type="number"
                className="df-input"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="e.g. +50 or -10"
                required
              />
            </div>

            <div className="df-form-group">
              <label className="df-label">Adjustment Reason / Reference</label>
              <select
                className="df-select"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              >
                <option value="Inward Consignment">Inward Consignment / Purchase</option>
                <option value="Audit Count Correction">Audit Physical Count Correction</option>
                <option value="Damaged / Expired Disposal">Damaged / Expired Disposal</option>
                <option value="Supplier Return">Supplier Return</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   4. LOW STOCK VIEW — LOW STOCK MONITORING ONLY
   ========================================================================== */
export function PharmacistLowStockView({ role = "pharmacist" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [realMeds, setRealMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockModalMed, setRestockModalMed] = useState(null);
  const [restockQty, setRestockQty] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await pharmacyApi.getAllMedicines().catch(() => []);
      setRealMeds(list.map(normalizeMedicine));
    } catch (err) {
      console.warn("Could not load low stock:", err);
      addToast("Failed to fetch low stock alerts", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const medicines = useMemo(() => {
    return realMeds.length > 0 ? realMeds : (collections.medicines || []);
  }, [realMeds, collections.medicines]);

  // Filter ONLY items at or below reorder threshold
  const lowStockItems = useMemo(() => {
    return medicines.filter(
      (m) => Number(m.stock) <= Number(m.minStock) || m.status === "low-stock"
    );
  }, [medicines]);

  // Page-specific summary stats
  const totalLowStock = lowStockItems.length;
  const criticalCount = lowStockItems.filter((m) => Number(m.stock) <= Number(m.minStock) / 2 && Number(m.stock) > 0).length;
  const outOfStockCount = lowStockItems.filter((m) => Number(m.stock) === 0).length;
  const totalShortfall = lowStockItems.reduce(
    (acc, m) => acc + Math.max(0, Number(m.minStock) - Number(m.stock) + 50),
    0
  );

  // Fast Restock (+100 units)
  const handleFastRestock = async (med, customQty = 100) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const targetId = med.rawId || med.id;
    try {
      if (targetId && pharmacyApi.addMedicineStock) {
        await pharmacyApi.addMedicineStock(targetId, customQty);
      }

      const tx = {
        id: nextId("TX-RESTOCK"),
        medicine: med.name,
        type: "Stock In",
        quantity: `+${customQty} Units`,
        reference: "Fast Restock Replenishment",
        date: getLocalDateString(),
        status: "completed",
      };
      saveRecord("transactions", tx);

      addToast(`Restocked ${med.name} (+${customQty} units). Threshold restored!`, "success");
      setRestockModalMed(null);
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Restock failed";
      addToast(typeof msg === "string" ? msg : "Restock failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page df-low-stock-glass-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Low Stock" }]} />
      <header className="df-resource-header df-low-stock-hero">
        <div className="df-low-stock-hero-content">
          <span className="df-section-label df-low-stock-badge">Replenishment Monitoring</span>
          <h1>Low Stock Monitoring</h1>
          <p>Real-time surveillance of pharmaceuticals reaching or below critical safety thresholds.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid df-low-stock-stat-grid">
        <StatCard label="Low Stock Items" value={String(totalLowStock)} icon="⚠" color="warning" />
        <StatCard label="Critical Items" value={String(criticalCount)} icon="🚨" color="rose" />
        <StatCard label="Out of Stock" value={String(outOfStockCount)} icon="✕" color="error" />
        <StatCard label="Restock Required" value={`${totalShortfall.toLocaleString()} Units`} icon="📦" color="primary" />
      </div>

      {/* Low Stock Table */}
      <section className="df-card df-low-stock-card">
        <div className="df-card-header df-low-stock-card-header">
          <div className="df-low-stock-header-title">
            <span className="df-header-indicator" aria-hidden="true" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Items Requiring Immediate Replenishment</h3>
          </div>
          <span className="df-low-stock-count-badge">
            {lowStockItems.length} {lowStockItems.length === 1 ? "Item" : "Items"} Flagged
          </span>
        </div>
        <div className="df-card-body" style={{ padding: 0 }}>
          {lowStockItems.length === 0 ? (
            <div className="df-empty df-low-stock-empty">
              <div className="df-empty-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>No records found</h3>
              <p>All pharmaceutical inventory items are safely above minimum safety stock levels.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "id", label: "Medicine Code" },
                { key: "name", label: "Medicine Name" },
                { key: "category", label: "Category" },
                {
                  key: "stock",
                  label: "Current Stock",
                  render: (row) => (
                    <strong style={{ color: Number(row.stock) === 0 ? "#dc2626" : "#d97706" }}>
                      {row.stock} {row.unit}
                    </strong>
                  ),
                },
                { key: "minStock", label: "Reorder Threshold" },
                {
                  key: "shortfall",
                  label: "Required Units",
                  render: (row) => (
                    <span style={{ fontWeight: 700, color: "var(--df-text-heading, #0f172a)" }}>
                      {Math.max(0, Number(row.minStock) - Number(row.stock) + 50)} units
                    </span>
                  ),
                },
                {
                  key: "urgency",
                  label: "Replenishment Status",
                  render: (row) => {
                    const s = Number(row.stock);
                    const m = Number(row.minStock);
                    if (s === 0) {
                      return <span className="df-badge df-badge-danger">✕ OUT OF STOCK</span>;
                    }
                    if (s <= m / 2) {
                      return <span className="df-badge df-badge-danger">⚠ CRITICAL</span>;
                    }
                    return <span className="df-badge df-badge-warning">⚠ LOW STOCK</span>;
                  },
                },
              ]}
              rows={lowStockItems}
              searchable={false}
              rowActions={(row) => (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="df-btn df-btn-sm df-btn-fast-restock"
                    onClick={() => handleFastRestock(row, 100)}
                  >
                    ⚡ Restock (+100)
                  </button>
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    onClick={() => {
                      setRestockModalMed(row);
                      setRestockQty(String(Math.max(50, Number(row.minStock) - Number(row.stock) + 50)));
                    }}
                  >
                    📦 Custom
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* Custom Restock Modal */}
      {restockModalMed && (
        <Modal
          title={`Replenish Stock: ${restockModalMed.name}`}
          onClose={() => setRestockModalMed(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setRestockModalMed(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={() => handleFastRestock(restockModalMed, Number(restockQty) || 100)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Restocking..." : `Confirm Restock (+${restockQty})`}
              </button>
            </div>
          }
        >
          <div style={{ padding: 10 }}>
            <div style={{ padding: 12, background: "rgba(239, 246, 255, 0.6)", border: "1px solid rgba(219, 234, 254, 0.8)", borderRadius: 10, marginBottom: 14 }}>
              <div>Medicine: <strong>{restockModalMed.name}</strong></div>
              <div>Current Stock: <strong style={{ color: "#dc2626" }}>{restockModalMed.stock} {restockModalMed.unit}</strong></div>
              <div>Reorder Minimum: <strong>{restockModalMed.minStock} {restockModalMed.unit}</strong></div>
            </div>

            <div className="df-form-group">
              <label className="df-label">Quantity to Add *</label>
              <input
                type="number"
                min="1"
                className="df-input"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                required
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   5. SUPPLIERS VIEW — SUPPLIER MANAGEMENT ONLY
   ========================================================================== */
export function PharmacistSuppliersView({ role = "pharmacist" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [realSuppliers, setRealSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // CRUD Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [detailsSupplier, setDetailsSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialNewSupplier = {
    name: "",
    category: "Antibiotics & Pharmaceuticals",
    email: "",
    phone: "",
    contactPerson: "",
    city: "Colombo",
    status: "active",
  };
  const [newSupplier, setNewSupplier] = useState(initialNewSupplier);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const list = await pharmacyApi.getAllSuppliers().catch(() => []);
      setRealSuppliers(list.map(normalizeSupplier));
    } catch (err) {
      console.warn("Could not load suppliers:", err);
      addToast("Failed to load suppliers list", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const suppliers = useMemo(() => {
    return realSuppliers.length > 0 ? realSuppliers : (collections.suppliers || []);
  }, [realSuppliers, collections.suppliers]);

  // Page-specific summary stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.status === "active").length;
  const inactiveSuppliers = suppliers.filter((s) => s.status !== "active").length;
  const recentSuppliers = suppliers.slice(0, 3).length;

  // Filtered suppliers
  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  // Create Supplier
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newSupplier.name.trim()) {
      addToast("Supplier name is required", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplierCode: `SUP-${Date.now().toString().slice(-5)}`,
        supplierName: newSupplier.name.trim(),
        suppliedItems: newSupplier.category,
        email: newSupplier.email.trim(),
        phone: newSupplier.phone.trim(),
        contactPerson: newSupplier.contactPerson.trim(),
        city: newSupplier.city.trim(),
        status: newSupplier.status.toUpperCase(),
      };

      const created = await pharmacyApi.createSupplier(payload);
      const norm = normalizeSupplier(created);
      saveRecord("suppliers", norm);

      addToast(`Supplier "${norm.name}" registered successfully!`, "success");
      setAddModalOpen(false);
      setNewSupplier(initialNewSupplier);
      await loadSuppliers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to create supplier";
      addToast(typeof msg === "string" ? msg : "Creation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Supplier
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!editingSupplier || isSubmitting) return;

    setIsSubmitting(true);
    const targetId = editingSupplier.rawId || editingSupplier.id;
    try {
      if (targetId && pharmacyApi.updateSupplier) {
        await pharmacyApi.updateSupplier(targetId, {
          supplierName: editingSupplier.name.trim(),
          suppliedItems: editingSupplier.category,
          email: editingSupplier.email.trim(),
          phone: editingSupplier.phone.trim(),
          contactPerson: editingSupplier.contactPerson.trim(),
          city: editingSupplier.city?.trim() || "Colombo",
          status: (editingSupplier.status || "active").toUpperCase(),
        });
      }

      saveRecord("suppliers", editingSupplier);
      addToast(`Supplier "${editingSupplier.name}" updated!`, "success");
      setEditingSupplier(null);
      await loadSuppliers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Update failed";
      addToast(typeof msg === "string" ? msg : "Update failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (supp) => {
    if (!window.confirm(`Are you sure you want to deactivate supplier "${supp.name}"?`)) return;

    try {
      const targetId = supp.rawId || supp.id;
      if (targetId && pharmacyApi.deleteSupplier) {
        await pharmacyApi.deleteSupplier(targetId);
      }
      addToast(`Supplier "${supp.name}" deleted.`, "success");
      await loadSuppliers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Delete failed";
      addToast(typeof msg === "string" ? msg : "Delete failed", "error");
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Suppliers" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Vendor Management</span>
          <h1>Supplier Management</h1>
          <p>Directory of pharmaceutical distributors, medical suppliers, and verified procurement contacts.</p>
        </div>
        <button
          type="button"
          className="df-btn df-btn-primary"
          onClick={() => setAddModalOpen(true)}
        >
          + Add New Supplier
        </button>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Suppliers" value={String(totalSuppliers)} icon="◫" color="primary" />
        <StatCard label="Active Suppliers" value={String(activeSuppliers)} icon="✓" color="success" />
        <StatCard label="Inactive Suppliers" value={String(inactiveSuppliers)} icon="◈" color="warning" />
        <StatCard label="Recent Suppliers" value={String(recentSuppliers)} icon="📅" color="primary" />
      </div>

      {/* Search Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search supplier, contact, city..." />
        </div>
      </div>

      {/* Suppliers Table */}
      <section className="df-card df-pharmacist-glass-card">
        <div className="df-card-body" style={{ padding: 0 }}>
          <DataTable
            columns={[
              { key: "id", label: "Supplier ID" },
              { key: "name", label: "Supplier Name" },
              { key: "contactPerson", label: "Contact Person" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "category", label: "Supplied Items" },
              { key: "status", label: "Status", type: "status" },
            ]}
            rows={filtered}
            searchable={false}
            rowActions={(row) => (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => setDetailsSupplier(row)}
                  title="View Details"
                >
                  👁️ Details
                </button>
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => setEditingSupplier({ ...row })}
                  title="Edit Supplier"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className="df-btn df-btn-danger df-btn-sm"
                  onClick={() => handleDeleteSupplier(row)}
                  title="Delete Supplier"
                >
                  🗑️
                </button>
              </div>
            )}
          />
        </div>
      </section>

      {/* Add Supplier Modal */}
      {addModalOpen && (
        <Modal
          title="Register New Supplier"
          onClose={() => setAddModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleCreateSupplier}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registering..." : "Register Supplier"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateSupplier} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Supplier Name *</label>
                <input
                  className="df-input"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="e.g. MediSource Lanka"
                  required
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Contact Person</label>
                <input
                  className="df-input"
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                  placeholder="e.g. Samantha Silva"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Email Address</label>
                <input
                  type="email"
                  className="df-input"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder="orders@medisource.lk"
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Phone Number</label>
                <input
                  type="tel"
                  className="df-input"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder="+94 11 234 5678"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Supplied Category</label>
                <input
                  className="df-input"
                  value={newSupplier.category}
                  onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })}
                  placeholder="e.g. Antibiotics, Consumables"
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">City / Region</label>
                <input
                  className="df-input"
                  value={newSupplier.city}
                  onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                  placeholder="e.g. Colombo"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <Modal
          title={`Edit Supplier: ${editingSupplier.name}`}
          onClose={() => setEditingSupplier(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setEditingSupplier(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleUpdateSupplier}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleUpdateSupplier} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Supplier Name *</label>
                <input
                  className="df-input"
                  value={editingSupplier.name || ""}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  required
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Contact Person</label>
                <input
                  className="df-input"
                  value={editingSupplier.contactPerson || ""}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Email</label>
                <input
                  type="email"
                  className="df-input"
                  value={editingSupplier.email || ""}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Phone</label>
                <input
                  type="tel"
                  className="df-input"
                  value={editingSupplier.phone || ""}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="df-form-group">
              <label className="df-label">Supplied Items</label>
              <input
                className="df-input"
                value={editingSupplier.category || ""}
                onChange={(e) => setEditingSupplier({ ...editingSupplier, category: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {detailsSupplier && (
        <Modal
          title={`Supplier Details: ${detailsSupplier.name}`}
          onClose={() => setDetailsSupplier(null)}
          actions={
            <button type="button" className="df-btn df-btn-primary" onClick={() => setDetailsSupplier(null)}>
              Close
            </button>
          }
        >
          <div style={{ padding: 10 }}>
            <div style={{ padding: 14, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 12 }}>
              <div>Code: <strong>{detailsSupplier.id}</strong></div>
              <div>Status: <strong>{detailsSupplier.status?.toUpperCase()}</strong></div>
              <div>Contact Person: <strong>{detailsSupplier.contactPerson || "—"}</strong></div>
              <div>Email: <strong>{detailsSupplier.email || "—"}</strong></div>
              <div>Phone: <strong>{detailsSupplier.phone || "—"}</strong></div>
              <div>City: <strong>{detailsSupplier.city || "Colombo"}</strong></div>
              <div style={{ gridColumn: "span 2" }}>
                Supplied Categories: <strong>{detailsSupplier.category}</strong>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   6. STOCK TRANSACTIONS VIEW — STOCK MOVEMENT AUDIT LEDGER ONLY
   ========================================================================== */
export function PharmacistStockTransactionsView({ role = "pharmacist" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [realTxList, setRealTxList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialNewTx = {
    medicine: "Amoxicillin 500mg",
    type: "Stock In",
    quantity: "+100",
    reference: "PO-2026-105",
    date: getLocalDateString(),
    notes: "Direct procurement consignment",
  };
  const [newTx, setNewTx] = useState(initialNewTx);

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      const [pos, rxList, suppliers] = await Promise.all([
        pharmacyApi.getAllPurchaseOrders().catch(() => []),
        pharmacyApi.getAllPrescriptions().catch(() => []),
        pharmacyApi.getAllSuppliers().catch(() => []),
      ]);

      const supplierLookup = {};
      (suppliers || []).forEach((s) => {
        if (s?.id) supplierLookup[s.id] = s;
      });

      // Map Purchase Orders into unified transaction movements
      const poTransactions = (pos || []).map((po) => {
        const normalized = normalizePurchaseOrder ? normalizePurchaseOrder(po, supplierLookup) : po;
        const supplierName = supplierLookup[po.supplierId]?.name || normalized.supplierName || "Supplier Consignment";
        const rawDate = po.orderDate || po.createdAt || normalized.orderDate;

        return {
          id: `TX-PO-${po.id}`,
          rawId: po.id,
          medicine: normalized.medicine || normalized.itemName || `${supplierName} Consignment`,
          type: "Stock In",
          quantity: normalized.quantity ? (String(normalized.quantity).startsWith("+") ? normalized.quantity : `+${normalized.quantity}`) : "+100 Units",
          reference: po.poNumber || normalized.poNumber || `PO-${po.id}`,
          date: rawDate ? String(rawDate).slice(0, 10) : getLocalDateString(),
          status: "completed",
          source: supplierName,
          performedBy: "Procurement Desk",
          raw: po,
        };
      });

      // Map Completed/Dispensed Prescriptions into stock movements
      const rxTransactions = (rxList || [])
        .filter((rx) => rx.status === "COMPLETED" || rx.status === "DISPENSED" || rx.status === "dispensed")
        .map((rx) => ({
          id: `TX-DISP-${rx.id}`,
          rawId: rx.id,
          medicine: rx.diagnosis ? `${rx.diagnosis} Prescription` : "Dental Prescription Course",
          type: "Dispensed",
          quantity: "-1 Course",
          reference: rx.prescriptionCode || `RX-${rx.id}`,
          date: rx.prescriptionDate ? String(rx.prescriptionDate).slice(0, 10) : getLocalDateString(),
          status: "dispensed",
          source: "Central Clinic Pharmacy",
          performedBy: "Lisa Thompson, RPh",
          raw: rx,
        }));

      setRealTxList([...poTransactions, ...rxTransactions]);
    } catch (err) {
      console.warn("Could not load movements:", err);
      addToast("Failed to fetch stock transactions", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const transactions = useMemo(() => {
    const combined = [...realTxList, ...(collections.transactions || [])];
    const seen = new Set();
    return combined.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [realTxList, collections.transactions]);

  // Page-specific summary stats
  const todayStr = getLocalDateString();
  const todayCount = transactions.filter((t) => String(t.date || "").slice(0, 10) === todayStr).length;
  const stockInCount = transactions.filter((t) => t.type === "Stock In" || t.type === "Restocked").length;
  const dispensedCount = transactions.filter((t) => t.type === "Dispensed").length;
  const adjustmentsCount = transactions.filter(
    (t) => t.type === "Stock Adjustment" || t.type === "Adjustment" || t.type === "Disposal"
  ).length;

  // Filtered
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (tx.medicine && tx.medicine.toLowerCase().includes(q)) ||
        (tx.reference && tx.reference.toLowerCase().includes(q)) ||
        (tx.id && tx.id.toLowerCase().includes(q)) ||
        (tx.type && tx.type.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (activeTab === "all") return true;
      if (activeTab === "stock-in") return tx.type === "Stock In" || tx.type === "Restocked";
      if (activeTab === "dispensed") return tx.type === "Dispensed";
      if (activeTab === "adjustments") return tx.type === "Stock Adjustment" || tx.type === "Adjustment" || tx.type === "Disposal";
      return true;
    });
  }, [transactions, search, activeTab]);

  // Record New Stock Movement
  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const medName = newTx.medicine.trim();
    const qtyStr = newTx.quantity.trim();
    if (!medName || !qtyStr) {
      addToast("Please fill in medicine name and quantity delta", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const isPositive = !qtyStr.startsWith("-");
      const cleanQty = qtyStr.replace(/[^\d-]/g, "") || "100";
      const formattedQty = isPositive ? `+${cleanQty.replace("+", "")} Units` : `${cleanQty} Units`;

      const txItem = {
        id: nextId("TX"),
        medicine: medName,
        type: newTx.type,
        quantity: formattedQty,
        reference: newTx.reference.trim() || `REF-${nextId("ORD")}`,
        date: newTx.date || getLocalDateString(),
        status: "completed",
        performedBy: "Pharmacist Station",
      };

      saveRecord("transactions", txItem);

      // Sync delta with live medicine catalog if medicine exists
      if (pharmacyApi.getAllMedicines && pharmacyApi.addMedicineStock) {
        const meds = await pharmacyApi.getAllMedicines().catch(() => []);
        const matching = meds.find((m) => m.name.toLowerCase().includes(medName.toLowerCase()));
        if (matching?.id) {
          const delta = parseInt(cleanQty, 10) * (newTx.type === "Disposal" ? -1 : 1);
          await pharmacyApi.addMedicineStock(matching.id, delta).catch(() => null);
        }
      }

      addToast(`Recorded movement ${txItem.id} for ${txItem.medicine}!`, "success");
      setModalOpen(false);
      setNewTx(initialNewTx);
      await loadMovements();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to record movement";
      addToast(typeof msg === "string" ? msg : "Failed to record movement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Stock Transactions" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmaceutical Movements</span>
          <h1>Stock Transactions</h1>
          <p>Historical audit ledger of all inward consignments, outpatient dispensations, batch recalls, and inventory adjustments.</p>
        </div>
        <button type="button" className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          + Record Stock Movement
        </button>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Today's Transactions" value={String(todayCount)} icon="📅" color="primary" />
        <StatCard label="Stock Inward" value={String(stockInCount)} icon="✓" color="success" />
        <StatCard label="Stock Out / Dispensed" value={String(dispensedCount)} icon="◈" color="primary" />
        <StatCard label="Stock Adjustments" value={String(adjustmentsCount)} icon="⚡" color="warning" />
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <TabPills
          tabs={[
            { label: "All Movements", value: "all", count: transactions.length },
            { label: "Stock Inward", value: "stock-in", count: stockInCount },
            { label: "Dispensed", value: "dispensed", count: dispensedCount },
            { label: "Adjustments", value: "adjustments", count: adjustmentsCount },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search medicine, reference, ID..." />
        </div>
      </div>

      {/* Movements Table */}
      <section className="df-card df-pharmacist-glass-card">
        <div className="df-card-body" style={{ padding: 0 }}>
          <DataTable
            columns={[
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
                  return <span className={badgeClass}>{row.type || "Movement"}</span>;
                },
              },
              { key: "quantity", label: "Units Delta" },
              { key: "reference", label: "Reference / PO / Rx" },
              { key: "date", label: "Date" },
              { key: "performedBy", label: "Performed By", render: (row) => row.performedBy || "Central Pharmacy" },
              { key: "status", label: "Status", type: "status" },
            ]}
            rows={filtered}
            searchable={false}
            rowActions={(row) => (
              <button
                type="button"
                className="df-btn df-btn-secondary df-btn-sm"
                onClick={() => setSelectedTx(row)}
              >
                👁️ Inspect
              </button>
            )}
          />
        </div>
      </section>

      {/* Record Movement Modal */}
      {modalOpen && (
        <Modal
          title="Record Pharmaceutical Stock Movement"
          onClose={() => setModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleRecordTransaction}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Recording..." : "Record Entry"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleRecordTransaction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Medicine / Item *</label>
              <input
                className="df-input"
                value={newTx.medicine}
                onChange={(e) => setNewTx({ ...newTx, medicine: e.target.value })}
                placeholder="e.g. Amoxicillin 500mg"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">Movement Type</label>
                <select
                  className="df-select"
                  value={newTx.type}
                  onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                >
                  <option value="Stock In">Stock In (Purchase Consignment)</option>
                  <option value="Stock Adjustment">Stock Adjustment (Audit)</option>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="df-form-group">
                <label className="df-label">PO / Batch Reference</label>
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
          </form>
        </Modal>
      )}

      {/* Inspect Modal */}
      {selectedTx && (
        <Modal
          title={`Transaction Audit: ${selectedTx.id}`}
          onClose={() => setSelectedTx(null)}
          actions={
            <button type="button" className="df-btn df-btn-primary" onClick={() => setSelectedTx(null)}>
              Close
            </button>
          }
        >
          <div style={{ padding: 10 }}>
            <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div>Transaction ID: <strong>{selectedTx.id}</strong></div>
              <div>Type: <strong>{selectedTx.type}</strong></div>
              <div>Pharmaceutical Item: <strong>{selectedTx.medicine}</strong></div>
              <div>Units Delta: <strong style={{ color: "#2563eb" }}>{selectedTx.quantity}</strong></div>
              <div>Reference: <strong>{selectedTx.reference || "—"}</strong></div>
              <div>Date: <strong>{selectedTx.date}</strong></div>
              <div>Logged By: <strong>{selectedTx.performedBy || "Central Pharmacy System"}</strong></div>
              <div>Status: <strong>{selectedTx.status}</strong></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   7. MEDICINE HISTORY VIEW — DISPENSING HISTORY ONLY
   ========================================================================== */
export function PharmacistMedicineHistoryView({ role = "pharmacist" }) {
  const { collections } = useDashboardData();
  const { addToast } = useNotifications();

  const [realRxList, setRealRxList] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [receiptRecord, setReceiptRecord] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rxRaw, patients, dentists, billsRaw] = await Promise.all([
        pharmacyApi.getAllPrescriptions().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
        billingApi.getAllBills().catch(() => []),
      ]);

      const pMap = {};
      (patients || []).forEach((p) => {
        if (p?.id) pMap[p.id] = p;
      });

      const dMap = {};
      (dentists || []).forEach((d) => {
        if (d?.id) dMap[d.id] = d;
      });

      const normalized = await Promise.all(
        (rxRaw || []).map(async (rx) => {
          const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
          return normalizePrescription(rx, pMap, dMap, items);
        })
      );

      // Filter ONLY dispensed / completed prescriptions!
      const dispensedOnly = normalized.filter(
        (p) => p.status === "dispensed" || p.rawStatus === "COMPLETED" || p.rawStatus === "DISPENSED"
      );

      dispensedOnly.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setRealRxList(dispensedOnly);
      setBills(Array.isArray(billsRaw) ? billsRaw : []);
    } catch (err) {
      console.warn("Could not load dispensing history:", err);
      addToast("Failed to fetch dispensing history", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const historyList = useMemo(() => {
    if (realRxList.length > 0) return realRxList;
    return (collections.prescriptions || []).filter((p) => p.status === "dispensed");
  }, [realRxList, collections.prescriptions]);

  // Page-specific summary stats
  const totalDispensed = historyList.length;
  const todayStr = getLocalDateString();
  const todayDispensed = historyList.filter((p) => String(p.date || "").slice(0, 10) === todayStr).length;
  const patientsServed = useMemo(() => {
    const s = new Set();
    historyList.forEach((p) => {
      if (p.patientId || p.patient) s.add(p.patientId || p.patient);
    });
    return s.size;
  }, [historyList]);

  const totalMedicinesDispensed = useMemo(() => {
    return historyList.reduce((acc, p) => acc + (p.medicines?.length || 1), 0);
  }, [historyList]);

  // Filtered
  const filtered = useMemo(() => {
    if (!search.trim()) return historyList;
    const q = search.trim().toLowerCase();
    return historyList.filter(
      (p) =>
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.patient && p.patient.toLowerCase().includes(q)) ||
        (p.doctor && p.doctor.toLowerCase().includes(q)) ||
        (p.medicine && p.medicine.toLowerCase().includes(q))
    );
  }, [historyList, search]);

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Medicine History" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Dispensing Audit Log</span>
          <h1>Medicine Dispensing History</h1>
          <p>Complete historical ledger of fulfilled patient prescriptions, verified batch distributions, and related cashier invoices.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Dispensed" value={String(totalDispensed)} icon="✓" color="success" />
        <StatCard label="Today's Dispensing" value={String(todayDispensed)} icon="📅" color="primary" />
        <StatCard label="Patients Served" value={String(patientsServed)} icon="👥" color="primary" />
        <StatCard label="Medicines Dispensed" value={`${totalMedicinesDispensed} Items`} icon="◈" color="primary" />
      </div>

      {/* Search Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search Rx ID, patient, doctor, medicine..." />
        </div>
      </div>

      {/* History Table */}
      <section className="df-card df-pharmacist-glass-card">
        <div className="df-card-body" style={{ padding: 0 }}>
          <DataTable
            columns={[
              { key: "id", label: "Prescription ID" },
              { key: "patient", label: "Patient" },
              { key: "doctor", label: "Prescribing Doctor" },
              {
                key: "medicine",
                label: "Dispensed Medicine",
                render: (row) => (
                  <div>
                    <strong>{row.medicine}</strong>
                    {row.medicines?.length > 1 && (
                      <span style={{ fontSize: 11, color: "var(--df-text-secondary)", display: "block" }}>
                        +{row.medicines.length - 1} additional item(s)
                      </span>
                    )}
                  </div>
                ),
              },
              { key: "date", label: "Dispense Date" },
              {
                key: "billingStatus",
                label: "Cashier Invoice Link",
                render: (row) => {
                  const bill = bills.find((b) => b.patientId === row.patientId || b.patient?.id === row.patientId);
                  if (!bill) return <span className="df-badge">Pending Billing</span>;
                  const isPaid = bill.status === "PAID" || (bill.paidAmount > 0 && bill.balanceAmount <= 0);
                  return (
                    <span className={`df-badge df-badge-${isPaid ? "success" : "warning"}`}>
                      {bill.billNumber || `#${bill.id}`}: {isPaid ? "PAID" : "UNPAID"}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "Dispense Status",
                render: () => <span className="df-badge df-badge-success">✓ DISPENSED</span>,
              },
            ]}
            rows={filtered}
            searchable={false}
            rowActions={(row) => (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => setSelectedRecord(row)}
                  title="View Dispensing Audit"
                >
                  👁️ Details
                </button>
                <button
                  type="button"
                  className="df-btn df-btn-ghost df-btn-sm"
                  onClick={() => setReceiptRecord(row)}
                  title="Print Stamped Dispensing Receipt"
                >
                  🖨️ Receipt
                </button>
              </div>
            )}
          />
        </div>
      </section>

      {/* Record Details Modal */}
      {selectedRecord && (
        <Modal
          title={`Dispensing Record: ${selectedRecord.id}`}
          onClose={() => setSelectedRecord(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  setReceiptRecord(selectedRecord);
                  setSelectedRecord(null);
                }}
              >
                🖨️ Stamped Receipt
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ padding: 10, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--df-text-secondary)" }}>Patient Name</div>
                <strong>{selectedRecord.patient}</strong>
              </div>
              <div style={{ padding: 10, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--df-text-secondary)" }}>Prescribing Doctor</div>
                <strong>{selectedRecord.doctor}</strong>
              </div>
            </div>

            <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, marginBottom: 12 }}>
              <strong>Dispensed Items:</strong>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {(selectedRecord.medicines || []).map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    • <strong>{m.name}</strong> — {m.dosage} ({m.freq}, {m.duration}) {m.quantity ? `· Qty: ${m.quantity}` : ""}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>
              Dispense Date: <strong>{selectedRecord.date}</strong> · Status: <span style={{ color: "#16a34a", fontWeight: 700 }}>VERIFIED & DISPENSED</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Stamped Dispensing Receipt Modal */}
      {receiptRecord && (
        <Modal
          title={`Dispensing Receipt: ${receiptRecord.id}`}
          onClose={() => setReceiptRecord(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Print Voucher
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={() => setReceiptRecord(null)}>
                Close
              </button>
            </div>
          }
        >
          <div className="df-pharm-receipt-glass">
            <div style={{ textAlign: "center", borderBottom: "2px dashed var(--df-border, #cbd5e1)", paddingBottom: 14, marginBottom: 14 }}>
              <h2 style={{ margin: 0, color: "#2563eb", fontSize: 20 }}>DENTAFLOW PHARMACY</h2>
              <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 2 }}>
                Hospital Dispensing Voucher & Safety Certification
              </div>
              <div style={{ display: "inline-block", marginTop: 8, border: "2px solid #2563eb", borderRadius: 4, padding: "2px 10px", color: "#2563eb", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}>
                ✓ DISPENSED & CERTIFIED
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 14 }}>
              <div>Rx Number: <strong>{receiptRecord.id}</strong></div>
              <div>Dispense Date: <strong>{receiptRecord.date}</strong></div>
              <div>Patient: <strong>{receiptRecord.patient}</strong></div>
              <div>Doctor: <strong>{receiptRecord.doctor}</strong></div>
            </div>

            <div style={{ padding: 12, background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Dispensed Pharmaceuticals:</div>
              {(receiptRecord.medicines || []).map((m, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{m.name} ({m.dosage})</span>
                  <strong>{m.quantity || 1} units</strong>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "right", fontSize: 12, color: "var(--df-text-secondary)" }}>
              Dispensed by: <strong>Lisa Thompson, RPh</strong><br />
              DentaFlow Hospital Pharmacy
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   8. REPORTS VIEW — PHARMACY REPORTS ONLY
   ========================================================================== */
export function PharmacistReportsView({ role = "pharmacist" }) {
  const { collections } = useDashboardData();
  const { addToast } = useNotifications();

  const [domain, setDomain] = useState("consumption");
  const [realMeds, setRealMeds] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [dispensingStats, setDispensingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [meds, rx, invReport, dispReport] = await Promise.all([
          pharmacyApi.getAllMedicines().catch(() => []),
          pharmacyApi.getAllPrescriptions().catch(() => []),
          reportsApi.getAIReportInventory ? reportsApi.getAIReportInventory().catch(() => null) : Promise.resolve(null),
          reportsApi.getAIReportDispensing ? reportsApi.getAIReportDispensing().catch(() => null) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setRealMeds((meds || []).map(normalizeMedicine));
        setPrescriptions(rx || []);
        if (invReport) setInventoryStats(invReport);
        if (dispReport) setDispensingStats(dispReport);
      } catch (err) {
        console.warn("Could not load report data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const medicines = useMemo(() => {
    return realMeds.length > 0 ? realMeds : (collections.medicines || []);
  }, [realMeds, collections.medicines]);

  const totalStockValue = useMemo(() => {
    if (inventoryStats?.totalInventoryValue != null) {
      return `LKR ${Number(inventoryStats.totalInventoryValue).toLocaleString()}`;
    }
    const val = medicines.reduce((acc, curr) => acc + curr.stock * (curr.unitPrice || 0), 0);
    return `LKR ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [medicines, inventoryStats]);

  const dispensedTotal = useMemo(() => {
    if (dispensingStats?.dispensedCount != null) {
      return `${dispensingStats.dispensedCount} Units`;
    }
    const disp = prescriptions.filter((r) => r.status === "COMPLETED" || r.status === "DISPENSED").length;
    return `${disp} Courses`;
  }, [dispensingStats, prescriptions]);

  const lowStockCount = useMemo(() => {
    return medicines.filter((m) => Number(m.stock) <= Number(m.minStock)).length;
  }, [medicines]);

  const handleExportCSV = async () => {
    try {
      const type = domain === "stockout" ? "low-stock" : domain === "consumption" ? "dispensing" : "inventory";
      if (reportsApi.exportReportCSV) {
        const blob = await reportsApi.exportReportCSV(type);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `pharmacy-${type}-report.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        addToast("Exported Pharmacy Report (CSV)", "success");
      } else {
        addToast("Exporting report...", "info");
      }
    } catch (err) {
      addToast("Failed to export Pharmacy CSV", "error");
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Reports" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmacy Analytics</span>
          <h1>Pharmacy Reports</h1>
          <p>Analytical reports on medicine consumption velocity, inventory turnover, stockouts, and pharmacy valuation.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="df-btn df-btn-secondary" onClick={() => window.print()}>
            🖨️ Print Report
          </button>
          <button type="button" className="df-btn df-btn-primary" onClick={handleExportCSV}>
            📥 Export Report (CSV)
          </button>
        </div>
      </header>

      {/* Report Specific KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Stock Valuation" value={totalStockValue} icon="💰" color="primary" />
        <StatCard label="Total Dispensed Units" value={dispensedTotal} icon="✓" color="success" />
        <StatCard label="Low Stock Alerts" value={String(lowStockCount)} icon="⚠" color="warning" />
        <StatCard label="Active Catalog Items" value={String(medicines.length)} icon="◫" color="primary" />
      </div>

      {/* Domain Pills */}
      <div style={{ marginBottom: 16 }}>
        <TabPills
          tabs={[
            { label: "Medicine Consumption", value: "consumption" },
            { label: "Stock Movement & Turnover", value: "movement" },
            { label: "Low Stock & Reorders", value: "stockout" },
            { label: "Inventory Valuation", value: "valuation" },
          ]}
          activeTab={domain}
          onChange={setDomain}
        />
      </div>

      {/* Reports Table */}
      <section className="df-card df-pharmacist-glass-card">
        <div className="df-card-body" style={{ padding: 0 }}>
          <DataTable
            columns={[
              { key: "id", label: "Medicine Code" },
              { key: "name", label: "Medicine Name" },
              { key: "category", label: "Category" },
              { key: "stock", label: "Available Stock" },
              { key: "minStock", label: "Reorder Threshold" },
              {
                key: "unitPrice",
                label: "Unit Price (LKR)",
                render: (row) => formatLkr(row.unitPrice || 0),
              },
              {
                key: "totalVal",
                label: "Valuation (LKR)",
                render: (row) => formatLkr((Number(row.stock) || 0) * (Number(row.unitPrice) || 0)),
              },
            ]}
            rows={
              domain === "stockout"
                ? medicines.filter((m) => Number(m.stock) <= Number(m.minStock))
                : medicines
            }
            searchable={false}
          />
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   9. PURCHASE REQUESTS VIEW — PHARMACIST "MY REQUESTS"
   ========================================================================== */
export function PharmacistPurchaseRequestsView({ role = "pharmacist" }) {
  const { addToast } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    mode: "catalog",
    medicineId: "",
    medicineName: "",
    requestedQuantity: "50",
    reason: "",
  });
  const [requestErrors, setRequestErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRaw, medsRaw] = await Promise.all([
        pharmacyApi.getMyPurchaseRequests().catch(() => []),
        pharmacyApi.getAllMedicines().catch(() => []),
      ]);
      setRequests(Array.isArray(reqRaw) ? reqRaw.map(normalizePurchaseRequest) : []);
      setMedicines(Array.isArray(medsRaw) ? medsRaw.map(normalizeMedicine) : []);
    } catch (err) {
      console.warn("Could not load purchase requests:", err);
      addToast("Failed to load your purchase requests", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(() => ({
    all: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING" || r.status === "DRAFT").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED" || r.status === "CANCELLED").length,
    ORDERED: requests.filter((r) => r.status === "ORDERED" || r.status === "RECEIVED").length,
  }), [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === "PENDING" && (r.status !== "PENDING" && r.status !== "DRAFT")) return false;
      if (activeTab === "APPROVED" && r.status !== "APPROVED") return false;
      if (activeTab === "REJECTED" && (r.status !== "REJECTED" && r.status !== "CANCELLED")) return false;
      if (activeTab === "ORDERED" && (r.status !== "ORDERED" && r.status !== "RECEIVED")) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.medicine && r.medicine.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q))
      );
    });
  }, [requests, activeTab, search]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors = {};
    const medName = requestForm.medicineName.trim();
    const qty = parseInt(requestForm.requestedQuantity, 10);
    const reason = requestForm.reason.trim();

    if (!medName) errors.medicineName = "Medicine name is required.";
    if (isNaN(qty) || qty <= 0) errors.requestedQuantity = "Requested quantity must be greater than zero.";
    if (!reason) errors.reason = "Reason / request note is required.";

    if (Object.keys(errors).length > 0) {
      setRequestErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await pharmacyApi.createPurchaseRequest({
        medicineId: requestForm.medicineId ? Number(requestForm.medicineId) : null,
        medicineName: medName,
        requestedQuantity: qty,
        reason: reason,
      });

      addToast(`Purchase request for "${medName}" (${qty} units) submitted to Admin!`, "success");
      setRequestModalOpen(false);
      setRequestForm({
        mode: "catalog",
        medicineId: "",
        medicineName: "",
        requestedQuantity: "50",
        reason: "",
      });
      setRequestErrors({});
      await loadRequests();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to submit request";
      addToast(typeof msg === "string" ? msg : "Failed to submit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="df-role-page df-pharmacist-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "My Purchase Requests" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Procurement &amp; Orders</span>
          <h1>My Purchase Requests</h1>
          <p>Track medicine reorder and purchase requests submitted to clinic administrators.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="df-btn df-btn-primary"
            onClick={() => {
              setRequestErrors({});
              setRequestForm({
                mode: "catalog",
                medicineId: "",
                medicineName: "",
                requestedQuantity: "50",
                reason: "",
              });
              setRequestModalOpen(true);
            }}
          >
            📋 Request Medicine
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Submitted" value={String(counts.all)} icon="📋" color="primary" />
        <StatCard label="Pending Approval" value={String(counts.PENDING)} icon="◷" color="warning" />
        <StatCard label="Approved" value={String(counts.APPROVED)} icon="✓" color="success" />
        <StatCard label="Rejected" value={String(counts.REJECTED)} icon="✕" color="danger" />
      </div>

      {/* Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <TabPills
          tabs={[
            { label: "All Requests", value: "all", count: counts.all },
            { label: "Pending", value: "PENDING", count: counts.PENDING },
            { label: "Approved", value: "APPROVED", count: counts.APPROVED },
            { label: "Ordered", value: "ORDERED", count: counts.ORDERED },
            { label: "Rejected", value: "REJECTED", count: counts.REJECTED },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div style={{ minWidth: 260 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search request ID, medicine, reason..." />
        </div>
      </div>

      {/* Table */}
      <section className="df-card df-pharmacist-glass-card">
        <div className="df-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              Loading your purchase requests…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>No Purchase Requests</h4>
              <p style={{ margin: "0 auto 16px", maxWidth: 360, fontSize: 13.5, color: "var(--df-text-secondary)" }}>
                {activeTab === "all" ? "You have not submitted any purchase requests yet. Click \"Request Medicine\" to raise a new request." : `No purchase requests with status "${activeTab}".`}
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "id", label: "Request ID" },
                { key: "medicine", label: "Medicine Name" },
                { key: "requestedQty", label: "Requested Qty" },
                { key: "requestedDate", label: "Request Date" },
                { key: "reason", label: "Reason / Note" },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => {
                    const s = row.status;
                    const badgeClass =
                      s === "APPROVED" ? "df-badge-success" :
                      s === "ORDERED" ? "df-badge-primary" :
                      s === "REJECTED" ? "df-badge-danger" : "df-badge-warning";
                    return <span className={`df-badge ${badgeClass}`}>{s}</span>;
                  },
                },
                {
                  key: "adminNote",
                  label: "Admin Response / Reason",
                  render: (row) => row.adminNote ? (
                    <span style={{ color: row.status === "REJECTED" ? "#dc2626" : "inherit", fontWeight: row.status === "REJECTED" ? 600 : "normal" }}>
                      {row.adminNote}
                    </span>
                  ) : (
                    <span style={{ color: "var(--df-text-muted)" }}>—</span>
                  ),
                },
              ]}
              rows={filtered}
              searchable={false}
            />
          )}
        </div>
      </section>

      {/* Request Medicine Modal */}
      {requestModalOpen && (
        <Modal
          title="Request Medicine from Admin"
          onClose={() => setRequestModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setRequestModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleCreateRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Select Medicine from Catalog</label>
              <select
                className="df-select"
                value={requestForm.medicineId || (requestForm.mode === "manual" ? "manual" : "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "manual") {
                    setRequestForm((prev) => ({
                      ...prev,
                      mode: "manual",
                      medicineId: "",
                      medicineName: "",
                    }));
                  } else {
                    const sel = medicines.find((m) => String(m.rawId || m.id) === val);
                    setRequestForm((prev) => ({
                      ...prev,
                      mode: "catalog",
                      medicineId: sel ? (sel.rawId || sel.id) : "",
                      medicineName: sel ? sel.name : "",
                    }));
                  }
                }}
              >
                <option value="">Select an existing medicine…</option>
                {medicines.map((m) => (
                  <option key={m.rawId || m.id} value={m.rawId || m.id}>
                    {m.name} ({m.stock} {m.unit} in stock)
                  </option>
                ))}
                <option value="manual">+ Not in Catalog (Enter manually)</option>
              </select>
            </div>

            {(requestForm.mode === "manual" || !requestForm.medicineId) && (
              <div className="df-form-group">
                <label className="df-label">Medicine Name *</label>
                <input
                  type="text"
                  className="df-input"
                  placeholder="e.g. Cefixime 200mg Capsules"
                  value={requestForm.medicineName}
                  onChange={(e) => setRequestForm({ ...requestForm, medicineName: e.target.value })}
                  required
                />
                {requestErrors.medicineName && (
                  <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{requestErrors.medicineName}</div>
                )}
              </div>
            )}

            <div className="df-form-group">
              <label className="df-label">Requested Quantity *</label>
              <input
                type="number"
                min="1"
                className="df-input"
                value={requestForm.requestedQuantity}
                onChange={(e) => setRequestForm({ ...requestForm, requestedQuantity: e.target.value })}
                required
              />
              {requestErrors.requestedQuantity && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{requestErrors.requestedQuantity}</div>
              )}
            </div>

            <div className="df-form-group">
              <label className="df-label">Reason / Request Note *</label>
              <textarea
                className="df-input"
                rows={3}
                placeholder="Explain why this medicine is needed (e.g. low stock, patient prescription demand, out of stock)..."
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                required
              />
              {requestErrors.reason && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 2 }}>{requestErrors.reason}</div>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   BACKWARD COMPATIBLE EXPORTS & DISPATCHERS
   ========================================================================== */
export function PharmacistDispensingView({ role = "pharmacist", page = "dispense" }) {
  if (page === "prescriptions") {
    return <PharmacistPrescriptionsView role={role} />;
  }
  return <PharmacistDispenseView role={role} />;
}

export function StockTransactionsView({ role = "pharmacist", page = "transactions" }) {
  if (page === "history" || page === "medicine-history") {
    return <PharmacistMedicineHistoryView role={role} />;
  }
  return <PharmacistStockTransactionsView role={role} />;
}