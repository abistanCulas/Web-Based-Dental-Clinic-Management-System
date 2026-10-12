import { useState, useEffect, useCallback } from "react";
import AdminIcon from "./AdminIcons";
import { AdminPageHeader, AdminTabs } from "./AdminModules";
import { useNotifications } from "../../context/NotificationContext";
import reportsApi from "../../api/reports";

const TABS = [
  { label: "Patients", value: "patient" },
  { label: "Appointments", value: "appointments" },
  { label: "Revenue", value: "revenue" },
  { label: "Treatments", value: "treatment" },
  { label: "Inventory", value: "inventory" },
  { label: "Feedback", value: "feedback" },
  { label: "Inquiries", value: "inquiries" },
];

const CSV_TYPE_MAP = {
  patient: "patients",
  appointments: "appointments",
  revenue: "revenue",
  treatment: "treatments",
  inventory: "inventory",
  feedback: "feedback",
  inquiries: "inquiries",
};

const formatLKR = (val) => {
  const num = Number(val) || 0;
  return "LKR " + num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export function AIReportsView() {
  const { addToast } = useNotifications();
  const [section, setSection] = useState("patient");
  const [generatedAt, setGeneratedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);

  const fetchSectionData = useCallback(async (sec) => {
    setLoading(true);
    try {
      let res = null;
      switch (sec) {
        case "patient":
          res = await reportsApi.getAIReportPatients();
          break;
        case "appointments":
          res = await reportsApi.getAIReportAppointments();
          break;
        case "revenue":
          res = await reportsApi.getAIReportRevenue();
          break;
        case "treatment":
          res = await reportsApi.getAIReportTreatments();
          break;
        case "inventory":
          res = await reportsApi.getAIReportInventory();
          break;
        case "feedback":
          res = await reportsApi.getAIReportFeedback();
          break;
        case "inquiries":
          res = await reportsApi.getAIReportInquiries();
          break;
        default:
          res = await reportsApi.getAIReportPatients();
      }
      setData(res || {});
    } catch (err) {
      console.error(`Failed to fetch report data for ${sec}:`, err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectionData(section);
  }, [section, fetchSectionData]);

  const runGenerate = async () => {
    setLoading(true);
    try {
      await fetchSectionData(section);
      setGeneratedAt(new Date().toISOString().slice(0, 10));
      addToast("Report refreshed with the latest clinic database records.", "success");
    } catch {
      addToast("Failed to refresh report data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    const csvType = CSV_TYPE_MAP[section] || section;
    setExporting(true);
    try {
      addToast(`Preparing CSV export for ${section} report...`, "info");
      const blobData = await reportsApi.exportReportCSV(csvType);
      const blob = new Blob([blobData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `dentaflow-${csvType}-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast("CSV export completed successfully.", "success");
    } catch (err) {
      console.error("Export error:", err);
      addToast("Failed to export report CSV.", "error");
    } finally {
      setExporting(false);
    }
  };

  const downloadPDF = () => {
    window.print();
  };

  // Build section metrics, narrative & findings based on live backend data
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--df-text-secondary, #6b7280)" }}>
          <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid rgba(37,99,235,0.2)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: 14, fontWeight: 500 }}>Generating AI report from database...</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div style={{ textAlign: "center", padding: "56px 20px" }}>
          <div style={{ display: "inline-flex", padding: 18, background: "rgba(37,99,235,0.06)", borderRadius: "50%", color: "#2563eb", marginBottom: 14 }}>
            <AdminIcon name="ai" size={32} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--df-text-primary, #111827)", margin: "0 0 6px 0" }}>
            Unable to Load Report Data
          </h3>
          <p style={{ color: "var(--df-text-secondary, #6b7280)", fontSize: 14, maxWidth: 440, margin: "0 auto 16px auto" }}>
            The report service is currently unable to communicate with the analytics engine. Click below to retry.
          </p>
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => fetchSectionData(section)}>
            <AdminIcon name="refresh" size={14} /> Retry Query
          </button>
        </div>
      );
    }

    let title = "";
    let metrics = [];
    let narrative = "";
    let insights = [];
    let isZero = false;

    if (section === "patient") {
      title = "Patient Population & Demographics";
      const total = Number(data.totalPatients) || 0;
      const active = Number(data.activePatients) || 0;
      const inactive = Number(data.inactivePatients) || 0;
      isZero = total === 0;

      metrics = [
        { label: "Total Patients", value: total.toLocaleString() },
        { label: "Active Patients", value: active.toLocaleString() },
        { label: "Inactive / Recalled", value: inactive.toLocaleString() },
      ];

      narrative = isZero
        ? "No patient records have been registered in the database yet. As reception and clinical staff register new patients, growth trajectories and demographic breakdowns will synthesize here automatically."
        : `Currently, ${total.toLocaleString()} patient${total === 1 ? " is" : "s are"} registered in DentaFlow, of which ${active.toLocaleString()} (${total > 0 ? Math.round((active / total) * 100) : 0}%) are actively receiving care. Regular hygiene reminders and recall visits will keep this cohort engaged.`;

      if (!isZero) {
        insights.push({
          title: "Patient Retention & Activity",
          detail: `${active} of ${total} total patients have active status. Consider running targeted SMS campaigns for inactive accounts.`,
        });
        if (inactive > 0) {
          insights.push({
            title: "Recall Opportunity",
            detail: `${inactive} patient record(s) currently marked inactive. Routine 6-month checkup reminders can reactivate these patients.`,
          });
        }
      }
    } else if (section === "appointments") {
      title = "Appointment Volume & Scheduling Mix";
      const total = Number(data.totalAppointments) || 0;
      const completed = Number(data.completedAppointments) || 0;
      const confirmed = Number(data.confirmedAppointments) || 0;
      const cancelled = Number(data.cancelledAppointments) || 0;
      isZero = total === 0;

      metrics = [
        { label: "Total Appointments", value: total.toLocaleString() },
        { label: "Completed Visits", value: completed.toLocaleString() },
        { label: "Confirmed / Scheduled", value: confirmed.toLocaleString() },
        { label: "Cancelled / No-Show", value: cancelled.toLocaleString() },
      ];

      narrative = isZero
        ? "No clinical appointments have been booked yet. Once patients schedule visits online or via reception, scheduling density and completion rates will automatically calculate."
        : `A total of ${total.toLocaleString()} appointment${total === 1 ? " has" : "s have"} been scheduled across all clinic chairs. To date, ${completed.toLocaleString()} visits have been completed successfully with a completion rate of ${total > 0 ? Math.round((completed / total) * 100) : 0}%.`;

      if (!isZero) {
        if (data.reportResult?.summary) {
          insights.push({ title: "Clinical Scheduling Summary", detail: data.reportResult.summary });
        }
        if (Array.isArray(data.reportResult?.findings)) {
          data.reportResult.findings.forEach((f, idx) => {
            insights.push({ title: `Appointment Insight #${idx + 1}`, detail: f });
          });
        }
      }
    } else if (section === "revenue") {
      title = "Revenue & Billing Performance";
      const totalRev = Number(data.totalRevenue) || 0;
      const totalBilled = Number(data.totalBilled) || 0;
      const totalCollected = Number(data.totalCollected) || 0;
      const outstanding = Number(data.outstandingBilling) || 0;
      isZero = totalBilled === 0 && totalRev === 0;

      metrics = [
        { label: "Total Revenue", value: formatLKR(totalRev) },
        { label: "Total Invoiced", value: formatLKR(totalBilled) },
        { label: "Total Collected", value: formatLKR(totalCollected) },
        { label: "Outstanding Balance", value: formatLKR(outstanding) },
      ];

      narrative = isZero
        ? "No billing records or payments have been recorded yet. Invoices generated through the Cashier / Billing terminal will dynamically populate clinic revenue trends."
        : `Total gross clinic revenue collected stands at ${formatLKR(totalRev)} across all dental procedures and pharmacy dispensing. Total billed sum is ${formatLKR(totalBilled)} with ${formatLKR(outstanding)} currently outstanding across active patient accounts.`;

      if (!isZero) {
        const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 100)) : 0;
        insights.push({
          title: "Collection Efficiency",
          detail: `Current clinic collection rate is ${collectionRate}%. ${outstanding > 0 ? `Follow up on outstanding invoices totaling ${formatLKR(outstanding)}.` : "All invoices have been settled in full."}`,
        });
      }
    } else if (section === "treatment") {
      title = "Treatment Mix & Clinical Procedures";
      const total = Number(data.totalTreatments) || 0;
      const completed = Number(data.completedTreatments || data.completedCount) || 0;
      const activePlans = Number(data.activeTreatmentPlans) || 0;
      const actualCost = Number(data.actualCost) || 0;
      isZero = total === 0;

      metrics = [
        { label: "Total Procedures", value: total.toLocaleString() },
        { label: "Completed Treatments", value: completed.toLocaleString() },
        { label: "Active Treatment Plans", value: activePlans.toLocaleString() },
        { label: "Cumulative Clinical Cost", value: formatLKR(actualCost) },
      ];

      narrative = isZero
        ? "No dental treatment plans or clinical procedures have been logged. As dentists open charts and document treatments, procedural breakdowns and complication rates will display here."
        : `Dentists have initiated ${total.toLocaleString()} clinical procedure${total === 1 ? "" : "s"}, with ${completed.toLocaleString()} treatments marked fully complete. There are currently ${activePlans.toLocaleString()} multi-stage treatment plans in progress.`;

      if (!isZero) {
        if (data.reportResult?.summary) {
          insights.push({ title: "Clinical Performance Summary", detail: data.reportResult.summary });
        }
        if (Array.isArray(data.reportResult?.findings)) {
          data.reportResult.findings.forEach((f, idx) => {
            insights.push({ title: `Clinical Finding #${idx + 1}`, detail: f });
          });
        }
      }
    } else if (section === "inventory") {
      title = "Pharmacy Stock & Medicine Inventory";
      const totalMeds = Number(data.totalMedicines) || 0;
      const stockUnits = Number(data.totalStockQuantity) || 0;
      const lowStock = Number(data.lowStockCount) || 0;
      const invValue = Number(data.totalInventoryValue) || 0;
      isZero = totalMeds === 0;

      metrics = [
        { label: "Catalog Medicines", value: totalMeds.toLocaleString() },
        { label: "Units in Stock", value: stockUnits.toLocaleString() },
        { label: "Low Stock Items", value: lowStock.toLocaleString() },
        { label: "Valuation", value: formatLKR(invValue) },
      ];

      narrative = isZero
        ? "No pharmaceutical inventory has been registered in the clinic dispensary yet. Adding items in Pharmacy Management will calculate real-time inventory valuations and safety thresholds."
        : `Pharmacy dispensary catalog consists of ${totalMeds.toLocaleString()} distinct medicine SKU${totalMeds === 1 ? "" : "s"} totaling ${stockUnits.toLocaleString()} units with a combined inventory valuation of ${formatLKR(invValue)}.`;

      if (!isZero) {
        if (lowStock > 0) {
          insights.push({
            title: "Reorder Required",
            detail: `${lowStock} medicine item(s) are at or below their designated reorder threshold. Generate purchase orders to prevent stockouts.`,
          });
        } else {
          insights.push({
            title: "Healthy Stock Levels",
            detail: "All registered medicine inventory items are above their safety reorder thresholds.",
          });
        }
      }
    } else if (section === "feedback") {
      title = "Patient Feedback & Review Sentiment";
      const totalReviews = Number(data.totalReviews) || 0;
      const avg = Number(data.averageRating) || 0;
      const fiveStar = Number(data.fiveStarCount) || 0;
      const fourStar = Number(data.fourStarCount) || 0;
      isZero = totalReviews === 0;

      metrics = [
        { label: "Total Reviews", value: totalReviews.toLocaleString() },
        { label: "Average Rating", value: isZero ? "N/A" : `${avg.toFixed(1)} / 5.0` },
        { label: "5-Star Ratings", value: fiveStar.toLocaleString() },
        { label: "4-Star Ratings", value: fourStar.toLocaleString() },
      ];

      narrative = isZero
        ? "No patient reviews or feedback have been submitted yet. When patients review their dental visit and rate their care provider, satisfaction indexes and sentiment scores will update dynamically."
        : `Patients have submitted ${totalReviews.toLocaleString()} verified review${totalReviews === 1 ? "" : "s"}, yielding an average clinic satisfaction rating of ${avg.toFixed(1)} out of 5.0 stars.`;

      if (!isZero) {
        const positiveCount = fiveStar + fourStar;
        const positivePct = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;
        insights.push({
          title: "Patient Satisfaction",
          detail: `${positivePct}% of submitted patient reviews are 4 or 5 stars, demonstrating strong patient trust and clinical excellence.`,
        });
      }
    } else if (section === "inquiries") {
      title = "Patient Inquiries & Communication";
      const total = Number(data.totalInquiries) || 0;
      const pending = Number(data.pendingInquiries) || 0;
      const inProgress = Number(data.inProgressInquiries) || 0;
      const resolved = Number(data.resolvedInquiries) || 0;
      isZero = total === 0;

      metrics = [
        { label: "Total Inquiries", value: total.toLocaleString() },
        { label: "Pending Response", value: pending.toLocaleString() },
        { label: "In Progress", value: inProgress.toLocaleString() },
        { label: "Resolved", value: resolved.toLocaleString() },
      ];

      narrative = isZero
        ? "No patient inquiries have been received yet. As patients submit contact requests or consultation questions via the website, response times and resolution rates will be tracked here."
        : `Reception desk has recorded ${total.toLocaleString()} patient inquir${total === 1 ? "y" : "ies"}. Currently, ${pending.toLocaleString()} inquiry is pending initial response, and ${resolved.toLocaleString()} have been resolved.`;

      if (!isZero && pending > 0) {
        insights.push({
          title: "Pending Inquiries",
          detail: `There are ${pending} unanswered inquiries requiring response from reception staff.`,
        });
      }
    }

    return (
      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <h3 className="adm-card-title">{title}</h3>
            <div className="adm-cell-muted" style={{ marginTop: 3 }}>
              Synthesized from clinic database · As of {generatedAt}
            </div>
          </div>
          <span className="adm-chip adm-chip-cyan">
            <span className="adm-chip-dot" /> Live Clinic Analytics
          </span>
        </div>

        {/* METRICS GRID */}
        <div className="adm-kpi-grid" style={{ marginBottom: 18 }}>
          {metrics.map((m) => (
            <div className="adm-kpi adm-kpi-slim" key={m.label}>
              <div className="adm-kpi-label">{m.label}</div>
              <div className="adm-kpi-value">{m.value}</div>
            </div>
          ))}
        </div>

        {/* NARRATIVE */}
        <div className="adm-response ai" style={{ marginBottom: 16 }}>
          <span className="adm-resp-icon">
            <AdminIcon name="ai" size={17} />
          </span>
          <div>
            <div className="adm-response-meta">AI Narrative</div>
            <div style={{ lineHeight: 1.6 }}>{narrative}</div>
          </div>
        </div>

        {/* INSIGHTS */}
        <div className="df-label" style={{ marginBottom: 8 }}>
          Key Analytical Insights
        </div>
        {insights.length > 0 ? (
          <div className="adm-insight-grid">
            {insights.map((insight, i) => (
              <div className="adm-insight" key={i}>
                <span className="adm-insight-bulb">
                  <AdminIcon name="bolt" size={16} />
                </span>
                <div>
                  <strong>{insight.title}</strong>
                  <div className="adm-cell-muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {insight.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-response" style={{ marginTop: 4 }}>
            <div className="adm-cell-muted">
              {isZero
                ? "No additional analytical insights are available yet because no records have been logged in this category."
                : "All operations within this module are operating within normal clinic parameters."}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={
          <>
            <AdminIcon name="ai" size={13} /> Clinical & Operational Analytics
          </>
        }
        title="AI Reports & Insights"
        subtitle="Real-time clinical, financial, inventory, and feedback analytics derived directly from your live clinic database."
        actions={
          <>
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={downloadCSV}
              disabled={loading || exporting}
            >
              <AdminIcon name="download" size={15} /> {exporting ? "Exporting..." : "Download CSV"}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={downloadPDF}
              disabled={loading}
            >
              <AdminIcon name="printer" size={15} /> Print Report
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              onClick={runGenerate}
              disabled={loading}
            >
              <AdminIcon name="ai" size={15} /> {loading ? "Analyzing..." : "Refresh Report"}
            </button>
          </>
        }
      />

      <AdminTabs tabs={TABS} active={section} onChange={setSection} />

      {renderContent()}
    </div>
  );
}

export default AIReportsView;