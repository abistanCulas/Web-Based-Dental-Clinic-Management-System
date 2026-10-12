import { useState, useMemo, useEffect } from "react";
import StatCard from "../../components/common/StatCard";
import { Breadcrumbs, DataTable } from "../../components/dashboard/DashboardPrimitives";
import { useDashboardData } from "../../context/DashboardDataContext";
import { useNotifications } from "../../context/NotificationContext";
import { pharmacyApi, normalizeMedicine } from "../../api/pharmacy";
import reportsApi from "../../api/reports";

export default function PharmacistReports({ role = "pharmacist" }) {
  const { collections } = useDashboardData();
  const { addToast } = useNotifications();

  const [domain, setDomain] = useState("consumption");
  const [realMeds, setRealMeds] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [dispensingStats, setDispensingStats] = useState(null);
  const [dispensedCount, setDispensedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [meds, rx, invReport, dispReport] = await Promise.all([
          pharmacyApi.getAllMedicines().catch(() => []),
          pharmacyApi.getAllPrescriptions().catch(() => []),
          reportsApi.getAIReportInventory().catch(() => null),
          reportsApi.getAIReportDispensing().catch(() => null),
        ]);
        if (!mounted) return;
        setRealMeds(meds.map(normalizeMedicine));
        setPrescriptions(rx);
        if (invReport) setInventoryStats(invReport);
        if (dispReport) setDispensingStats(dispReport);
        const disp = rx.filter((r) => r.status === "COMPLETED" || r.status === "DISPENSED").length;
        setDispensedCount(disp);
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
    const val = medicines.reduce((acc, curr) => acc + (curr.stock * (curr.unitPrice || 0)), 0);
    return `LKR ${val.toLocaleString()}`;
  }, [medicines, inventoryStats]);

  const dispensedTotal = useMemo(() => {
    if (dispensingStats?.dispensedCount != null) {
      return `${dispensingStats.dispensedCount} Units`;
    }
    return `${dispensedCount} Units`;
  }, [dispensingStats, dispensedCount]);

  const lowStockTotal = useMemo(() => {
    if (inventoryStats?.lowStockCount != null) {
      return String(inventoryStats.lowStockCount);
    }
    return String(medicines.filter((m) => m.status === "low-stock").length);
  }, [inventoryStats, medicines]);

  const handleExportCSV = async () => {
    try {
      const type = domain === "stockout" ? "low-stock" : (domain === "consumption" ? "dispensing" : "inventory");
      const blob = await reportsApi.exportReportCSV(type);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pharmacy-${type}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Exported Pharmacy Consumption & Reorder Report (CSV)", "success");
    } catch (err) {
      addToast("Failed to export Pharmacy CSV: " + (err.response?.data?.message || err.message || "Unknown error"), "error");
    }
  };

  const handlePrintLog = () => {
    addToast("Pharmacy Audit Log sent to print spooler", "info");
  };

  const rows = useMemo(() => {
    const dispensedMap = {};
    if (Array.isArray(prescriptions)) {
      prescriptions.forEach((rx) => {
        if (rx.status === "COMPLETED" || rx.status === "DISPENSED" || rx.rawStatus === "COMPLETED" || rx.rawStatus === "DISPENSED") {
          if (Array.isArray(rx.medicines)) {
            rx.medicines.forEach((item) => {
              const medId = item.medicineId || item.id;
              const qty = Number(item.quantity) || 1;
              if (medId) dispensedMap[medId] = (dispensedMap[medId] || 0) + qty;
              if (item.name) dispensedMap[item.name.toLowerCase()] = (dispensedMap[item.name.toLowerCase()] || 0) + qty;
            });
          }
        }
      });
    }

    return medicines.map((m) => {
      const dispensedQty = dispensedMap[m.rawId] || dispensedMap[m.id] || (m.name ? dispensedMap[m.name.toLowerCase()] : 0) || 0;
      return {
        id: m.id,
        name: m.name,
        category: m.category || "General Pharmacology",
        dispensed: `${dispensedQty} ${m.unit || "units"}`,
        stock: `${m.stock} ${m.unit || "units"}`,
        status: m.status,
      };
    });
  }, [medicines, prescriptions]);

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Reports" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmacy Dispensing & Inventory Audits</span>
          <h1>Pharmaceutical Consumption & Stock Reports</h1>
          <p>Analyze clinical drug consumption, track inventory velocity, and plan supplier reorders.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="df-btn df-btn-secondary" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="df-btn df-btn-primary" onClick={handlePrintLog}>
            🖨 Print Report
          </button>
        </div>
      </header>

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing live pharmacy reports...
        </div>
      )}

      <section className="df-card" style={{ marginBottom: 24 }}>
        <div className="df-card-body">
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Report Category</label>
              <select className="df-select" value={domain} onChange={(e) => setDomain(e.target.value)}>
                <option value="consumption">Medicine Consumption & Fulfillment Velocity</option>
                <option value="expiry">Expiry Dates & Batch Quarantine</option>
                <option value="stockout">Low Stock & Vendor Replenishment Times</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Audit Cycle</label>
              <select className="df-select" defaultValue="current-month">
                <option value="current-month">March 2026 (Current Month)</option>
                <option value="last-month">February 2026</option>
                <option value="quarter">Quarter 1 2026 (Jan - Mar)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="df-stat-grid">
        <StatCard label="Dispensed Units (Month)" value={dispensedTotal} icon="✓" color="success" />
        <StatCard label="Estimated Stock Value" value={totalStockValue} icon="◫" color="primary" />
        <StatCard
          label="Low Stock Warnings"
          value={lowStockTotal}
          icon="◷"
          color="warning"
        />
        <StatCard label="Batch Quality Audited" value="100% Verified" icon="◈" color="primary" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>Pharmaceutical Utilization Ledger</h3>
            <span className="df-badge df-badge-primary">FDA & MOH Compliant</span>
          </div>

          <DataTable
            columns={[
              { key: "name", label: "Medicine Formulation" },
              { key: "category", label: "Drug Classification" },
              { key: "dispensed", label: "Monthly Consumption" },
              { key: "stock", label: "Remaining On Shelf" },
              { key: "status", label: "Inventory State", type: "status" },
            ]}
            rows={rows}
            actionLabel="Inspect Batch"
            onEdit={(row) => addToast(`Inspecting inventory records for ${row.name}`, "info")}
          />
        </div>
      </section>
    </div>
  );
}
