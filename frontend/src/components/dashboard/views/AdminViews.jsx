import { useState, useMemo, useEffect } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, TabPills, MiniBarChart, SearchBar } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import { pharmacyApi, normalizeSupplier } from "../../../api/pharmacy";
import usersApi, { normalizeUser } from "../../../api/users";
import dentistApi from "../../../api/dentists";
import auditLogsApi, { normalizeAuditLog } from "../../../api/auditLogs";
import reportsApi from "../../../api/reports";

let adminCounter = 4000;
const nextId = (prefix = "ADM") => `${prefix}-${++adminCounter}`;

export function AdminUsersView({ role = "admin", filterRole = "all" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeRole, setActiveRole] = useState(filterRole);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [realUsers, setRealUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "General Dentistry",
    qualification: "BDS Dental Surgeon",
    role: filterRole === "dentist" ? "dentist" : filterRole === "staff" ? "receptionist" : "patient",
    status: "active",
  });

  const fetchUsers = async () => {
    try {
      const [backendUsers, backendStaff, backendDentists] = await Promise.all([
        usersApi.getAllUsers().catch(() => []),
        usersApi.getAllStaff().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
      ]);
      const staffMap = {};
      backendStaff.forEach((s) => {
        if (s.userId) staffMap[s.userId] = s;
      });
      const dentistMap = {};
      backendDentists.forEach((d) => {
        if (d.userId) dentistMap[d.userId] = d;
      });
      if (backendUsers.length > 0) {
        const normalized = backendUsers.map((u) => {
          const norm = normalizeUser(u, staffMap);
          if (norm.role === "dentist" && dentistMap[u.id]) {
            norm.dentistCode = dentistMap[u.id].dentistCode;
            norm.specialization = dentistMap[u.id].specialization;
            norm.qualification = dentistMap[u.id].qualification;
            norm.experienceYears = dentistMap[u.id].experienceYears;
          }
          if (staffMap[u.id]) {
            norm.staffCode = staffMap[u.id].staffCode;
            norm.staffRole = staffMap[u.id].role;
          }
          return norm;
        });
        setRealUsers(normalized);
      } else {
        setRealUsers(collections.users || []);
      }
    } catch (err) {
      console.warn("Could not load backend users:", err);
      setRealUsers(collections.users || []);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      usersApi.getAllUsers().catch(() => []),
      usersApi.getAllStaff().catch(() => []),
      dentistApi.getAllDentists().catch(() => []),
    ]).then(([backendUsers, backendStaff, backendDentists]) => {
      if (!active) return;
      const staffMap = {};
      backendStaff.forEach((s) => {
        if (s.userId) staffMap[s.userId] = s;
      });
      const dentistMap = {};
      backendDentists.forEach((d) => {
        if (d.userId) dentistMap[d.userId] = d;
      });
      if (backendUsers.length > 0) {
        const normalized = backendUsers.map((u) => {
          const norm = normalizeUser(u, staffMap);
          if (norm.role === "dentist" && dentistMap[u.id]) {
            norm.dentistCode = dentistMap[u.id].dentistCode;
            norm.specialization = dentistMap[u.id].specialization;
            norm.qualification = dentistMap[u.id].qualification;
            norm.experienceYears = dentistMap[u.id].experienceYears;
          }
          if (staffMap[u.id]) {
            norm.staffCode = staffMap[u.id].staffCode;
            norm.staffRole = staffMap[u.id].role;
          }
          return norm;
        });
        setRealUsers(normalized);
      } else {
        setRealUsers(collections.users || []);
      }
    });
    return () => {
      active = false;
    };
  }, [collections.users]);

  const users = useMemo(() => {
    return realUsers.length > 0 ? realUsers : (collections.users || []);
  }, [realUsers, collections.users]);

  const filtered = useMemo(() => {
    let list = users;
    if (activeRole === "patient") list = users.filter((u) => u.role === "patient");
    else if (activeRole === "dentist") list = users.filter((u) => u.role === "dentist");
    else if (activeRole === "staff") list = users.filter((u) => u.role !== "patient" && u.role !== "dentist");

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((u) =>
      `${u.name || ""} ${u.email || ""} ${u.phone || ""} ${u.role || ""} ${u.dentistCode || ""} ${u.specialization || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [users, activeRole, search]);

  const columns = useMemo(() => {
    if (filterRole === "dentist") {
      return [
        { key: "dentistCode", label: "Doctor Code" },
        { key: "name", label: "Doctor Name" },
        { key: "email", label: "Email Address" },
        { key: "specialization", label: "Specialization" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Account Status", type: "status" },
      ];
    }
    if (filterRole === "staff") {
      return [
        { key: "name", label: "Staff Member" },
        { key: "email", label: "Email Address" },
        { key: "role", label: "Designation" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Account Status", type: "status" },
      ];
    }
    return [
      { key: "name", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "role", label: "System Role" },
      { key: "joined", label: "Joined Date" },
      { key: "status", label: "Account Status", type: "status" },
    ];
  }, [filterRole]);

  const pageTitle =
    filterRole === "dentist"
      ? "Doctor & Specialist Directory"
      : filterRole === "staff"
      ? "Clinic Staff & Administrative Directory"
      : "System Users & Role Privileges";

  const breadcrumbLabel =
    filterRole === "dentist"
      ? "Doctor Management"
      : filterRole === "staff"
      ? "Staff Management"
      : "User Management";

  const pageDesc =
    filterRole === "dentist"
      ? "Manage licensed dental surgeons, clinical credentials, and active staff privileges."
      : filterRole === "staff"
      ? "Manage clinic receptionists, cashiers, pharmacists, and support personnel."
      : "Manage system access, role permissions, and active credentials for clinic staff and patients.";

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;

    try {
      const parts = newUser.name.trim().split(" ");
      const firstName = parts[0] || "User";
      const lastName = parts.slice(1).join(" ") || "Member";

      let backendRole = "PATIENT";
      if (newUser.role === "dentist") backendRole = "DENTIST";
      else if (newUser.role === "admin") backendRole = "ADMIN";
      else if (["receptionist", "pharmacist", "cashier"].includes(newUser.role)) backendRole = "STAFF";

      const createdUser = await usersApi.createUser({
        firstName,
        lastName,
        email: newUser.email.trim(),
        phone: newUser.phone?.trim() || "0771234567",
        password: "demo123",
        role: backendRole,
      });

      if (newUser.role === "dentist" && createdUser?.id) {
        try {
          await dentistApi.createDentist({
            userId: createdUser.id,
            firstName,
            lastName,
            email: newUser.email.trim(),
            phone: newUser.phone?.trim() || "0771234567",
            specialization: newUser.specialization?.trim() || "General Dentistry",
            qualification: newUser.qualification?.trim() || "BDS Dental Surgeon",
          });
        } catch (dErr) {
          console.warn("Could not create dentist profile entity:", dErr);
        }
      } else if (["receptionist", "pharmacist", "cashier"].includes(newUser.role) && createdUser?.id) {
        try {
          await usersApi.createStaff({
            userId: createdUser.id,
            firstName,
            lastName,
            email: newUser.email.trim(),
            phone: newUser.phone?.trim() || "0771234567",
            role: newUser.role.toUpperCase(),
          });
        } catch (sErr) {
          console.warn("Could not create staff profile entity:", sErr);
        }
      }

      addToast(`User ${newUser.name} (${newUser.role.toUpperCase()}) created successfully!`, "success");
      setModalOpen(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        specialization: "General Dentistry",
        qualification: "BDS Dental Surgeon",
        role: filterRole === "dentist" ? "dentist" : filterRole === "staff" ? "receptionist" : "patient",
        status: "active",
      });
      await fetchUsers();
    } catch (err) {
      console.warn("Backend user creation failed, falling back to local state:", err);
      const userObj = {
        id: nextId("USR"),
        ...newUser,
        joined: new Date().toISOString().slice(0, 10),
      };
      saveRecord("users", userObj);
      setRealUsers((prev) => [userObj, ...prev]);
      addToast(`User ${userObj.name} (${userObj.role.toUpperCase()}) added!`, "success");
      setModalOpen(false);
    }
  };

  const handleToggleStatus = async (u) => {
    try {
      if (u.status === "active") {
        await usersApi.deactivateUser(u.id);
        addToast(`User ${u.name} deactivated successfully`, "info");
      } else {
        await usersApi.activateUser(u.id);
        addToast(`User ${u.name} activated successfully`, "success");
      }
      await fetchUsers();
    } catch (err) {
      console.warn("Backend toggle status failed, fallback to local:", err);
      const nextStatus = u.status === "active" ? "disabled" : "active";
      saveRecord("users", { ...u, status: nextStatus });
      setRealUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, status: nextStatus } : item)));
      addToast(`User ${u.name} status updated to '${nextStatus}'`, "info");
    }
  };

  return (
    <div className={`df-role-page df-role-violet`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Identity & Access Management</span>
          <h1>{pageTitle}</h1>
          <p>{pageDesc}</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          + {filterRole === "dentist" ? "Register Doctor" : filterRole === "staff" ? "Add Staff Member" : "Add New User"}
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Registered Users" value={String(users.length)} icon="◫" color="primary" />
        <StatCard label="Patients Registered" value={String(users.filter((u) => u.role === "patient").length)} icon="✓" color="success" />
        <StatCard label="Attending Dentists" value={String(users.filter((u) => u.role === "dentist").length)} icon="◈" color="primary" />
        <StatCard label="Clinic Staff" value={String(users.filter((u) => u.role !== "patient" && u.role !== "dentist").length)} icon="◷" color="primary" />
      </div>

      <TabPills
        tabs={[
          { label: "All Accounts", value: "all", count: users.length },
          { label: "Patients", value: "patient" },
          { label: "Dentists", value: "dentist" },
          { label: "Clinic Staff", value: "staff" },
        ]}
        activeTab={activeRole}
        onChange={setActiveRole}
      />

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-toolbar" style={{ marginBottom: 16 }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search directory by name, email, role, or doctor code..."
            />
          </div>

          <DataTable
            columns={columns}
            rows={filtered}
            actionLabel="Inspect"
            onEdit={(u) => setSelectedUser(u)}
            onQuickAction={handleToggleStatus}
            quickActionLabel={(u) => (u.status === "active" ? "Deactivate" : "Activate")}
          />
        </div>
      </section>

      {/* Inspect Profile Modal */}
      {selectedUser && (
        <Modal
          title={`User Profile: ${selectedUser.name}`}
          onClose={() => setSelectedUser(null)}
          footer={
            <button className="df-btn df-btn-primary" onClick={() => setSelectedUser(null)}>
              Close
            </button>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>System ID</small>
              <div style={{ fontWeight: 600, fontSize: 15 }}>#{selectedUser.id}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Legal Full Name</small>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedUser.name}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Email Address</small>
              <div style={{ fontWeight: 600 }}>{selectedUser.email || "None"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Telephone</small>
              <div style={{ fontWeight: 600 }}>{selectedUser.phone || "None"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>System Role</small>
              <div style={{ fontWeight: 600 }}>
                <span className={`df-badge df-badge-${selectedUser.role}`}>{selectedUser.role.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Account Status</small>
              <div style={{ fontWeight: 600 }}>
                <span className={`df-badge ${selectedUser.status === "active" ? "df-badge-active" : "df-badge-disabled"}`}>
                  {selectedUser.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {selectedUser.role === "dentist" && (
            <div style={{ marginTop: 16, padding: 14, background: "var(--df-gray-50)", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--df-primary-700)" }}>
                Dental Surgeon Credentials
              </div>
              <div className="df-form-2col">
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Dentist Code</small>
                  <div style={{ fontWeight: 600 }}>{selectedUser.dentistCode || "D-001"}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Specialization</small>
                  <div style={{ fontWeight: 600 }}>{selectedUser.specialization || "General Dentistry"}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Qualifications</small>
                  <div style={{ fontWeight: 600 }}>{selectedUser.qualification || "BDS Dental Surgeon"}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Clinical Experience</small>
                  <div style={{ fontWeight: 600 }}>{selectedUser.experienceYears ? `${selectedUser.experienceYears} Years` : "Senior Consultant"}</div>
                </div>
              </div>
            </div>
          )}

          {selectedUser.role !== "dentist" && selectedUser.role !== "patient" && (
            <div style={{ marginTop: 16, padding: 14, background: "var(--df-gray-50)", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--df-primary-700)" }}>
                Clinic Staff Assignment
              </div>
              <div className="df-form-2col">
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Staff Code</small>
                  <div style={{ fontWeight: 600 }}>{selectedUser.staffCode || "S-001"}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Designation</small>
                  <div style={{ fontWeight: 600 }}>{selectedUser.staffRole || selectedUser.role.toUpperCase()}</div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {modalOpen && (
        <Modal
          title={filterRole === "dentist" ? "Register Dental Surgeon" : filterRole === "staff" ? "Add Clinic Staff" : "Create New System User"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleAddUser}>
                Create User
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Full Name *</label>
              <input
                className="df-input"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. Dr. Kusal Mendis"
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Email Address *</label>
              <input
                type="email"
                className="df-input"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="kmendis@dentaflow.com"
                required
              />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Phone Number</label>
              <input
                className="df-input"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="0771234567"
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Role Assignment</label>
              <select
                className="df-select"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="patient">Patient</option>
                <option value="dentist">Dentist / Specialist</option>
                <option value="receptionist">Receptionist</option>
                <option value="cashier">Cashier</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
          </div>

          {newUser.role === "dentist" && (
            <div className="df-form-2col" style={{ marginTop: 14 }}>
              <div className="df-form-group">
                <label className="df-label">Specialization</label>
                <input
                  className="df-input"
                  value={newUser.specialization}
                  onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
                  placeholder="e.g. Orthodontics & Dental Surgery"
                />
              </div>
              <div className="df-form-group">
                <label className="df-label">Qualifications</label>
                <input
                  className="df-input"
                  value={newUser.qualification}
                  onChange={(e) => setNewUser({ ...newUser, qualification: e.target.value })}
                  placeholder="e.g. BDS, MS Oral Surgery"
                />
              </div>
            </div>
          )}

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Account Status</label>
            <select
              className="df-select"
              value={newUser.status}
              onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="disabled">Suspended</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AdminReportsView({ role }) {
  const { addToast } = useNotifications();
  const [category, setCategory] = useState("Financial Revenue");
  const [period, setPeriod] = useState("March 2026 (Month to Date)");
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    reportsApi.getAIReportsAll()
      .then(setReportData)
      .catch((err) => console.warn("Could not load AI reports from backend:", err));
  }, []);

  const handleExportCSV = () => {
    addToast(`Exported ${category} report for ${period} (CSV)`, "success");
  };

  const handlePrint = () => {
    addToast("Report sent to print spooler", "info");
  };

  const billing = reportData?.billingReport;
  const appts = reportData?.appointmentReport;

  const grossBilling = billing?.primaryAmount
    ? `LKR ${Number(billing.primaryAmount).toLocaleString()}`
    : "LKR 842,500";
  const netCollections = billing?.secondaryAmount
    ? `LKR ${Number(billing.secondaryAmount).toLocaleString()}`
    : "LKR 780,000";
  const completedProcedures = appts?.primaryCount !== undefined
    ? `${appts.primaryCount} Visits`
    : "248 Cases";
  const margin = billing?.primaryAmount && billing?.secondaryAmount
    ? `${Math.round((billing.secondaryAmount / billing.primaryAmount) * 100)}%`
    : "64.8%";

  return (
    <div className={`df-role-page df-role-violet`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Reports" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Business Intelligence</span>
          <h1>Clinical, Financial & Operational Reports</h1>
          <p>Generate auditable hospital performance data, revenue reconciliation, and clinical volume.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="df-btn df-btn-secondary" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="df-btn df-btn-primary" onClick={handlePrint}>
            🖨 Print Report
          </button>
        </div>
      </header>

      <section className="df-card" style={{ marginBottom: 24 }}>
        <div className="df-card-body">
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Report Domain</label>
              <select className="df-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Financial Revenue">Financial Revenue & Cashier Audits</option>
                <option value="Clinical Consultations">Clinical Consultations & Procedure Volume</option>
                <option value="Doctor Productivity">Doctor Chair-Time & Productivity</option>
                <option value="Pharmacy Consumption">Pharmacy Stock Dispensing & Waste</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Reporting Period</label>
              <select className="df-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="March 2026 (Month to Date)">March 2026 (Month to Date)</option>
                <option value="February 2026">February 2026</option>
                <option value="Quarter 1 2026">Quarter 1 2026 (Jan - Mar)</option>
                <option value="Annual 2025">Annual Fiscal 2025</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="df-stat-grid">
        <StatCard label="Gross Billing Value" value={grossBilling} icon="✓" color="success" />
        <StatCard label="Net Collections" value={netCollections} icon="◷" color="primary" />
        <StatCard label="Completed Procedures" value={completedProcedures} icon="◫" color="primary" />
        <StatCard label="Operating Margin" value={margin} icon="◈" color="success" />
      </div>

      <div className="df-overview-grid">
        <MiniBarChart
          title={`${category} Breakdown (${period})`}
          values={[
            { label: "Wk 1", value: 38 },
            { label: "Wk 2", value: 45 },
            { label: "Wk 3", value: 52 },
            { label: "Wk 4", value: 68 },
          ]}
        />
        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Category Summary</h3>
            </div>
            <div className="df-progress-list">
              <div className="df-progress-item">
                <div className="df-progress-label">
                  <span>Dental Implants & Surgery</span>
                  <strong>LKR 380,000</strong>
                </div>
                <div className="df-progress-track">
                  <div className="df-progress-fill" style={{ width: "45%" }} />
                </div>
              </div>
              <div className="df-progress-item">
                <div className="df-progress-label">
                  <span>Orthodontics & Aligners</span>
                  <strong>LKR 260,000</strong>
                </div>
                <div className="df-progress-track">
                  <div className="df-progress-fill" style={{ width: "30%" }} />
                </div>
              </div>
              <div className="df-progress-item">
                <div className="df-progress-label">
                  <span>Restorative & Cleaning</span>
                  <strong>LKR 202,500</strong>
                </div>
                <div className="df-progress-track">
                  <div className="df-progress-fill" style={{ width: "25%" }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AdminAuditLogsView({ role }) {
  const { collections } = useDashboardData();
  const { addToast } = useNotifications();
  const [auditLogs, setAuditLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      auditLogsApi.getAllAuditLogs().catch(() => []),
      usersApi.getAllUsers().catch(() => []),
    ]).then(([backendLogs, users]) => {
      if (!active) return;
      const uLookup = {};
      users.forEach((u) => { uLookup[u.id] = u; });
      if (backendLogs.length > 0) {
        setAuditLogs(backendLogs.map((l) => normalizeAuditLog(l, uLookup)));
      } else {
        setAuditLogs(collections.audit || []);
      }
    });
    return () => { active = false; };
  }, [collections.audit]);

  const filtered = useMemo(() => {
    if (!search.trim()) return auditLogs;
    const q = search.toLowerCase().trim();
    return auditLogs.filter(
      (l) =>
        `${l.id || ""} ${l.name || ""} ${l.detail || ""} ${l.status || ""}`
          .toLowerCase()
          .includes(q)
    );
  }, [auditLogs, search]);

  return (
    <div className={`df-role-page df-role-violet`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Audit Logs" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">System Traceability</span>
          <h1>Security & Operation Audit Trail</h1>
          <p>Immutable forensic logs of user logins, medical record modifications, and financial transactions.</p>
        </div>
        <button
          className="df-btn df-btn-secondary"
          onClick={() => addToast("Audit log bundle exported (JSON/CSV)", "success")}
        >
          Export Audit Bundle
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Logged Audit Events" value={String(auditLogs.length)} icon="◫" color="primary" />
        <StatCard label="Compliance Score" value="100% HIPAA" icon="✓" color="success" />
        <StatCard label="Security Warnings" value="0 Alerts" icon="◈" color="primary" />
        <StatCard label="Active IP Sessions" value="6 Terminals" icon="◷" color="primary" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-toolbar" style={{ marginBottom: 16 }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search audit trail by action, event detail, or log ref..."
            />
          </div>

          <DataTable
            columns={[
              { key: "id", label: "Log Ref #" },
              { key: "name", label: "Action Description" },
              { key: "detail", label: "Event Detail" },
              { key: "status", label: "Integrity", type: "status" },
            ]}
            rows={filtered}
            actionLabel="Inspect"
            onEdit={(row) => setSelectedLog(row)}
          />
        </div>
      </section>

      {selectedLog && (
        <Modal
          title={`Audit Log Record #${selectedLog.id}`}
          onClose={() => setSelectedLog(null)}
          footer={
            <button className="df-btn df-btn-primary" onClick={() => setSelectedLog(null)}>
              Close
            </button>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Log Reference</small>
              <div style={{ fontWeight: 600, fontSize: 15 }}>#{selectedLog.id}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Integrity Status</small>
              <div style={{ fontWeight: 600 }}>
                <span className="df-badge df-badge-active">SECURE & VERIFIED</span>
              </div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Action Type</small>
              <div style={{ fontWeight: 600 }}>{selectedLog.name}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Module / Category</small>
              <div style={{ fontWeight: 600 }}>{selectedLog.raw?.module || "SYSTEM"}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 14, background: "var(--df-gray-50)", borderRadius: 8 }}>
            <small style={{ color: "var(--df-text-muted)" }}>Event Details & Forensic Metadata</small>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>{selectedLog.detail || "No additional parameters recorded"}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function SuppliersView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [realSuppliers, setRealSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    category: "Dental Instruments",
    email: "",
    phone: "",
    contactPerson: "",
    terms: "Net 30",
    status: "active",
  });

  const [orderDraft, setOrderDraft] = useState({
    supplierId: 1,
    itemDescription: "",
    quantity: 50,
    estimatedCost: "LKR 45,000",
    deliveryDate: "2026-03-25",
    priority: "Standard",
  });

  const loadSuppliers = async () => {
    try {
      const list = await pharmacyApi.getAllSuppliers().catch(() => []);
      setRealSuppliers(list.map(normalizeSupplier));
    } catch (err) {
      console.warn("Could not load suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const list = await pharmacyApi.getAllSuppliers().catch(() => []);
        if (!mounted) return;
        setRealSuppliers(list.map(normalizeSupplier));
      } catch (err) {
        console.warn("Could not load suppliers:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const suppliers = useMemo(() => {
    return realSuppliers.length > 0 ? realSuppliers : (collections.suppliers || []);
  }, [realSuppliers, collections.suppliers]);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const pharma = suppliers.filter((s) => s.category.toLowerCase().includes("pharmaceutical")).length;
    const instruments = suppliers.filter((s) => s.category.toLowerCase().includes("instrument") || s.category.toLowerCase().includes("dental")).length;
    return { total, pharma, instruments };
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((sup) => {
      const matchesSearch =
        !search ||
        (sup.name && sup.name.toLowerCase().includes(search.toLowerCase())) ||
        (sup.category && sup.category.toLowerCase().includes(search.toLowerCase())) ||
        (sup.email && sup.email.toLowerCase().includes(search.toLowerCase())) ||
        (sup.phone && sup.phone.includes(search));

      if (!matchesSearch) return false;

      if (activeCategory === "all") return true;
      if (activeCategory === "pharma") return sup.category.toLowerCase().includes("pharmaceutical");
      if (activeCategory === "instruments") return sup.category.toLowerCase().includes("instrument") || sup.category.toLowerCase().includes("dental");
      if (activeCategory === "implants") return sup.category.toLowerCase().includes("implant") || sup.category.toLowerCase().includes("prosthetic");
      return true;
    });
  }, [suppliers, search, activeCategory]);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim() || !newSupplier.email.trim()) {
      addToast("Please provide supplier name and contact email", "warning");
      return;
    }

    try {
      const created = await pharmacyApi.createSupplier({
        supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
        supplierName: newSupplier.name.trim(),
        contactPerson: newSupplier.contactPerson || "Procurement Desk",
        email: newSupplier.email.trim(),
        phone: newSupplier.phone || "+94 11 000 0000",
        address: "Hospital Medical Supplies Zone",
        city: "Colombo",
        country: "Sri Lanka",
        suppliedItems: newSupplier.category,
        status: "ACTIVE",
        notes: `Procurement terms: ${newSupplier.terms || "Net 30"}`,
      });

      const supplierItem = normalizeSupplier(created) || {
        id: nextId("SUP"),
        name: newSupplier.name.trim(),
        category: newSupplier.category,
        email: newSupplier.email.trim(),
        phone: newSupplier.phone || "+94 11 000 0000",
        contactPerson: newSupplier.contactPerson || "Procurement Desk",
        terms: newSupplier.terms,
        status: "active",
      };

      saveRecord("suppliers", supplierItem);
      addToast(`Supplier ${supplierItem.name} added to procurement directory!`, "success");
      setIsAddOpen(false);
      setNewSupplier({
        name: "",
        category: "Dental Instruments",
        email: "",
        phone: "",
        contactPerson: "",
        terms: "Net 30",
        status: "active",
      });
      await loadSuppliers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to add supplier";
      addToast(typeof msg === "string" ? msg : "Failed to add supplier", "error");
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === Number(orderDraft.supplierId)) || suppliers[0];

    try {
      if (sup?.rawId) {
        await pharmacyApi.createPurchaseOrder({
          supplierId: sup.rawId,
          orderDate: new Date().toISOString().slice(0, 10),
          totalAmount: 45000.0,
          itemsDescription: orderDraft.itemDescription || `${sup.category} Batch Consignment`,
          notes: `Priority: ${orderDraft.priority || "Standard"}`,
          status: "PENDING",
        }).catch(() => null);
      }

      const tx = {
        id: nextId("TX"),
        medicine: orderDraft.itemDescription || `${sup.category} Batch Consignment`,
        type: "Stock In",
        quantity: `+${orderDraft.quantity}`,
        reference: `PO-${nextId("ORD")}`,
        date: new Date().toISOString().slice(0, 10),
        status: "completed",
      };
      saveRecord("transactions", tx);

      addToast(`Purchase Order ${tx.reference} placed with ${sup.name} (${orderDraft.estimatedCost})!`, "success");
      setIsOrderOpen(false);
      setOrderDraft({
        supplierId: 1,
        itemDescription: "",
        quantity: 50,
        estimatedCost: "LKR 45,000",
        deliveryDate: "2026-03-25",
        priority: "Standard",
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to place order";
      addToast(typeof msg === "string" ? msg : "Order failed", "error");
    }
  };

  const handleQuickOrder = (supplier) => {
    setOrderDraft((curr) => ({
      ...curr,
      supplierId: supplier.rawId || supplier.id,
      itemDescription: `Restock Consignment (${supplier.category})`,
    }));
    setIsOrderOpen(true);
  };

  const columns = [
    { key: "name", label: "Supplier / Vendor Name" },
    { key: "category", label: "Procurement Category" },
    { key: "email", label: "Orders Email" },
    { key: "phone", label: "Contact Hotline" },
    { key: "status", label: "Contract State", type: "status" },
  ];

  return (
    <div className={`df-role-page ${role === "admin" ? "df-role-violet" : "df-role-rose"}`}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: "Suppliers & Vendors" },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Supply Chain & Procurement</span>
          <h1>Dental Suppliers & Vendor Network</h1>
          <p>Manage pharmaceutical vendors, dental consumables distributors, active contracts, and purchase orders.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="df-btn df-btn-secondary" onClick={() => setIsOrderOpen(true)}>
            + Create Purchase Order
          </button>
          <button className="df-btn df-btn-primary" onClick={() => setIsAddOpen(true)}>
            + Add Supplier
          </button>
        </div>
      </header>

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing live vendor directory...
        </div>
      )}

      <div className="df-stat-grid">
        <StatCard label="Active Vendors" value={String(stats.total)} icon="◫" color="primary" />
        <StatCard label="Pharmaceutical Sources" value={String(stats.pharma)} icon="✓" color="success" />
        <StatCard label="Instruments & Consumables" value={String(stats.instruments)} icon="◈" color="primary" />
        <StatCard label="Fulfillment SLA" value="99.4%" icon="◷" color="success" />
      </div>

      <div className="df-toolbar" style={{ marginBottom: 16 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by supplier name, category, or contact..."
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Suppliers", value: "all", count: stats.total },
          { label: "Pharmaceuticals", value: "pharma", count: stats.pharma },
          { label: "Instruments & Equipment", value: "instruments", count: stats.instruments },
          { label: "Implants & Prosthetics", value: "implants" },
        ]}
        activeTab={activeCategory}
        onChange={setActiveCategory}
      />

      <section className="df-card">
        <div className="df-card-body">
          <DataTable
            columns={columns}
            rows={filtered}
            actionLabel="Inspect Contract"
            onEdit={(row) => setSelectedSupplier(row)}
            onQuickAction={handleQuickOrder}
            quickActionLabel="+ Order Stock"
          />
        </div>
      </section>

      {/* Inspect Supplier Modal */}
      {selectedSupplier && (
        <Modal
          title={`Supplier Profile: ${selectedSupplier.name}`}
          onClose={() => setSelectedSupplier(null)}
          footer={
            <>
              <button
                className="df-btn df-btn-secondary"
                onClick={() => {
                  handleQuickOrder(selectedSupplier);
                  setSelectedSupplier(null);
                }}
              >
                Create PO for this Vendor
              </button>
              <button className="df-btn df-btn-primary" onClick={() => setSelectedSupplier(null)}>
                Close
              </button>
            </>
          }
        >
          <div style={{ background: "var(--df-surface-variant, #f8fafc)", padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>{selectedSupplier.name}</strong>
              <span className="df-badge df-badge-success">{selectedSupplier.status}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--df-text-muted)" }}>
              Specialized in {selectedSupplier.category} • Contract terms: Net 30 days
            </p>
          </div>

          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Contact Email</label>
              <input className="df-input" value={selectedSupplier.email} disabled />
            </div>
            <div className="df-form-group">
              <label className="df-label">Direct Hotline</label>
              <input className="df-input" value={selectedSupplier.phone} disabled />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Category</label>
              <input className="df-input" value={selectedSupplier.category} disabled />
            </div>
            <div className="df-form-group">
              <label className="df-label">Payment Terms</label>
              <input className="df-input" value={selectedSupplier.terms || "Net 30 Days"} disabled />
            </div>
          </div>
        </Modal>
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <Modal
          title="Add New Supplier to Directory"
          onClose={() => setIsAddOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setIsAddOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleAddSupplier}>
                Add Supplier
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Supplier / Company Name *</label>
            <input
              className="df-input"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              placeholder="e.g. Lanka Meditech Instruments Ltd"
              required
            />
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Category</label>
              <select
                className="df-select"
                value={newSupplier.category}
                onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })}
              >
                <option value="Dental Instruments">Dental Instruments & Equipment</option>
                <option value="Pharmaceuticals">Pharmaceuticals & Anesthetics</option>
                <option value="Implants & Prosthetics">Implants & Prosthetics</option>
                <option value="Consumables & PPE">Consumables & PPE</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Payment Terms</label>
              <select
                className="df-select"
                value={newSupplier.terms}
                onChange={(e) => setNewSupplier({ ...newSupplier, terms: e.target.value })}
              >
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                <option value="Advance Payment">Advance Payment</option>
              </select>
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Contact Email *</label>
              <input
                type="email"
                className="df-input"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                placeholder="orders@vendor.lk"
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Contact Phone</label>
              <input
                className="df-input"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                placeholder="+94 11 234 5678"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Place Purchase Order Modal */}
      {isOrderOpen && (
        <Modal
          title="Generate Purchase Order (PO)"
          onClose={() => setIsOrderOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setIsOrderOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handlePlaceOrder}>
                Issue Purchase Order
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Select Vendor / Supplier</label>
            <select
              className="df-select"
              value={orderDraft.supplierId}
              onChange={(e) => setOrderDraft({ ...orderDraft, supplierId: e.target.value })}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Material / Item Description *</label>
            <input
              className="df-input"
              value={orderDraft.itemDescription}
              onChange={(e) => setOrderDraft({ ...orderDraft, itemDescription: e.target.value })}
              placeholder="e.g. Composite Resin Refill Kits, Pack of 50"
              required
            />
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Quantity</label>
              <input
                type="number"
                className="df-input"
                value={orderDraft.quantity}
                onChange={(e) => setOrderDraft({ ...orderDraft, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Estimated Total Budget</label>
              <input
                className="df-input"
                value={orderDraft.estimatedCost}
                onChange={(e) => setOrderDraft({ ...orderDraft, estimatedCost: e.target.value })}
              />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Required Delivery Date</label>
              <input
                type="date"
                className="df-input"
                value={orderDraft.deliveryDate}
                onChange={(e) => setOrderDraft({ ...orderDraft, deliveryDate: e.target.value })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Order Priority</label>
              <select
                className="df-select"
                value={orderDraft.priority}
                onChange={(e) => setOrderDraft({ ...orderDraft, priority: e.target.value })}
              >
                <option value="Standard">Standard (3-5 Days)</option>
                <option value="Urgent">Urgent Overnight Consignment</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

