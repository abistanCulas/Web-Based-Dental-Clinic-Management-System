import { useEffect, useMemo, useState } from "react";
import AdminIcon from "./AdminIcons";
import { AdminPageHeader, statusChip } from "./AdminModules";
import { Modal } from "../dashboard/DashboardPrimitives";
import { useNotifications } from "../../context/NotificationContext";
import servicesApi from "../../api/services";
import { uploadImage, getImageUrl } from "../../api/upload";

const CATEGORIES = [
  "Preventive Dentistry",
  "Cosmetic Dentistry",
  "Orthodontics",
  "Oral Surgery",
  "Pediatric Dentistry",
  "Emergency Care",
  "Periodontics",
  "Restorative Dentistry",
  "Endodontics",
];

const ICONS = [
  { value: "checkup", label: "Checkup / General" },
  { value: "shield", label: "Shield / Preventive" },
  { value: "sparkles", label: "Sparkles / Cosmetic" },
  { value: "stethoscope", label: "Stethoscope / Clinical" },
  { value: "smile", label: "Smile / Orthodontics" },
  { value: "heart", label: "Heart / Periodontics" },
  { value: "pulse", label: "Pulse / Emergency" },
  { value: "zap", label: "Zap / Advanced" },
];

const INITIAL_FORM = {
  name: "",
  category: CATEGORIES[0],
  duration: "30-60 mins",
  price: "",
  description: "",
  icon: "checkup",
  status: "ACTIVE",
  imageUrl: null,
  imagePreview: null,
  imageFile: null,
};

export default function AdminServicesView() {
  const { addToast } = useNotifications();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [activeService, setActiveService] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [serviceImageError, setServiceImageError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refreshServices = async () => {
    try {
      const data = await servicesApi.getAllServicesAdmin();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to refresh services:", err);
      try {
        const publicData = await servicesApi.getServices();
        setServices(Array.isArray(publicData) ? publicData : []);
      } catch {
        // preserve
      }
    }
  };

  useEffect(() => {
    let active = true;
    servicesApi
      .getAllServicesAdmin()
      .then((data) => {
        if (active) setServices(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load admin services:", err);
        servicesApi
          .getServices()
          .then((pub) => {
            if (active) setServices(Array.isArray(pub) ? pub : []);
          })
          .catch(() => {
            if (active) setServices([]);
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filtered services
  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      const matchSearch =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.serviceCode || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (s.desc || s.description || "").toLowerCase().includes(q);

      const matchCat =
        categoryFilter === "all" ||
        (s.category || "").toLowerCase() === categoryFilter.toLowerCase();

      const matchStatus =
        statusFilter === "all" ||
        (s.status || "").toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchCat && matchStatus;
    });
  }, [services, search, categoryFilter, statusFilter]);

  const ALLOWED_SERVICE_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SERVICE_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleServiceImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = (file.type || "").toLowerCase();
    const fileName = (file.name || "").toLowerCase();
    const validExt = [".jpg", ".jpeg", ".png", ".webp"].some((ext) => fileName.endsWith(ext));

    if (!ALLOWED_SERVICE_IMAGE_TYPES.includes(fileType) && !validExt) {
      setServiceImageError("Only JPG, JPEG, PNG, and WEBP formats are allowed.");
      return;
    }

    if (file.size > MAX_SERVICE_IMAGE_SIZE) {
      setServiceImageError("File size must be less than 5 MB.");
      return;
    }

    setServiceImageError("");
    if (formData.imagePreview && formData.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
    }));
  };

  const handleRemoveServiceImage = () => {
    if (formData.imagePreview && formData.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      imageUrl: null,
    }));
    setServiceImageError("");
  };

  const openCreateModal = () => {
    if (formData.imagePreview && formData.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData(INITIAL_FORM);
    setFormError("");
    setServiceImageError("");
    setModalMode("create");
  };

  const openEditModal = (service) => {
    if (formData.imagePreview && formData.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setActiveService(service);
    const existingImg = service.imageUrl || service.image || null;
    setFormData({
      name: service.name || "",
      category: service.category || CATEGORIES[0],
      duration: service.duration || "30-60 mins",
      price: service.rawPrice !== null && service.rawPrice !== undefined
        ? service.rawPrice
        : String(service.price || "").replace(/[^0-9.]/g, ""),
      description: service.description || service.desc || "",
      icon: service.icon || "checkup",
      status: service.status || "ACTIVE",
      imageUrl: existingImg,
      imagePreview: existingImg,
      imageFile: null,
    });
    setFormError("");
    setServiceImageError("");
    setModalMode("edit");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Service name is required.");
      return;
    }
    if (!formData.category.trim()) {
      setFormError("Service category is required.");
      return;
    }
    const numPrice = parseFloat(String(formData.price).replace(/[^0-9.]/g, ""));
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError("Please enter a valid price (greater than or equal to 0).");
      return;
    }

    if (serviceImageError) {
      setFormError(serviceImageError);
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl || null;
      if (formData.imageFile) {
        try {
          setUploadingImage(true);
          const uploadRes = await uploadImage(formData.imageFile);
          finalImageUrl = uploadRes.url || uploadRes.imageUrl;
        } catch (uploadErr) {
          const isSize = uploadErr?.message?.includes("5 MB") || uploadErr?.response?.data?.error?.includes("5 MB");
          const errMsg = isSize ? "File size must be less than 5 MB." : (uploadErr?.response?.data?.message || uploadErr?.message || "Image upload failed.");
          setServiceImageError(errMsg);
          setFormError(errMsg);
          setSubmitting(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      if (modalMode === "create") {
        await servicesApi.createService({
          ...formData,
          price: numPrice,
          imageUrl: finalImageUrl,
        });
        addToast(`Service "${formData.name.trim()}" created successfully.`, "success");
      } else if (modalMode === "edit" && activeService?.id) {
        await servicesApi.updateService(activeService.id, {
          ...formData,
          price: numPrice,
          imageUrl: finalImageUrl,
        });
        addToast(`Service "${formData.name.trim()}" updated successfully.`, "success");
      }
      if (formData.imagePreview && formData.imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(formData.imagePreview);
      }
      setModalMode(null);
      await refreshServices();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while saving the service.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await servicesApi.deleteService(deleteTarget.id);
      addToast(`Service "${deleteTarget.name}" deleted successfully.`, "success");
      setDeleteTarget(null);
      await refreshServices();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete service.";
      addToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={
          <>
            <AdminIcon name="services" size={13} /> Clinic Operations
          </>
        }
        title="Dental Services"
        subtitle="Manage services offered by DentaFlow. Only services created and saved here are displayed on the public website."
        actions={
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={openCreateModal}
          >
            <AdminIcon name="plus" size={14} /> Add Service
          </button>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="adm-card" style={{ marginBottom: 20, padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 240px", position: "relative" }}>
            <input
              type="text"
              placeholder="Search by code, name, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="adm-input"
              style={{ width: "100%", paddingLeft: 34 }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--df-text-secondary, #6b7280)",
                pointerEvents: "none",
                display: "flex",
              }}
            >
              <AdminIcon name="search" size={15} />
            </span>
          </div>

          <div style={{ minWidth: 180 }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="adm-input"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 140 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="adm-input"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {(search || categoryFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* SERVICES TABLE */}
      <div className="adm-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--df-text-secondary, #6b7280)" }}>
            <div style={{ display: "inline-block", width: 28, height: 28, border: "3px solid rgba(37,99,235,0.2)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: 12 }}>Loading dental services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ display: "inline-flex", padding: 16, background: "rgba(37,99,235,0.06)", borderRadius: "50%", color: "#2563eb", marginBottom: 12 }}>
              <AdminIcon name="services" size={28} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--df-text-primary, #111827)", margin: "0 0 6px 0" }}>
              {services.length === 0 ? "No Dental Services Configured" : "No Matching Services Found"}
            </h3>
            <p style={{ color: "var(--df-text-secondary, #6b7280)", fontSize: 14, maxWidth: 440, margin: "0 auto 16px auto" }}>
              {services.length === 0
                ? "Click 'Add Service' above to create your first dental service. Only services saved in the database appear on the public Services page."
                : "Try adjusting your search query or clearing the selected filters."}
            </p>
            {services.length === 0 && (
              <button
                type="button"
                className="adm-btn adm-btn-primary"
                onClick={openCreateModal}
              >
                <AdminIcon name="plus" size={14} /> Add First Service
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((svc) => (
                  <tr key={svc.id}>
                    <td>
                      <span className="adm-cell-strong">{svc.serviceCode || `SRV-${svc.id}`}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "rgba(37,99,235,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid var(--df-border, #e5e7eb)",
                          }}
                        >
                          {svc.imageUrl || svc.image ? (
                            <img
                              src={svc.imageUrl || svc.image}
                              alt={svc.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ color: "#2563eb", display: "flex" }}>
                              <AdminIcon name="services" size={18} />
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="adm-cell-strong">{svc.name}</span>
                          {svc.desc && (
                            <div
                              className="adm-cell-muted"
                              style={{
                                maxWidth: 280,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={svc.desc}
                            >
                              {svc.desc}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="adm-chip adm-chip-blue">
                        <span className="adm-chip-dot" />
                        {svc.category}
                      </span>
                    </td>
                    <td className="adm-cell-muted">
                      {svc.duration || "—"}
                    </td>
                    <td>
                      <strong style={{ color: "var(--df-text-primary, #111827)" }}>
                        {svc.price}
                      </strong>
                    </td>
                    <td>{statusChip(svc.status || "ACTIVE")}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          onClick={() => openEditModal(svc)}
                          title="Edit Service"
                        >
                          <AdminIcon name="edit" size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn-danger adm-btn-sm"
                          onClick={() => setDeleteTarget(svc)}
                          title="Delete Service"
                        >
                          <AdminIcon name="x" size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT SERVICE MODAL */}
      {modalMode && (
        <Modal
          title={modalMode === "create" ? "Add Dental Service" : `Edit Service: ${activeService?.name || ""}`}
          onClose={() => !submitting && setModalMode(null)}
          footer={
            <>
              <button
                type="button"
                className="adm-btn adm-btn-ghost"
                onClick={() => setModalMode(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-primary"
                onClick={handleFormSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : modalMode === "create"
                  ? "Create Service"
                  : "Save Changes"}
              </button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {formError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "#dc2626",
                  fontSize: 13,
                }}
              >
                {formError}
              </div>
            )}

            <div>
              <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                Service Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Teeth Whitening & Cleaning"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="adm-input"
                required
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                  Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="adm-input"
                  style={{ width: "100%" }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                  Price (LKR) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 5000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="adm-input"
                  required
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                  Estimated Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 30-45 mins"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="adm-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                  Icon Style
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="adm-input"
                  style={{ width: "100%" }}
                >
                  {ICONS.map((ic) => (
                    <option key={ic.value} value={ic.value}>
                      {ic.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="adm-input"
                style={{ width: "100%" }}
              >
                <option value="ACTIVE">ACTIVE (Visible on public portal)</option>
                <option value="INACTIVE">INACTIVE (Hidden from public portal)</option>
              </select>
            </div>

            <div>
              <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                Service Image
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, border: "1px dashed var(--df-border, #e5e7eb)", borderRadius: 8, background: "var(--df-bg-subtle, #f9fafb)" }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", background: "rgba(37,99,235,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--df-border, #e5e7eb)" }}>
                  {formData.imagePreview ? (
                    <img src={formData.imagePreview} alt="Service preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "#2563eb", display: "flex" }}>
                      <AdminIcon name="services" size={24} />
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <label className="adm-btn adm-btn-ghost adm-btn-sm" style={{ cursor: "pointer", margin: 0, fontSize: 12 }}>
                      {formData.imagePreview ? "Replace Image" : "Upload Image"}
                      <input
                        type="file"
                        accept="image/jpeg, image/jpg, image/png, image/webp"
                        style={{ display: "none" }}
                        onChange={handleServiceImageChange}
                      />
                    </label>
                    {formData.imagePreview && (
                      <button
                        type="button"
                        className="adm-btn adm-btn-danger adm-btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={handleRemoveServiceImage}
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--df-text-secondary, #6b7280)" }}>
                    Accepted: JPG, JPEG, PNG, WEBP (Max 5 MB)
                  </div>
                </div>
              </div>
              {serviceImageError && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5, fontWeight: 500 }}>
                  {serviceImageError}
                </div>
              )}
            </div>

            <div>
              <label className="adm-label" style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Comprehensive description of the procedure, benefits, and care provided..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="adm-input"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <Modal
          title="Delete Dental Service"
          onClose={() => !deleting && setDeleteTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="adm-btn adm-btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Service"}
              </button>
            </>
          }
        >
          <p style={{ color: "var(--df-text-primary, #111827)", margin: "0 0 10px 0" }}>
            Are you sure you want to permanently delete the service:
          </p>
          <div
            style={{
              padding: "12px 14px",
              background: "var(--df-bg-subtle, #f9fafb)",
              borderRadius: 6,
              border: "1px solid var(--df-border, #e5e7eb)",
              marginBottom: 14,
            }}
          >
            <strong>{deleteTarget.name}</strong> ({deleteTarget.serviceCode || `ID: ${deleteTarget.id}`})
            <div style={{ color: "var(--df-text-secondary, #6b7280)", fontSize: 13, marginTop: 4 }}>
              Category: {deleteTarget.category} · Price: {deleteTarget.price}
            </div>
          </div>
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>
            This action cannot be undone. Once deleted, this service will no longer be visible to general users or patients.
          </p>
        </Modal>
      )}
    </div>
  );
}
export { AdminServicesView };
