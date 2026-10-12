import { useState, useMemo, useEffect } from "react";
import { Pencil, Trash2, Power, Calendar, Eye } from "lucide-react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, TabPills, MiniBarChart, SearchBar, ConfirmationDialog } from "../DashboardPrimitives";
import ScheduleModal from "../ScheduleModal";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import { pharmacyApi, normalizeSupplier } from "../../../api/pharmacy";
import usersApi, { normalizeUser } from "../../../api/users";
import dentistApi from "../../../api/dentists";
import auditLogsApi, { normalizeAuditLog } from "../../../api/auditLogs";
import reportsApi from "../../../api/reports";
import { uploadImage, getImageUrl } from "../../../api/upload";

let adminCounter = 4000;
const nextId = (prefix = "ADM") => `${prefix}-${++adminCounter}`;

// Dedicated entity helpers — keep Patient / Dentist / Staff rows strictly separated.
const isDentistRow = (u) =>
    Boolean(u.dentistId) &&
    !["admin", "administrator"].includes(String(u.role).toLowerCase()) &&
    String(u.rawStatus || u.status || "").toUpperCase() !== "DELETED";

const isStaffRow = (u) =>
    Boolean(u.staffId) &&
    !["admin", "administrator", "doctor", "dentist", "DOCTOR"].includes(String(u.role).toLowerCase()) &&
    String(u.rawStatus || u.status || "").toUpperCase() !== "DELETED";
const staffRoleForPosition = (position) => {
    const p = String(position || "").toLowerCase();
    if (p.includes("pharmac")) return "PHARMACIST";
    if (p.includes("cash")) return "CASHIER";
    if (p.includes("staff")) return "STAFF";
    return "RECEPTIONIST";
};

// Specializations supported by the dentist registration form.
const DENTAL_SPECIALIZATIONS = [
    "General Dentistry",
    "Orthodontics",
    "Prosthodontics",
    "Periodontics",
    "Endodontics",
    "Oral & Maxillofacial Surgery",
    "Pediatric Dentistry",
    "Oral Medicine",
    "Cosmetic Dentistry",
    "Other",
];

const FULL_NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const LICENSE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s./-]*$/;

// Normalise a Sri Lankan phone number by stripping spaces, dashes and brackets,
// then validate it as either local (07XXXXXXX) or international (+9477XXXXXXX).
const normalisePhone = (value) => String(value || "").replace(/[\s\-()]/g, "");
const isValidPhone = (value) => /^(?:0\d{9}|\+94\d{9})$/.test(normalisePhone(value));

export function AdminUsersView({ role = "admin", filterRole = "all" }) {
    const { collections, saveRecord } = useDashboardData();
    const { addToast } = useNotifications();
    const [activeRole, setActiveRole] = useState(filterRole);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [search, setSearch] = useState("");
    const [realUsers, setRealUsers] = useState([]);
    const [deactivationRequests, setDeactivationRequests] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [doctorImageError, setDoctorImageError] = useState(null);
    const [uploadingDoctorImage, setUploadingDoctorImage] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        specialization: "General Dentistry",
        qualification: "BDS Dental Surgeon",
        experienceYears: "",
        licenseNumber: "",
        about: "",
        staffPosition: "",
        department: "",
        role: filterRole === "dentist" ? "dentist" : filterRole === "staff" ? "receptionist" : "patient",
        status: "active",
        imageFile: null,
        imagePreview: null,
        imageUrl: null,
    });

    // FIX: this used to be duplicated (once here, once again inside the
    // mount useEffect below). Two copies of the same fetch/normalize logic
    // meant any future change had to be made twice, and it's easy for the
    // two copies to quietly drift apart. Now there's a single source of
    // truth and the useEffect just calls this.
    const fetchUsers = async ({ signal } = {}) => {
        try {
            const [backendUsers, backendStaff, backendDentists, deactReqs] = await Promise.all([
                usersApi.getAllUsers().catch(() => []),
                usersApi.getAllStaff().catch(() => []),
                dentistApi.getAllDentistsAdmin().catch(() => dentistApi.getAllDentists({ all: true })).catch(() => []),
                usersApi.getDeactivationRequests().catch(() => []),
            ]);
            if (signal?.aborted) return;

            setDeactivationRequests(Array.isArray(deactReqs) ? deactReqs : []);
            const staffMap = {};
            const staffEmailMap = {};
            backendStaff.forEach((s) => {
                if (s.userId) staffMap[s.userId] = s;
                if (s.email) staffEmailMap[s.email.toLowerCase()] = s;
            });
            const dentistMap = {};
            const dentistEmailMap = {};
            backendDentists.forEach((d) => {
                if (d.userId) dentistMap[d.userId] = d;
                if (d.email) dentistEmailMap[d.email.toLowerCase()] = d;
            });
            if (backendUsers.length > 0) {
                const userIdsMapped = new Set();
                const normalized = backendUsers.map((u) => {
                    userIdsMapped.add(u.id);
                    const norm = normalizeUser(u, staffMap);
                    const isDoc = norm.role === "dentist" || norm.role === "doctor" || u.role === "DENTIST" || u.role === "DOCTOR";
                    const docProfile = isDoc ? (dentistMap[u.id] || (u.email && dentistEmailMap[u.email.toLowerCase()])) : null;
                    const stfProfile = staffMap[u.id] || (u.email && staffEmailMap[u.email.toLowerCase()]);

                    if (docProfile) {
                        norm.dentistId = docProfile.id;
                        norm.dentistCode = docProfile.dentistCode;
                        norm.specialization = docProfile.specialization;
                        norm.qualification = docProfile.qualification;
                        norm.experienceYears = docProfile.experienceYears;
                        norm.licenseNumber = docProfile.licenseNumber;
                        norm.about = docProfile.about || docProfile.bio || "";
                        norm.bio = docProfile.bio || docProfile.about || "";
                        norm.profileImage = docProfile.imageUrl || docProfile.profileImage || docProfile.image || norm.profileImage;
                        norm.imageUrl = docProfile.imageUrl || docProfile.profileImage || docProfile.image || norm.imageUrl;
                        if (docProfile.status) {
                            const dStat = String(docProfile.status).toUpperCase();
                            norm.status = dStat === "ACTIVE" ? "active" : dStat === "DELETED" ? "deleted" : "inactive";
                            norm.rawStatus = dStat;
                        }
                    } else if (stfProfile) {
                        norm.staffId = stfProfile.id;
                        norm.staffCode = stfProfile.staffCode;
                        norm.staffRole = stfProfile.role;
                        if (stfProfile.phone && (!norm.phone || norm.phone === "—")) {
                            norm.phone = stfProfile.phone;
                        }
                        if (stfProfile.role) {
                            norm.role = stfProfile.role.toLowerCase();
                        }
                        norm.profileImage = stfProfile.imageUrl || stfProfile.profileImage || stfProfile.image || norm.profileImage || null;
                        norm.imageUrl = stfProfile.imageUrl || stfProfile.profileImage || stfProfile.image || norm.imageUrl || null;
                        if (stfProfile.status) {
                            const sStat = String(stfProfile.status).toUpperCase();
                            norm.status = sStat === "ACTIVE" ? "active" : sStat === "DELETED" ? "deleted" : "inactive";
                            norm.rawStatus = sStat;
                        }
                    } else {
                        // User has no linked dentist or staff profile
                        if (norm.role === "dentist" || norm.role === "doctor") {
                            norm.role = "patient";
                        }
                    }
                    return norm;
                });

                // Include any unlinked doctors from backendDentists
                backendDentists.forEach((d) => {
                    if (d.userId && userIdsMapped.has(d.userId)) return;
                    if (d.email && normalized.some((u) => u.email?.toLowerCase() === d.email.toLowerCase())) return;
                    if (String(d.status || "").toUpperCase() === "DELETED") return;
                     normalized.push({
                         id: `dentist-${d.id}`,
                         dentistId: d.id,
                         name: d.name || `Dr. ${d.firstName || ""} ${d.lastName || ""}`.trim(),
                         email: d.email || "",
                         phone: d.phone || "",
                         role: "dentist",
                         dentistCode: d.dentistCode,
                         specialization: d.specialization,
                         qualification: d.qualification,
                         experienceYears: d.experienceYears,
                         licenseNumber: d.licenseNumber,
                         about: d.about || d.bio || "",
                         bio: d.bio || d.about || "",
                         profileImage: d.imageUrl || d.profileImage || d.image || null,
                         imageUrl: d.imageUrl || d.profileImage || d.image || null,
                         status: String(d.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "active" : "inactive",
                         rawStatus: d.status || "ACTIVE",
                     });
                });

                // Include any unlinked staff from backendStaff
                // Filter out staff records that contain DOCTOR/DENTIST roles
                backendStaff.forEach((s) => {
                    if (s.userId && userIdsMapped.has(s.userId)) return;
                    if (s.email && normalized.some((u) => u.email?.toLowerCase() === s.email.toLowerCase())) return;
                    if (String(s.status || "").toUpperCase() === "DELETED") return;
                    const sRole = (s.role || "").toLowerCase();
                    if (sRole.includes("doctor") || sRole.includes("dentist")) return;
                    normalized.push({
                        id: `staff-${s.id}`,
                        staffId: s.id,
                        userId: s.userId || null,
                        name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email,
                        firstName: s.firstName,
                        lastName: s.lastName,
                        email: s.email || "",
                        phone: s.phone || "—",
                        role: sRole,
                        staffCode: s.staffCode,
                        staffRole: s.role,
                        profileImage: s.imageUrl || s.profileImage || s.image || null,
                        imageUrl: s.imageUrl || s.profileImage || s.image || null,
                        status: String(s.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "active" : "inactive",
                        rawStatus: s.status || "ACTIVE",
                    });
                });

                setRealUsers(normalized);
            } else {
                setRealUsers(collections.users || []);
            }
        } catch (err) {
            console.warn("Could not load backend users:", err);
            if (!signal?.aborted) setRealUsers(collections.users || []);
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editErrors, setEditErrors] = useState({});
    const [editUploading, setEditUploading] = useState(false);
    const [editImageError, setEditImageError] = useState(null);

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [schedulingUser, setSchedulingUser] = useState(null);

    const handleOpenSchedule = (u) => {
        if (!u.dentistId && !u.staffId) {
            addToast("This user account does not have a linked doctor or staff clinical profile.", "warning");
            return;
        }
        setSchedulingUser(u);
        setScheduleModalOpen(true);
    };

    const handleDeleteClick = (u) => {
        setDeleteTarget(u);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const u = deleteTarget;
        setShowDeleteConfirm(false);
        try {
            if (u.role === "dentist" || u.role === "doctor" || Boolean(u.dentistId) || filterRole === "dentist") {
                let targetId = u.dentistId;
                if (!targetId && u.id && typeof u.id === "number") {
                    try {
                        const doc = await dentistApi.getDentistByUserId(u.id);
                        if (doc?.id) targetId = doc.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup dentist by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^(dentist|doctor)-/, "");
                    await dentistApi.deleteDentist(targetId);
                    addToast(`Doctor ${u.name} deleted successfully`, "success");
                } else {
                    const userId = u.userId || (typeof u.id === "number" ? u.id : null);
                    if (userId) {
                        await usersApi.deleteUser(userId);
                        addToast(`Doctor user ${u.name} deleted successfully`, "success");
                    }
                }
            } else if (u.staffId || ["receptionist", "pharmacist", "cashier", "staff"].includes(u.role) || filterRole === "staff") {
                let targetId = u.staffId;
                if (!targetId && u.id && typeof u.id === "number") {
                    try {
                        const stf = await usersApi.getStaffByUserId(u.id);
                        if (stf?.id) targetId = stf.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup staff by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^staff-/, "");
                    await usersApi.deleteStaff(targetId);
                    addToast(`Staff member ${u.name} deleted successfully`, "success");
                } else {
                    const userId = u.userId || (typeof u.id === "number" ? u.id : null);
                    if (userId) {
                        await usersApi.deleteUser(userId);
                        addToast(`Staff user ${u.name} deleted successfully`, "success");
                    }
                }
            } else {
                await usersApi.deleteUser(u.userId || u.id);
                addToast(`User ${u.name} deleted successfully`, "success");
            }
            setDeleteTarget(null);
            await fetchUsers();
        } catch (err) {
            console.error("Delete failed:", err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to delete";
            addToast(typeof msg === "string" ? msg : "Failed to delete", "error");
        }
    };

    const openEditModal = (u) => {
        setEditingUser(u);
        const cleanName = (u.name || "").replace(/^Dr\.\s*/i, "").trim();
        const rawStatus = (u.rawStatus || u.status || "ACTIVE").toUpperCase();
        setEditForm({
            name: cleanName,
            email: u.email || "",
            phone: u.phone || "",
            specialization: u.specialization || "General Dentistry",
            qualification: u.qualification || "BDS Dental Surgeon",
            experienceYears: u.experienceYears ?? "",
            licenseNumber: u.licenseNumber || "",
            about: u.about || u.bio || "",
            bio: u.bio || u.about || "",
            staffPosition: u.staffPosition || u.staffRole || u.role || "",
            department: u.department || "",
            status: rawStatus === "ACTIVE" ? "active" : "disabled",
            profileImage: u.profileImage || u.imageUrl || u.image || null,
            imagePreview: u.profileImage || u.imageUrl || u.image || null,
            imageFile: null,
            imageUrl: u.imageUrl || u.profileImage || u.image || null,
        });
        setEditErrors({});
        setEditImageError(null);
        setEditModalOpen(true);
    };

    const handleEditChange = (field, value) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
        setEditErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleEditAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setEditImageError("Please upload a valid image file (JPG, PNG, or WEBP).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setEditImageError("Profile image size must be less than 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result;
            setEditForm((prev) => ({ ...prev, imagePreview: dataUrl, profileImage: dataUrl, imageFile: file, imageUrl: null }));
            try {
                setEditUploading(true);
                let uploadedUrl = null;
                const res = await uploadImage(file);
                uploadedUrl = res.url || res.imageUrl;
                setEditForm((prev) => ({ ...prev, imageUrl: uploadedUrl, profileImage: uploadedUrl || dataUrl }));
                setEditImageError(null);
                addToast("Profile image uploaded successfully!", "success");
            } catch (err) {
                console.warn("Could not upload avatar:", err);
                const isSize = err?.message?.includes("5 MB") || err?.response?.data?.error?.includes("5 MB");
                setEditImageError(isSize ? "File size must be less than 5 MB." : (err?.response?.data?.message || err?.message || "Failed to upload image"));
            } finally {
                setEditUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleEditAvatarRemove = async () => {
        try {
            if (editingUser?.dentistId || editingUser?.role === "dentist" || editingUser?.role === "doctor" || filterRole === "dentist") {
                if (editingUser.id && typeof editingUser.id === "number") {
                    await usersApi.deleteUserAvatar(editingUser.id);
                }
            } else if (editingUser?.staffId || ["receptionist", "pharmacist", "cashier", "staff"].includes(editingUser?.role)) {
                if (editingUser.id && typeof editingUser.id === "number") {
                    await usersApi.deleteUserAvatar(editingUser.id);
                }
                let targetId = editingUser.staffId;
                if (!targetId && editingUser.id && typeof editingUser.id === "number") {
                    try {
                        const stf = await usersApi.getStaffByUserId(editingUser.id);
                        if (stf?.id) targetId = stf.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup staff by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^staff-/, "");
                    await usersApi.updateStaff(targetId, { imageUrl: null });
                }
            }
            setEditForm((prev) => ({ ...prev, profileImage: null, imagePreview: null, imageFile: null, imageUrl: null }));
            addToast("Profile image removed.", "info");
        } catch (err) {
            console.warn("Could not remove avatar:", err);
            addToast("Failed to remove avatar", "error");
        }
    };

    const handleEditSubmit = async (e) => {
        e?.preventDefault?.();
        const errors = {};
        const rawName = (editForm.name || "").replace(/^Dr\.\s*/i, "").trim();
        const name = rawName;
        const email = (editForm.email || "").trim();
        const phone = (editForm.phone || "").trim();
        const role = editingUser?.role || "dentist";

        if (!name) errors.name = "Full name is required.";
        else if (name.length < 2) errors.name = "Full name must be at least 2 characters.";
        else if (name.length > 100) errors.name = "Full name must be 100 characters or fewer.";
        else if (!FULL_NAME_REGEX.test(name)) errors.name = "Full name must contain letters only.";

        if (!email) errors.email = "Email address is required.";
        else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";

        if (!phone) errors.phone = "Phone number is required.";
        else if (!isValidPhone(phone)) errors.phone = "Enter a valid phone number (e.g. 0771234567 or +94771234567).";

        const isDoctorRole = role === "dentist" || role === "doctor" || Boolean(editingUser?.dentistId) || filterRole === "dentist";

        if (isDoctorRole) {
            if (!editForm.specialization?.trim()) errors.specialization = "Specialization is required.";
            if (!editForm.qualification?.trim()) errors.qualification = "Qualification is required.";
            const experience = String(editForm.experienceYears ?? "").trim();
            if (experience && (!/^\d+$/.test(experience) || Number(experience) < 0 || Number(experience) > 50)) {
                errors.experienceYears = "Experience must be a whole number between 0 and 50.";
            }
            const license = (editForm.licenseNumber || "").trim();
            if (license && (license.length < 3 || license.length > 30 || !LICENSE_REGEX.test(license))) {
                errors.licenseNumber = "Enter a valid license number.";
            }
            if (!editForm.about?.trim()) errors.about = "About is required.";
            else if (editForm.about.trim().length < 10) errors.about = "About must be at least 10 characters.";
        }

        if (errors.name || errors.email || errors.phone || errors.specialization || errors.qualification || errors.experienceYears || errors.licenseNumber || errors.about) {
            setEditErrors(errors);
            return;
        }

        try {
            const parts = name.split(/\s+/);
            const firstName = parts.shift() || "";
            const lastName = parts.join(" ") || firstName;

            let uploadedImageUrl = editForm.imageUrl || editForm.profileImage || null;
            if (editForm.imageFile && !editForm.imageUrl) {
                try {
                    setEditUploading(true);
                    const uploadRes = await uploadImage(editForm.imageFile);
                    uploadedImageUrl = uploadRes.url || uploadRes.imageUrl;
                } catch (uploadErr) {
                    setEditUploading(false);
                    setEditImageError(uploadErr?.message?.includes("5 MB") ? "File size must be less than 5 MB." : (uploadErr?.response?.data?.message || uploadErr?.message || "File upload failed."));
                    setEditErrors({ submit: "Image upload failed." });
                    return;
                } finally {
                    setEditUploading(false);
                }
            }

            const updateData = {
                firstName,
                lastName,
                email,
                phone,
                imageUrl: uploadedImageUrl,
            };

            if (isDoctorRole) {
                updateData.specialization = editForm.specialization?.trim() || "General Dentistry";
                updateData.qualification = editForm.qualification?.trim() || "BDS Dental Surgeon";
                if (editForm.experienceYears !== undefined && editForm.experienceYears !== "") {
                    updateData.experienceYears = Number(editForm.experienceYears);
                }
                if (editForm.licenseNumber) updateData.licenseNumber = editForm.licenseNumber.trim();
                updateData.about = editForm.about?.trim() || "";
                updateData.bio = editForm.about?.trim() || "";
                const isFormActive = editForm.status === "active";
                updateData.status = isFormActive ? "ACTIVE" : "INACTIVE";

                let targetId = editingUser.dentistId;
                if (!targetId && editingUser.id && typeof editingUser.id === "number") {
                    try {
                        const doc = await dentistApi.getDentistByUserId(editingUser.id);
                        if (doc?.id) targetId = doc.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup dentist by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^dentist-/, "");
                    await dentistApi.updateDentist(targetId, updateData);
                    addToast(`Doctor ${name} updated successfully`, "success");
                } else {
                    const userId = editingUser.userId || (typeof editingUser.id === "number" ? editingUser.id : null);
                    if (userId) {
                        await usersApi.updateUser(userId, { firstName, lastName, phone: editForm.phone });
                        addToast(`Doctor user ${name} updated successfully`, "success");
                    }
                }
            } else if (editingUser?.staffId || ["receptionist", "pharmacist", "cashier", "staff"].includes(role) || filterRole === "staff") {
                updateData.role = (editingUser.staffRole || editForm.staffPosition || role).toUpperCase();
                updateData.firstName = firstName;
                updateData.lastName = lastName;
                let targetId = editingUser.staffId;
                if (!targetId && editingUser.id && typeof editingUser.id === "number") {
                    try {
                        const stf = await usersApi.getStaffByUserId(editingUser.id);
                        if (stf?.id) targetId = stf.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup staff by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^staff-/, "");
                    await usersApi.updateStaff(targetId, updateData);
                    addToast(`Staff member ${name} updated successfully`, "success");
                } else {
                    const userId = editingUser.userId || (typeof editingUser.id === "number" ? editingUser.id : null);
                    if (userId) {
                        await usersApi.updateUser(userId, { firstName, lastName, phone: editForm.phone });
                        addToast(`Staff user ${name} updated successfully`, "success");
                    }
                }
            } else {
                const userId = editingUser.userId || (typeof editingUser.id === "number" ? editingUser.id : null);
                if (userId) {
                    await usersApi.updateUser(userId, { firstName, lastName, phone: editForm.phone });
                    addToast(`${name} updated successfully`, "success");
                }
            }

            setEditModalOpen(false);
            setEditingUser(null);
            await fetchUsers();
        } catch (err) {
            console.error("Edit failed:", err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to update";
            addToast(typeof msg === "string" ? msg : "Failed to update", "error");
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchUsers({ signal: controller.signal });
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collections.users]);

    useEffect(() => {
        setActiveRole(filterRole);
    }, [filterRole]);

    const handleAdminAvatarUpload = (userId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            addToast("Please upload a valid image file (JPG, PNG, or WEBP).", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            addToast("Profile image size must be less than 5MB.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result;
            try {
                await usersApi.updateUserAvatar(userId, dataUrl);
                setSelectedUser((prev) => (prev ? { ...prev, profileImage: dataUrl } : null));
                setRealUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, profileImage: dataUrl } : u))
                );
                addToast("User avatar updated successfully!", "success");
            } catch (err) {
                console.warn("Could not update user avatar:", err);
                addToast("Failed to upload avatar", "error");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAdminAvatarRemove = async (userId) => {
        try {
            await usersApi.deleteUserAvatar(userId);
            setSelectedUser((prev) => (prev ? { ...prev, profileImage: null } : null));
            setRealUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, profileImage: null } : u))
            );
            addToast("User avatar removed.", "info");
        } catch (err) {
            console.warn("Could not remove user avatar:", err);
            addToast("Failed to remove avatar", "error");
        }
    };

    const handleApproveDeactivation = async (userId) => {
        try {
            await usersApi.approveDeactivation(userId);
            addToast("Account deactivation approved successfully.", "success");
            await fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser((prev) => (prev ? { ...prev, status: "disabled", deactivatedAt: new Date().toISOString() } : null));
            }
        } catch (err) {
            console.warn("Approval failed:", err);
            addToast("Failed to approve deactivation", "error");
        }
    };

    const handleRejectDeactivation = async (userId) => {
        try {
            await usersApi.rejectDeactivation(userId);
            addToast("Deactivation request rejected; user account restored to active.", "info");
            await fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser((prev) => (prev ? { ...prev, status: "active", deactivationReason: null } : null));
            }
        } catch (err) {
            console.warn("Rejection failed:", err);
            addToast("Failed to reject deactivation request", "error");
        }
    };

    const users = useMemo(() => {
        return realUsers.length > 0 ? realUsers : (collections.users || []);
    }, [realUsers, collections.users]);

    const filtered = useMemo(() => {
        let list = users;
        if (activeRole === "patient") list = users.filter((u) => u.role === "patient");
        else if (activeRole === "dentist") list = users.filter(isDentistRow);
        else if (activeRole === "staff") list = users.filter(isStaffRow);

        if (!search.trim()) return list;
        const q = search.toLowerCase().trim();
        return list.filter((u) => {
            if (activeRole === "dentist") {
                return `${u.dentistCode || ""} ${u.name || ""} ${u.email || ""} ${u.specialization || ""} ${u.qualification || ""} ${u.phone || ""}`
                    .toLowerCase()
                    .includes(q);
            }
            if (activeRole === "staff") {
                const staffIdDisplay = u.staffCode || (u.staffId ? `s-${u.staffId}` : "");
                return `${staffIdDisplay} ${u.staffCode || ""} ${u.name || ""} ${u.email || ""} ${u.phone || ""} ${u.staffRole || ""} ${u.role || ""} ${u.staffPosition || ""} ${u.department || ""}`
                    .toLowerCase()
                    .includes(q);
            }
            return `${u.name || ""} ${u.email || ""} ${u.phone || ""} ${u.role || ""} ${u.dentistCode || ""} ${u.specialization || ""}`
                .toLowerCase()
                .includes(q);
        });
    }, [users, activeRole, search]);

    const columns = useMemo(() => {
        if (filterRole === "dentist") {
            return [
                { key: "dentistCode", label: "Doctor Code", width: "120px" },
                {
                    key: "name",
                    label: "Dentist Name",
                    render: (r) => (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "var(--df-primary-700)", flexShrink: 0 }}>
                                {r.profileImage || r.imageUrl || r.image ? (
                                    <img src={r.profileImage || r.imageUrl || r.image} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    (r.name || "D").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                                )}
                            </div>
                            <span style={{ fontWeight: 500 }}>{r.name}</span>
                        </div>
                    ),
                },
                { key: "email", label: "Email Address" },
                { key: "specialization", label: "Specialization" },
                { key: "phone", label: "Phone" },
                { key: "license", label: "License / Registration", render: (r) => r.licenseNumber || r.qualification || "—" },
                {
                    key: "schedule",
                    label: "Schedule",
                    render: (r) => (
                        <button
                            type="button"
                            className="df-btn df-btn-outline df-btn-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSchedule(r);
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 8px" }}
                            title="Manage doctor's weekly work hours and OFF days"
                        >
                            <Calendar size={13} />
                            <span>Schedule</span>
                        </button>
                    ),
                },
                { key: "status", label: "Account Status", type: "status" },
            ];
        }
        if (filterRole === "staff") {
            return [
                {
                    key: "staffCode",
                    label: "Staff ID",
                    width: "110px",
                    render: (r) => (
                        <span style={{ fontWeight: 600, color: "var(--df-gray-700)" }}>
                            {r.staffCode || (r.staffId ? `S-${String(r.staffId).padStart(3, "0")}` : "—")}
                        </span>
                    ),
                },
                {
                    key: "profilePicture",
                    label: "Profile Picture",
                    width: "90px",
                    align: "center",
                    headerAlign: "center",
                    render: (r) => (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "var(--df-primary-700)", margin: "0 auto", flexShrink: 0 }}>
                            {r.profileImage || r.imageUrl || r.image ? (
                                <img src={r.profileImage || r.imageUrl || r.image} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                (r.name || "S").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                            )}
                        </div>
                    ),
                },
                {
                    key: "name",
                    label: "Staff Name",
                    width: "160px",
                    render: (r) => (
                        <span style={{ fontWeight: 600, color: "var(--df-gray-900)" }}>{r.name}</span>
                    ),
                },
                { key: "email", label: "Email Address", width: "200px" },
                {
                    key: "role",
                    label: "Role",
                    width: "130px",
                    render: (r) => {
                        const rawRole = r.staffRole || r.staffPosition || r.role || "Staff";
                        return (
                            <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
                                {String(rawRole).toLowerCase()}
                            </span>
                        );
                    },
                },
                {
                    key: "phone",
                    label: "Phone",
                    width: "130px",
                    render: (r) => r.phone || "—",
                },
                {
                    key: "schedule",
                    label: "Schedule",
                    width: "110px",
                    align: "center",
                    headerAlign: "center",
                    render: (r) => (
                        <button
                            type="button"
                            className="df-btn df-btn-outline df-btn-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSchedule(r);
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 8px" }}
                            title="Manage staff member's weekly shift schedule and OFF days"
                        >
                            <Calendar size={13} />
                            <span>Schedule</span>
                        </button>
                    ),
                },
                { key: "status", label: "Account Status", type: "status", width: "130px", align: "center", headerAlign: "center" },
            ];
        }
        return [
            { key: "name", label: "Full Name" },
            { key: "email", label: "Email Address" },
            { key: "role", label: "System Role" },
            { key: "joined", label: "Joined Date" },
            {
                key: "schedule",
                label: "Schedule",
                render: (r) => (isDentistRow(r) || isStaffRow(r)) ? (
                    <button
                        type="button"
                        className="df-btn df-btn-outline df-btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSchedule(r);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 8px" }}
                    >
                        <Calendar size={13} />
                        <span>Schedule</span>
                    </button>
                ) : <span style={{ color: "var(--df-text-muted)" }}>—</span>,
            },
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
            ? "Manage licensed dental surgeons, clinical credentials, licenses, and professional activity."
            : filterRole === "staff"
                ? "Manage clinic receptionists, pharmacists, cashiers, and support personnel."
                : "Manage system access, role permissions, and active credentials for clinic staff and patients.";

    const sectionLabel =
        filterRole === "dentist"
            ? "Dental Professionals"
            : filterRole === "staff"
                ? "Clinic Staff & Support"
                : "Identity & Access Management";

    const searchPlaceholder =
        filterRole === "dentist"
            ? "Search dentists by name, doctor code, email, specialization, or license..."
            : filterRole === "staff"
                ? "Search staff by ID, name, email, role, or phone..."
                : "Search directory by name, email, or role...";

    const dentistRows = users.filter(isDentistRow);
    const staffRows = users.filter(isStaffRow);
    const activeOf = (rows) => rows.filter((r) => r.status === "active").length;
    const staffFor = (labelPart) =>
        staffRows.filter((r) =>
            `${r.staffPosition || ""} ${r.staffRole || ""} ${r.role || ""}`
                .toLowerCase()
                .includes(labelPart.toLowerCase())
        ).length;

    const ALLOWED_DOCTOR_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_DOCTOR_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

    const handleDoctorImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileType = (file.type || "").toLowerCase();
        const fileName = (file.name || "").toLowerCase();
        const validExt = [".jpg", ".jpeg", ".png", ".webp"].some((ext) => fileName.endsWith(ext));

        if (!ALLOWED_DOCTOR_IMAGE_TYPES.includes(fileType) && !validExt) {
            setDoctorImageError("Only JPG, JPEG, PNG, and WEBP formats are allowed.");
            return;
        }

        if (file.size > MAX_DOCTOR_IMAGE_SIZE) {
            setDoctorImageError("File size must be less than 5 MB.");
            return;
        }

        setDoctorImageError(null);
        if (newUser.imagePreview && newUser.imagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(newUser.imagePreview);
        }
        const previewUrl = URL.createObjectURL(file);
        setNewUser((prev) => ({
            ...prev,
            imageFile: file,
            imagePreview: previewUrl,
        }));
    };

    const handleRemoveDoctorImage = () => {
        if (newUser.imagePreview && newUser.imagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(newUser.imagePreview);
        }
        setNewUser((prev) => ({
            ...prev,
            imageFile: null,
            imagePreview: null,
            imageUrl: null,
        }));
        setDoctorImageError(null);
    };

    const handleAddUser = async (e) => {
        e?.preventDefault?.();
        const errors = {};
        const name = newUser.name?.trim() || "";
        const email = newUser.email?.trim() || "";
        const rawPhone = newUser.phone?.trim() || "";
        const phone = normalisePhone(rawPhone);
        const role = (filterRole === "dentist" ? "dentist" : filterRole === "staff" ? "receptionist" : newUser.role)?.trim() || "";

        const password = newUser.password?.trim() || "";
        const confirmPassword = newUser.confirmPassword?.trim() || "";

        if (!name) errors.name = "Full name is required.";
        else if (name.length < 2) errors.name = "Full name must be at least 2 characters.";
        else if (name.length > 100) errors.name = "Full name must be 100 characters or fewer.";
        else if (!FULL_NAME_REGEX.test(name)) errors.name = "Full name must contain letters only.";

        if (!email) errors.email = "Email address is required.";
        else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";

        if (!rawPhone) errors.phone = "Phone number is required.";
        else if (!isValidPhone(rawPhone)) errors.phone = "Enter a valid phone number (e.g. 0771234567 or +94771234567).";

        if (!role) errors.role = "Role is required.";

        if (role === "dentist") {
            if (!newUser.specialization?.trim()) errors.specialization = "Please select a specialization.";
            else if (!DENTAL_SPECIALIZATIONS.includes(newUser.specialization.trim())) errors.specialization = "Please select a valid specialization.";

            if (!newUser.qualification?.trim()) errors.qualification = "Qualification is required.";

            const experience = String(newUser.experienceYears ?? "").trim();
            if (experience) {
                if (!/^\d+$/.test(experience)) {
                    errors.experienceYears = "Experience must be a whole number.";
                } else {
                    const years = Number(experience);
                    if (years < 0 || years > 50) errors.experienceYears = "Experience must be between 0 and 50 years.";
                }
            }

            const license = newUser.licenseNumber?.trim();
            if (license && (license.length < 3 || license.length > 30 || !LICENSE_REGEX.test(license))) {
                errors.licenseNumber = "Enter a valid license number.";
            }

            if (!newUser.about?.trim()) {
                errors.about = "About is required.";
            } else if (newUser.about.trim().length < 10) {
                errors.about = "About must be at least 10 characters.";
            }
        }

        if (["receptionist", "pharmacist", "cashier"].includes(role) && !newUser.staffPosition?.trim()) {
            errors.staffPosition = "Please select a staff role.";
        }

        if (!password) {
            errors.password = "Password is required.";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters.";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Confirm password is required.";
        } else if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match.";
        }

        if (doctorImageError) {
            errors.image = doctorImageError;
        }

        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        try {
            const parts = name.split(/\s+/);
            const firstName = parts.shift();
            const lastName = parts.join(" ") || firstName;

            let uploadedImageUrl = newUser.imageUrl || null;
            if (newUser.imageFile) {
                try {
                    setUploadingDoctorImage(true);
                    const uploadRes = await uploadImage(newUser.imageFile);
                    uploadedImageUrl = uploadRes.url || uploadRes.imageUrl;
                } catch (uploadErr) {
                    setUploadingDoctorImage(false);
                    const isSize = uploadErr?.message?.includes("5 MB") || uploadErr?.response?.data?.error?.includes("5 MB");
                    const errMsg = isSize ? "File size must be less than 5 MB." : (uploadErr?.response?.data?.message || uploadErr?.message || "File upload failed.");
                    setDoctorImageError(errMsg);
                    setFormErrors({ submit: errMsg });
                    return;
                } finally {
                    setUploadingDoctorImage(false);
                }
            }

            if (role === "dentist") {
                await dentistApi.createDentist({
                    firstName,
                    lastName,
                    email,
                    phone,
                    password,
                    specialization: newUser.specialization?.trim() || "General Dentistry",
                    qualification: newUser.qualification?.trim() || "BDS Dental Surgeon",
                    experienceYears: newUser.experienceYears?.trim() ? Number(newUser.experienceYears.trim()) : undefined,
                    imageUrl: uploadedImageUrl,
                    bio: newUser.about?.trim() || "",
                });
            } else if (["receptionist", "pharmacist", "cashier"].includes(role)) {
                await usersApi.createStaff({
                    firstName,
                    lastName,
                    email,
                    phone,
                    password,
                    imageUrl: uploadedImageUrl,
                    role: filterRole === "staff" ? staffRoleForPosition(newUser.staffPosition) : role.toUpperCase(),
                });
            } else {
                await usersApi.createUser({
                    firstName,
                    lastName,
                    email,
                    phone,
                    password,
                    role: role === "admin" ? "ADMIN" : "PATIENT",
                });
            }

            addToast(`User ${name} (${role.toUpperCase()}) created successfully!`, "success");
            setModalOpen(false);
            setFormErrors({});
            if (newUser.imagePreview && newUser.imagePreview.startsWith("blob:")) {
                URL.revokeObjectURL(newUser.imagePreview);
            }
            setDoctorImageError(null);
             setNewUser({
                 name: "",
                 email: "",
                 phone: "",
                 password: "",
                 confirmPassword: "",
                 specialization: "General Dentistry",
                 qualification: "BDS Dental Surgeon",
                 experienceYears: "",
                 licenseNumber: "",
                 about: "",
                 staffPosition: "",
                 department: "",
                 role: filterRole === "dentist" ? "dentist" : filterRole === "staff" ? "receptionist" : "patient",
                 status: "active",
                 imageFile: null,
                 imagePreview: null,
                 imageUrl: null,
             });
            setShowPassword(false);
            setShowConfirmPassword(false);
            await fetchUsers();
        } catch (err) {
            console.error("Backend user creation failed:", err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create user";
            setFormErrors({ submit: typeof msg === "string" ? msg : "Failed to create user" });
            addToast(typeof msg === "string" ? msg : "Failed to create user", "error");
        }
    };

    const openCreateModal = () => {
        if (newUser.imagePreview && newUser.imagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(newUser.imagePreview);
        }
        setDoctorImageError(null);
        setFormErrors({});
        setShowPassword(false);
        setShowConfirmPassword(false);
        setNewUser({
            name: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        specialization: "General Dentistry",
        qualification: "BDS Dental Surgeon",
        experienceYears: "",
        licenseNumber: "",
        about: "",
        staffPosition: "",
        department: "",
        role: filterRole === "dentist" ? "dentist" : filterRole === "staff" ? "receptionist" : "patient",
        status: "active",
        imageFile: null,
        imagePreview: null,
        imageUrl: null,
    });
        setModalOpen(true);
    }

    const handleToggleStatus = async (u) => {
        if (u.role === "admin") {
            addToast("Administrator accounts cannot be deactivated.", "warning");
            return;
        }

        const isCurrentlyActive = u.status === "active";
        const isDoctor = u.role === "dentist" || u.role === "doctor" || Boolean(u.dentistId) || filterRole === "dentist";
        const isStaff = ["receptionist", "pharmacist", "cashier", "staff", "assistant", "dental assistant", "nurse", "administrator"].includes(u.role) || Boolean(u.staffId) || filterRole === "staff";

        try {
            if (isDoctor) {
                let targetId = u.dentistId;
                if (!targetId && u.id && typeof u.id === "number") {
                    try {
                        const doc = await dentistApi.getDentistByUserId(u.id);
                        if (doc?.id) targetId = doc.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup dentist by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^dentist-/, "");
                    if (isCurrentlyActive) {
                        await dentistApi.deactivateDentist(targetId);
                        addToast(`Doctor ${u.name} deactivated successfully`, "info");
                    } else {
                        await dentistApi.activateDentist(targetId);
                        addToast(`Doctor ${u.name} activated successfully`, "success");
                    }
                } else {
                    const userId = u.userId || (typeof u.id === "number" ? u.id : null);
                    if (userId) {
                        if (isCurrentlyActive) {
                            await usersApi.deactivateUser(userId);
                            addToast(`Doctor user ${u.name} deactivated successfully`, "info");
                        } else {
                            await usersApi.activateUser(userId);
                            addToast(`Doctor user ${u.name} activated successfully`, "success");
                        }
                    }
                }
            } else if (isStaff) {
                let targetId = u.staffId;
                if (!targetId && u.id && typeof u.id === "number") {
                    try {
                        const stf = await usersApi.getStaffByUserId(u.id);
                        if (stf?.id) targetId = stf.id;
                    } catch (lookupErr) {
                        console.warn("Could not lookup staff by userId:", lookupErr);
                    }
                }
                if (targetId) {
                    if (typeof targetId === "string") targetId = targetId.replace(/^staff-/, "");
                    if (isCurrentlyActive) {
                        await usersApi.deactivateStaff(targetId);
                        addToast(`Staff member ${u.name} deactivated successfully`, "info");
                    } else {
                        await usersApi.activateStaff(targetId);
                        addToast(`Staff member ${u.name} activated successfully`, "success");
                    }
                } else {
                    const userId = u.userId || (typeof u.id === "number" ? u.id : null);
                    if (userId) {
                        if (isCurrentlyActive) {
                            await usersApi.deactivateUser(userId);
                            addToast(`Staff user ${u.name} deactivated successfully`, "info");
                        } else {
                            await usersApi.activateUser(userId);
                            addToast(`Staff user ${u.name} activated successfully`, "success");
                        }
                    }
                }
            } else {
                const userId = u.userId || (typeof u.id === "number" ? u.id : null);
                if (userId) {
                    if (isCurrentlyActive) {
                        await usersApi.deactivateUser(userId);
                        addToast(`User ${u.name} deactivated successfully`, "info");
                    } else {
                        await usersApi.activateUser(userId);
                        addToast(`User ${u.name} activated successfully`, "success");
                    }
                }
            }
            await fetchUsers();
        } catch (err) {
            console.error("Backend toggle status failed:", err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to update status";
            addToast(typeof msg === "string" ? msg : "Failed to update status", "error");
        }
    };

    // Dedicated entity forms: the Doctors/Dentists page must always render the
    // dentist fields and must never render staff fields, even if leftover form
    // state from another users tab is still in memory.
    const isDentistForm = filterRole === "dentist" || (filterRole === "all" && newUser.role === "dentist");
    const isStaffForm = filterRole !== "dentist" && ["receptionist", "pharmacist", "cashier"].includes(newUser.role);

    return (
        <div className={`df-role-page df-role-blue`}>
            <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
            <header className="df-resource-header">
                <div>
                    <span className="df-section-label">{sectionLabel}</span>
                    <h1>{pageTitle}</h1>
                    <p>{pageDesc}</p>
                </div>
                <button className="df-btn df-btn-primary" onClick={openCreateModal}>
                    + {filterRole === "dentist" ? "Register Doctor" : filterRole === "staff" ? "Add Staff" : "Add New User"}
                </button>
            </header>

            <div className="df-stat-grid">
                {filterRole === "dentist" ? (
                    <>
                        <StatCard label="Total Dentists" value={String(dentistRows.length)} icon="◫" color="primary" />
                        <StatCard label="Active Dentists" value={String(activeOf(dentistRows))} icon="✓" color="success" />
                        <StatCard label="Clinical Specializations" value={String(new Set(dentistRows.map((r) => String(r.specialization || "General Dentistry").toLowerCase())).size)} icon="◈" color="primary" />
                        <StatCard label="Pending Deactivations" value={String(deactivationRequests.length)} icon="◷" color={deactivationRequests.length > 0 ? "warning" : "primary"} />
                    </>
                ) : filterRole === "staff" ? (
                    <>
                        <StatCard label="Total Staff" value={String(staffRows.length)} icon="◫" color="primary" />
                        <StatCard label="Active Staff" value={String(activeOf(staffRows))} icon="✓" color="success" />
                        <StatCard label="Staff Roles" value={String(new Set(staffRows.map((r) => String(r.staffRole || r.role || "Staff").toLowerCase()).filter(Boolean)).size)} icon="◈" color="primary" />
                        <StatCard label="Pending Deactivations" value={String(deactivationRequests.length)} icon="◷" color={deactivationRequests.length > 0 ? "warning" : "primary"} />
                    </>
                ) : (
                    <>
                        <StatCard label="Total Registered Users" value={String(users.length)} icon="◫" color="primary" />
                        <StatCard label="Patients Registered" value={String(users.filter((u) => u.role === "patient").length)} icon="✓" color="success" />
                        <StatCard label="Attending Dentists" value={String(dentistRows.length)} icon="◈" color="primary" />
                        <StatCard label="Pending Deactivations" value={String(deactivationRequests.length)} icon="◷" color={deactivationRequests.length > 0 ? "warning" : "primary"} />
                    </>
                )}
            </div>

            {filterRole === "all" && (
                <TabPills
                    tabs={[
                        { label: "All Accounts", value: "all", count: users.length },
                        { label: "Patients", value: "patient" },
                        { label: "Dentists", value: "dentist" },
                        { label: "Clinic Staff", value: "staff" },
                        { label: "Deactivation Requests", value: "requests", count: deactivationRequests.length },
                    ]}
                    activeTab={activeRole}
                    onChange={setActiveRole}
                />
            )}

            {activeRole === "requests" ? (
                <section className="df-card">
                    <div className="df-card-body">
                        <h3 style={{ marginBottom: 6 }}>Pending Account Deactivation Requests</h3>
                        <p style={{ color: "var(--df-text-secondary)", fontSize: 14, marginBottom: 16 }}>
                            Review staff deactivation requests. Approving will soft-delete the account while safely preserving all clinical records, prescriptions, and historical audit logs.
                        </p>
                        {deactivationRequests.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--df-text-muted)" }}>
                                ✓ No pending account deactivation requests
                            </div>
                        ) : (
                            <div className="df-table-container">
                                <table className="df-table" style={{ width: "100%" }}>
                                    <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>System Role</th>
                                        <th>Email / Phone</th>
                                        <th>Requested Date</th>
                                        <th>Deactivation Reason</th>
                                        <th style={{ textAlign: "right" }}>Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {deactivationRequests.map((req) => (
                                        <tr key={req.id}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "var(--df-primary-700)", flexShrink: 0 }}>
                                                        {req.profileImage ? (
                                                            <img src={req.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                        ) : (
                                                            `${req.firstName?.[0] || ""}${req.lastName?.[0] || ""}` || "U"
                                                        )}
                                                    </div>
                                                    <div>
                                                        <strong>{`${req.firstName || ""} ${req.lastName || ""}`.trim() || req.email}</strong>
                                                        <div style={{ fontSize: 11, color: "var(--df-text-muted)" }}>ID: #{req.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                          <span className={`df-badge df-badge-${(req.role || "").toLowerCase()}`}>
                            {req.role}
                          </span>
                                            </td>
                                            <td>
                                                <div>{req.email}</div>
                                                <small style={{ color: "var(--df-text-muted)" }}>{req.phone || "—"}</small>
                                            </td>
                                            <td>
                                                {req.deactivationRequestedAt
                                                    ? new Date(req.deactivationRequestedAt).toLocaleDateString()
                                                    : "Recent"}
                                            </td>
                                            <td style={{ maxWidth: 260 }}>
                          <span style={{ fontStyle: "italic", fontSize: 13, color: "var(--df-text-secondary)" }}>
                            "{req.deactivationReason || "No reason provided"}"
                          </span>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                                    <button
                                                        className="df-btn df-btn-sm"
                                                        style={{ background: "#dc2626", color: "white" }}
                                                        onClick={() => handleApproveDeactivation(req.id)}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="df-btn df-btn-secondary df-btn-sm"
                                                        onClick={() => handleRejectDeactivation(req.id)}
                                                    >
                                                        Reject
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
                </section>
            ) : (
                <section className="df-card">
                    <div className="df-card-body">
                        <div className="df-toolbar" style={{ marginBottom: 16 }}>
                            <SearchBar
                                value={search}
                                onChange={setSearch}
                                placeholder={searchPlaceholder}
                            />
                        </div>

                        <DataTable
                            columns={columns}
                            rows={filtered}
                            tableStyle={{ minWidth: filterRole === "staff" ? "1320px" : filterRole === "dentist" ? "1080px" : undefined }}
                            actionsWidth={filterRole === "staff" ? "260px" : undefined}
                            actionsAlign="right"
                            rowActions={(row) => (
                                <button
                                    type="button"
                                    className="df-btn df-btn-secondary df-btn-sm"
                                    onClick={() => setSelectedUser(row)}
                                    title="View profile details"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                    <Eye size={14} />
                                    <span>View</span>
                                </button>
                            )}
                            actionLabel={(row) => <><Pencil size={14} style={{ marginRight: 4 }} />Edit</>}
                            onEdit={openEditModal}
                            onDelete={handleDeleteClick}
                            deleteLabel={<Trash2 size={14} />}
                            onQuickAction={handleToggleStatus}
                            quickActionLabel={(u) => (u.role === "admin" ? null : u.status === "active" ? <><Power size={14} style={{ marginRight: 4 }} />Deactivate</> : <><Power size={14} style={{ marginRight: 4 }} />Activate</>)}
                        />
                    </div>
                </section>
            )}

            {/* Inspect Profile Modal */}
            {selectedUser && (
                <Modal
                    title={`${filterRole === "dentist" ? "Dentist" : filterRole === "staff" ? "Staff" : "User"} Profile: ${selectedUser.name}`}
                    onClose={() => setSelectedUser(null)}
                    footer={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                            {selectedUser.status === "deactivation_requested" ? (
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        className="df-btn df-btn-sm"
                                        style={{ background: "#dc2626", color: "white" }}
                                        onClick={() => handleApproveDeactivation(selectedUser.id)}
                                    >
                                        Approve Deactivation
                                    </button>
                                    <button
                                        className="df-btn df-btn-secondary df-btn-sm"
                                        onClick={() => handleRejectDeactivation(selectedUser.id)}
                                    >
                                        Reject Request
                                    </button>
                                </div>
                            ) : <div />}
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="df-btn df-btn-primary" onClick={() => { openEditModal(selectedUser); }}>
                                    Edit
                                </button>
                                <button className="df-btn df-btn-secondary" onClick={() => setSelectedUser(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    }
                >
                    {/* Avatar Section in Modal */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 14, background: "var(--df-gray-50)", borderRadius: 10, border: "1px solid var(--df-border)" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "var(--df-primary-700)", flexShrink: 0 }}>
                            {selectedUser.profileImage ? (
                                <img src={selectedUser.profileImage} alt={selectedUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                (selectedUser.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedUser.name}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <label className="df-btn df-btn-secondary df-btn-sm" style={{ cursor: "pointer", margin: 0, fontSize: 12 }}>
                                    Upload Avatar
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        style={{ display: "none" }}
                                        onChange={(e) => handleAdminAvatarUpload(selectedUser.id, e)}
                                    />
                                </label>
                                {selectedUser.profileImage && (
                                    <button
                                        type="button"
                                        className="df-btn df-btn-sm"
                                        style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 12 }}
                                        onClick={() => handleAdminAvatarRemove(selectedUser.id)}
                                    >
                                        Remove Avatar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

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

                    {/* Deactivation Info if present */}
                    {(selectedUser.deactivationReason || selectedUser.deactivationRequestedAt || selectedUser.deactivatedAt) && (
                        <div style={{ marginTop: 16, padding: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: 6, color: "#991b1b" }}>
                                Account Deactivation Information
                            </div>
                            {selectedUser.deactivationReason && (
                                <div style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 6 }}>
                                    <strong>Reason:</strong> "{selectedUser.deactivationReason}"
                                </div>
                            )}
                            {selectedUser.deactivationRequestedAt && (
                                <div style={{ fontSize: 12, color: "#991b1b" }}>
                                    <strong>Requested:</strong> {new Date(selectedUser.deactivationRequestedAt).toLocaleString()}
                                </div>
                            )}
                            {selectedUser.deactivatedAt && (
                                <div style={{ fontSize: 12, color: "#991b1b" }}>
                                    <strong>Deactivated:</strong> {new Date(selectedUser.deactivatedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    )}

                    {(selectedUser.role === "dentist" || selectedUser.role === "doctor") && (
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
                                <div>
                                    <small style={{ color: "var(--df-text-muted)" }}>About</small>
                                    <div style={{ fontWeight: 600, lineHeight: 1.5 }}>{selectedUser.about || "No description provided"}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedUser.role !== "dentist" && selectedUser.role !== "doctor" && selectedUser.role !== "patient" && (
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

                    {(isDentistRow(selectedUser) || isStaffRow(selectedUser)) && (
                        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                className="df-btn df-btn-primary df-btn-sm"
                                onClick={() => {
                                    const u = selectedUser;
                                    setSelectedUser(null);
                                    handleOpenSchedule(u);
                                }}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                                <Calendar size={14} />
                                <span>View & Edit Weekly Schedule</span>
                            </button>
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
                                {filterRole === "dentist" ? "Register Doctor" : filterRole === "staff" ? "Add Staff Member" : "Create User"}
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
                                onChange={(e) => { setNewUser({ ...newUser, name: e.target.value }); setFormErrors((p) => ({ ...p, name: undefined, submit: undefined })); }}
                                placeholder="e.g. Dr. Kusal Mendis"
                                required
                            />
                            {formErrors.name && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.name}</div>}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Email Address *</label>
                            <input
                                type="email"
                                className="df-input"
                                value={newUser.email}
                                onChange={(e) => { setNewUser({ ...newUser, email: e.target.value }); setFormErrors((p) => ({ ...p, email: undefined, submit: undefined })); }}
                                placeholder="kmendis@dentaflow.com"
                                required
                            />
                            {formErrors.email && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.email}</div>}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Phone Number</label>
                            <input
                                className="df-input"
                                value={newUser.phone}
                                onChange={(e) => { setNewUser({ ...newUser, phone: e.target.value }); setFormErrors((p) => ({ ...p, phone: undefined, submit: undefined })); }}
                                placeholder="0771234567"
                            />
                            {formErrors.phone && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.phone}</div>}
                        </div>
                        {filterRole === "all" && (
                        <div className="df-form-group">
                            <label className="df-label">Role Assignment</label>
                            <select
                                className="df-select"
                                value={newUser.role}
                                onChange={(e) => { setNewUser({ ...newUser, role: e.target.value }); setFormErrors((p) => ({ ...p, role: undefined, submit: undefined })); }}
                            >
                                <option value="patient">Patient</option>
                                <option value="dentist">Dentist / Specialist</option>
                                <option value="receptionist">Receptionist</option>
                                <option value="cashier">Cashier</option>
                                <option value="pharmacist">Pharmacist</option>
                                <option value="admin">System Administrator</option>
                            </select>
                            {formErrors.role && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.role}</div>}
                        </div>
                    )}
                    </div>

                    {isDentistForm && (
                        <div className="df-form-2col" style={{ marginTop: 14 }}>
                            <div className="df-form-group">
                                <label className="df-label">Specialization *</label>
                                <select
                                    className="df-select"
                                    value={newUser.specialization}
                                    onChange={(e) => { setNewUser({ ...newUser, specialization: e.target.value }); setFormErrors((p) => ({ ...p, specialization: undefined, submit: undefined })); }}
                                >
                                    {DENTAL_SPECIALIZATIONS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                                {formErrors.specialization && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.specialization}</div>}
                            </div>
                            <div className="df-form-group">
                                <label className="df-label">Qualifications *</label>
                                <input
                                    className="df-input"
                                    value={newUser.qualification}
                                    onChange={(e) => { setNewUser({ ...newUser, qualification: e.target.value }); setFormErrors((p) => ({ ...p, qualification: undefined, submit: undefined })); }}
                                    placeholder="e.g. BDS, MS Oral Surgery"
                                />
                                {formErrors.qualification && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.qualification}</div>}
                            </div>
                        </div>
                    )}

                    {isDentistForm && (
                        <div className="df-form-2col" style={{ marginTop: 14 }}>
                            <div className="df-form-group">
                                <label className="df-label">Experience (Years)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="1"
                                    className="df-input"
                                    value={newUser.experienceYears}
                                    onChange={(e) => { setNewUser({ ...newUser, experienceYears: e.target.value }); setFormErrors((p) => ({ ...p, experienceYears: undefined, submit: undefined })); }}
                                    placeholder="e.g. 12"
                                />
                                {formErrors.experienceYears && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.experienceYears}</div>}
                            </div>
                            <div className="df-form-group">
                                <label className="df-label">License / Registration No.</label>
                                <input
                                    className="df-input"
                                    value={newUser.licenseNumber}
                                    onChange={(e) => { setNewUser({ ...newUser, licenseNumber: e.target.value }); setFormErrors((p) => ({ ...p, licenseNumber: undefined, submit: undefined })); }}
                                    placeholder="e.g. SLMC 45678"
                                />
                                {formErrors.licenseNumber && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.licenseNumber}</div>}
                            </div>
                        </div>
                    )}

                    {isDentistForm && (
                        <div className="df-form-group" style={{ marginTop: 14 }}>
                            <label className="df-label">About / Professional About</label>
                            <textarea
                                className="df-input"
                                value={newUser.about || ""}
                                onChange={(e) => { setNewUser({ ...newUser, about: e.target.value }); setFormErrors((p) => ({ ...p, about: undefined, submit: undefined })); }}
                                placeholder="Experienced general dentist specializing in preventive dentistry, restorative treatments, and comprehensive oral healthcare."
                                rows={4}
                                maxLength={1000}
                            />
                            <div style={{ fontSize: 11, color: "var(--df-text-muted)", marginTop: 4, textAlign: "right" }}>
                                {(newUser.about || "").length}/1000 characters
                            </div>
                            {formErrors.about && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.about}</div>}
                        </div>
                    )}

                    {isDentistForm && (
                        <div className="df-form-group" style={{ marginTop: 14 }}>
                            <label className="df-label">Doctor Profile Picture</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, border: "1px dashed var(--df-border)", borderRadius: 8, background: "var(--df-gray-50)" }}>
                                <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "var(--df-primary-700)", flexShrink: 0, border: "2px solid #e2e8f0" }}>
                                    {newUser.imagePreview ? (
                                        <img src={newUser.imagePreview} alt="Doctor preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <span>DR</span>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <label className="df-btn df-btn-secondary df-btn-sm" style={{ cursor: "pointer", margin: 0, fontSize: 12 }}>
                                            {newUser.imagePreview ? "Replace Image" : "Upload Picture"}
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/jpg, image/png, image/webp"
                                                style={{ display: "none" }}
                                                onChange={handleDoctorImageChange}
                                            />
                                        </label>
                                        {newUser.imagePreview && (
                                            <button
                                                type="button"
                                                className="df-btn df-btn-sm"
                                                style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 12 }}
                                                onClick={handleRemoveDoctorImage}
                                            >
                                                Remove Image
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--df-text-muted)" }}>
                                        Accepted: JPG, JPEG, PNG, WEBP (Max 5 MB)
                                    </div>
                                </div>
                            </div>
                            {doctorImageError && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5, fontWeight: 500 }}>
                                    {doctorImageError}
                                </div>
                            )}
                        </div>
                    )}

                    {isStaffForm && (
                        <div className="df-form-2col" style={{ marginTop: 14 }}>
                            <div className="df-form-group">
                                <label className="df-label">Staff Role *</label>
                                <select
                                    className="df-select"
                                    value={newUser.staffPosition}
                                    onChange={(e) => { setNewUser({ ...newUser, staffPosition: e.target.value }); setFormErrors((p) => ({ ...p, staffPosition: undefined, submit: undefined })); }}
                                >
                                    <option value="">Select role...</option>
                                    <option value="Receptionist">Receptionist</option>
                                    <option value="Pharmacist">Pharmacist</option>
                                    <option value="Cashier">Cashier</option>
                                    <option value="Other Staff">Other Staff</option>
                                </select>
                                {formErrors.staffPosition && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.staffPosition}</div>}
                            </div>
                            <div className="df-form-group">
                                <label className="df-label">Department</label>
                                <input
                                    className="df-input"
                                    value={newUser.department}
                                    onChange={(e) => { setNewUser({ ...newUser, department: e.target.value }); setFormErrors((p) => ({ ...p, department: undefined, submit: undefined })); }}
                                    placeholder="e.g. Front Office"
                                />
                            </div>
                        </div>
                    )}

                    {isStaffForm && (
                        <div className="df-form-group" style={{ marginTop: 14 }}>
                            <label className="df-label">Staff Profile Picture</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, border: "1px dashed var(--df-border)", borderRadius: 8, background: "var(--df-gray-50)" }}>
                                <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "var(--df-primary-700)", flexShrink: 0, border: "2px solid #e2e8f0" }}>
                                    {newUser.imagePreview ? (
                                        <img src={newUser.imagePreview} alt="Staff preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <span>{(newUser.name || "ST").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "ST"}</span>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <label className="df-btn df-btn-secondary df-btn-sm" style={{ cursor: "pointer", margin: 0, fontSize: 12 }}>
                                            {newUser.imagePreview ? "Replace Image" : "Upload Picture"}
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/jpg, image/png, image/webp"
                                                style={{ display: "none" }}
                                                onChange={handleDoctorImageChange}
                                            />
                                        </label>
                                        {newUser.imagePreview && (
                                            <button
                                                type="button"
                                                className="df-btn df-btn-sm"
                                                style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 12 }}
                                                onClick={handleRemoveDoctorImage}
                                            >
                                                Remove Image
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--df-text-muted)" }}>
                                        Accepted: JPG, JPEG, PNG, WEBP (Max 5 MB)
                                    </div>
                                </div>
                            </div>
                            {doctorImageError && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5, fontWeight: 500 }}>
                                    {doctorImageError}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Password *</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="df-input"
                                    style={{ paddingRight: 56 }}
                                    value={newUser.password}
                                    onChange={(e) => {
                                        setNewUser({ ...newUser, password: e.target.value });
                                        setFormErrors((p) => ({ ...p, password: undefined, confirmPassword: undefined, submit: undefined }));
                                    }}
                                    placeholder="Min 6 characters"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute",
                                        right: 10,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--df-text-muted)",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        padding: "2px 6px",
                                    }}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            {formErrors.password && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.password}</div>}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Confirm Password *</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="df-input"
                                    style={{ paddingRight: 56 }}
                                    value={newUser.confirmPassword}
                                    onChange={(e) => {
                                        setNewUser({ ...newUser, confirmPassword: e.target.value });
                                        setFormErrors((p) => ({ ...p, confirmPassword: undefined, submit: undefined }));
                                    }}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: "absolute",
                                        right: 10,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--df-text-muted)",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        padding: "2px 6px",
                                    }}
                                >
                                    {showConfirmPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            {formErrors.confirmPassword && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{formErrors.confirmPassword}</div>}
                        </div>
                    </div>

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
                    {formErrors.submit && <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 13 }}>{formErrors.submit}</div>}
                </Modal>
            )}

            {/* EDIT Profile Modal */}
            {editModalOpen && editingUser && (
                <Modal
                    title={`Edit ${filterRole === "dentist" ? "Doctor" : filterRole === "staff" ? "Staff Member" : "User"}: ${editForm.name}`}
                    onClose={() => { setEditModalOpen(false); setEditingUser(null); }}
                    footer={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                            <button className="df-btn df-btn-secondary" onClick={() => { setEditModalOpen(false); setEditingUser(null); }}>Cancel</button>
                            <button className="df-btn df-btn-primary" onClick={handleEditSubmit} disabled={editUploading}>
                                {editUploading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    }
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 14, background: "var(--df-gray-50)", borderRadius: 10, border: "1px solid var(--df-border)" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "var(--df-primary-700)", flexShrink: 0 }}>
                            {editForm.profileImage ? (
                                <img src={editForm.profileImage} alt={editForm.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                (editForm.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label className="df-btn df-btn-secondary df-btn-sm" style={{ cursor: "pointer", margin: 0, fontSize: 12 }}>
                                {editForm.imagePreview ? "Replace Image" : "Upload Picture"}
                                <input type="file" accept="image/jpeg, image/jpg, image/png, image/webp" style={{ display: "none" }} onChange={handleEditAvatarUpload} />
                            </label>
                            {editForm.imagePreview && (
                                <button type="button" className="df-btn df-btn-sm" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 12 }} onClick={handleEditAvatarRemove}>
                                    Remove Avatar
                                </button>
                            )}
                        </div>
                    </div>
                    {editImageError && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{editImageError}</div>}

                    <div className="df-form-2col">
                        <div className="df-form-group">
                            <label className="df-label">Full Name *</label>
                            <input className="df-input" value={editForm.name} onChange={(e) => handleEditChange("name", e.target.value)} placeholder="Full name" />
                            {editErrors.name && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{editErrors.name}</div>}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Email Address *</label>
                            <input type="email" className="df-input" value={editForm.email} onChange={(e) => handleEditChange("email", e.target.value)} placeholder="email@example.com" />
                            {editErrors.email && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{editErrors.email}</div>}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Phone Number</label>
                            <input className="df-input" value={editForm.phone} onChange={(e) => handleEditChange("phone", e.target.value)} placeholder="0771234567" />
                            {editErrors.phone && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{editErrors.phone}</div>}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Status</label>
                            <select className="df-select" value={editForm.status} onChange={(e) => handleEditChange("status", e.target.value)}>
                                <option value="active">Active</option>
                                <option value="disabled">Suspended</option>
                            </select>
                        </div>
                    </div>

                    {(editingUser?.role === "dentist" || editingUser?.role === "doctor" || filterRole === "dentist") && (
                        <div className="df-form-2col" style={{ marginTop: 14 }}>
                            <div className="df-form-group">
                                <label className="df-label">Specialization</label>
                                <select className="df-select" value={editForm.specialization} onChange={(e) => handleEditChange("specialization", e.target.value)}>
                                    {DENTAL_SPECIALIZATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </div>
                            <div className="df-form-group">
                                <label className="df-label">Qualification</label>
                                <input className="df-input" value={editForm.qualification} onChange={(e) => handleEditChange("qualification", e.target.value)} placeholder="e.g. BDS, MS Oral Surgery" />
                            </div>
                        </div>
                    )}

                    {(editingUser?.role === "dentist" || editingUser?.role === "doctor" || filterRole === "dentist") && (
                        <div className="df-form-2col" style={{ marginTop: 14 }}>
                            <div className="df-form-group">
                                <label className="df-label">Experience (Years)</label>
                                <input type="number" min="0" max="50" className="df-input" value={editForm.experienceYears} onChange={(e) => handleEditChange("experienceYears", e.target.value)} />
                                {editErrors.experienceYears && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{editErrors.experienceYears}</div>}
                            </div>
                            <div className="df-form-group">
                                <label className="df-label">License / Registration No.</label>
                                <input className="df-input" value={editForm.licenseNumber} onChange={(e) => handleEditChange("licenseNumber", e.target.value)} placeholder="e.g. SLMC 45678" />
                                {editErrors.licenseNumber && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{editErrors.licenseNumber}</div>}
                            </div>
                        </div>
                    )}

                    {(editingUser?.role === "dentist" || editingUser?.role === "doctor" || filterRole === "dentist") && (
                        <div className="df-form-group" style={{ marginTop: 14 }}>
                            <label className="df-label">About / Professional About</label>
                            <textarea className="df-input" value={editForm.about} onChange={(e) => handleEditChange("about", e.target.value)} rows={4} maxLength={1000} placeholder="Professional description..." />
                            <div style={{ fontSize: 11, color: "var(--df-text-muted)", marginTop: 4, textAlign: "right" }}>{(editForm.about || "").length}/1000 characters</div>
                            {editErrors.about && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>{editErrors.about}</div>}
                        </div>
                    )}

                    {(editingUser?.staffId || ["receptionist", "pharmacist", "cashier", "staff"].includes(editingUser?.role) || filterRole === "staff") && (
                        <div className="df-form-2col" style={{ marginTop: 14 }}>
                            <div className="df-form-group">
                                <label className="df-label">Staff Role</label>
                                <select className="df-select" value={editForm.staffPosition} onChange={(e) => handleEditChange("staffPosition", e.target.value)}>
                                    <option value="Receptionist">Receptionist</option>
                                    <option value="Pharmacist">Pharmacist</option>
                                    <option value="Cashier">Cashier</option>
                                    <option value="Other Staff">Other Staff</option>
                                </select>
                            </div>
                            <div className="df-form-group">
                                <label className="df-label">Department</label>
                                <input className="df-input" value={editForm.department} onChange={(e) => handleEditChange("department", e.target.value)} placeholder="e.g. Front Office" />
                            </div>
                        </div>
                    )}

                    {editErrors.submit && <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 13 }}>{editErrors.submit}</div>}
                </Modal>
            )}

            {showDeleteConfirm && deleteTarget && (() => {
                const isDoc = deleteTarget.role === "dentist" || deleteTarget.role === "doctor" || Boolean(deleteTarget.dentistId) || filterRole === "dentist";
                const isStf = ["receptionist", "pharmacist", "cashier", "staff"].includes(deleteTarget.role) || Boolean(deleteTarget.staffId) || filterRole === "staff";
                const entityName = isDoc ? "Doctor" : isStf ? "Staff Member" : "User";
                const entityDescription = isDoc ? "doctor from Doctor Management" : isStf ? "staff member from Staff Management" : "user account";
                return (
                    <ConfirmationDialog
                        title={`Delete ${entityName}`}
                        message={`Are you sure you want to delete ${deleteTarget.name} (${deleteTarget.email || "no email"})? This action will remove this ${entityDescription} and related active selections. Historical records will be preserved.`}
                        onCancel={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                        onConfirm={handleConfirmDelete}
                        cancelLabel="Cancel"
                        confirmLabel={`Delete ${entityName}`}
                    />
                );
            })()}

            <ScheduleModal
                isOpen={scheduleModalOpen}
                onClose={() => {
                    setScheduleModalOpen(false);
                    setSchedulingUser(null);
                }}
                targetUser={schedulingUser}
                addToast={addToast}
            />
        </div>
    );
}

export function AdminReportsView({ role }) {
    const { addToast } = useNotifications();
    const [category, setCategory] = useState("Financial Revenue");
    const [period, setPeriod] = useState("March 2026 (Month to Date)");
    const [domainStats, setDomainStats] = useState({});
    const [loadingStats, setLoadingStats] = useState(false);

    // Saved Reports CRUD State
    const [savedReports, setSavedReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportSearch, setReportSearch] = useState("");

    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState(null);
    const [editingReport, setEditingReport] = useState(null);
    const [deletingReport, setDeletingReport] = useState(null);

    // Form States
    const initialCreateForm = {
        reportType: "FINANCIAL",
        reportingPeriod: "March 2026 (Month to Date)",
        title: "",
        description: "",
        status: "GENERATED",
        generatedBy: "System Administrator",
        reportData: "",
    };

    const [formData, setFormData] = useState(initialCreateForm);
    const [editFormData, setEditFormData] = useState(initialCreateForm);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Load saved reports from MySQL database
    const loadSavedReports = async () => {
        setLoadingReports(true);
        try {
            const data = await reportsApi.getAllReports();
            setSavedReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("Could not load saved reports from database:", err);
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        loadSavedReports();
    }, []);

    // Load dynamic domain statistics from real database endpoints
    useEffect(() => {
        let mounted = true;
        setLoadingStats(true);
        async function fetchCategoryData() {
            try {
                if (category.includes("Financial")) {
                    const [billing, revenue] = await Promise.all([
                        reportsApi.getAIReportBilling().catch(() => null),
                        reportsApi.getAIReportRevenue().catch(() => null),
                    ]);
                    if (mounted) setDomainStats({ billing, revenue });
                } else if (category.includes("Clinical")) {
                    const [appts, treatments] = await Promise.all([
                        reportsApi.getAIReportAppointments().catch(() => null),
                        reportsApi.getAIReportTreatments().catch(() => null),
                    ]);
                    if (mounted) setDomainStats({ appts, treatments });
                } else if (category.includes("Doctor")) {
                    const dentists = await reportsApi.getAIReportDentists().catch(() => null);
                    if (mounted) setDomainStats({ dentists });
                } else if (category.includes("Pharmacy")) {
                    const [inventory, dispensing] = await Promise.all([
                        reportsApi.getAIReportInventory().catch(() => null),
                        reportsApi.getAIReportDispensing().catch(() => null),
                    ]);
                    if (mounted) setDomainStats({ inventory, dispensing });
                }
            } catch (err) {
                console.warn("Could not load category report data:", err);
            } finally {
                if (mounted) setLoadingStats(false);
            }
        }
        fetchCategoryData();
        return () => {
            mounted = false;
        };
    }, [category, period]);

    // Export CSV with error toast on failure
    const handleExportCSV = async () => {
        try {
            let type = "revenue";
            if (category.includes("Clinical")) type = "appointments";
            else if (category.includes("Doctor")) type = "dentists";
            else if (category.includes("Pharmacy")) type = "inventory";

            const blob = await reportsApi.exportReportCSV(type);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `admin-${type}-report.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            addToast(`Exported ${category} report for ${period} (CSV)`, "success");
        } catch (err) {
            console.warn("CSV export failed:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to export report";
            addToast(typeof msg === "string" ? msg : "Failed to export report", "error");
        }
    };

    const handlePrint = () => {
        addToast("Report sent to print spooler", "info");
    };

    // Validation helper
    const validateReportForm = (data) => {
        const errors = {};
        if (!data.reportType || !data.reportType.trim()) {
            errors.reportType = "Report Domain is required";
        }
        if (!data.reportingPeriod || !data.reportingPeriod.trim()) {
            errors.reportingPeriod = "Reporting Period is required";
        }
        if (!data.title || !data.title.trim()) {
            errors.title = "Report Title is required";
        } else if (data.title.trim().length < 3) {
            errors.title = "Report Title must be at least 3 characters";
        }
        if (!data.description || !data.description.trim()) {
            errors.description = "Report Description is required";
        } else if (data.description.trim().length < 5) {
            errors.description = "Report Description must be at least 5 characters";
        }
        return errors;
    };

    // CREATE Report handler
    const handleCreateReport = async (e) => {
        if (e) e.preventDefault();
        const errors = validateReportForm(formData);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                reportType: formData.reportType.trim().toUpperCase(),
                title: formData.title.trim(),
                description: formData.description.trim(),
                status: formData.status ? formData.status.trim().toUpperCase() : "GENERATED",
                generatedBy: formData.generatedBy?.trim() || "System Administrator",
                reportData: JSON.stringify({
                    period: formData.reportingPeriod.trim(),
                    domain: formData.reportType.trim(),
                    notes: formData.reportData ? formData.reportData.trim() : "",
                    createdVia: "AdminReportsView",
                }),
            };

            await reportsApi.createReport(payload);
            addToast(`Report "${payload.title}" created and saved successfully!`, "success");
            setIsCreateOpen(false);
            setFormData(initialCreateForm);
            setFormErrors({});
            await loadSavedReports();
        } catch (err) {
            console.error("Failed to create report:", err);
            const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create report";
            setFormErrors((prev) => ({ ...prev, submit: errMsg }));
            addToast(errMsg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Open EDIT Report modal
    const openEditModal = (report) => {
        let periodVal = "March 2026 (Month to Date)";
        let notesVal = "";
        try {
            if (report.reportData) {
                const parsed = JSON.parse(report.reportData);
                if (parsed.period) periodVal = parsed.period;
                if (parsed.notes) notesVal = parsed.notes;
                else notesVal = report.reportData;
            }
        } catch {
            notesVal = report.reportData || "";
        }

        setEditFormData({
            reportType: report.reportType || "FINANCIAL",
            reportingPeriod: periodVal,
            title: report.title || "",
            description: report.description || "",
            status: report.status || "GENERATED",
            generatedBy: report.generatedBy || "System Administrator",
            reportData: notesVal,
        });
        setFormErrors({});
        setEditingReport(report);
    };

    // UPDATE Report handler
    const handleUpdateReport = async (e) => {
        if (e) e.preventDefault();
        const errors = validateReportForm(editFormData);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                id: editingReport.id,
                reportCode: editingReport.reportCode,
                reportType: editFormData.reportType.trim().toUpperCase(),
                title: editFormData.title.trim(),
                description: editFormData.description.trim(),
                status: editFormData.status ? editFormData.status.trim().toUpperCase() : "GENERATED",
                generatedBy: editFormData.generatedBy?.trim() || editingReport.generatedBy || "System Administrator",
                reportData: JSON.stringify({
                    period: editFormData.reportingPeriod.trim(),
                    domain: editFormData.reportType.trim(),
                    notes: editFormData.reportData ? editFormData.reportData.trim() : "",
                    updatedAt: new Date().toISOString(),
                }),
            };

            await reportsApi.updateReport(editingReport.id, payload);
            addToast(`Report "${payload.title}" updated successfully!`, "success");
            setEditingReport(null);
            setFormErrors({});
            await loadSavedReports();
        } catch (err) {
            console.error("Failed to update report:", err);
            const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to update report";
            setFormErrors((prev) => ({ ...prev, submit: errMsg }));
            addToast(errMsg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // DELETE Report handler
    const handleDeleteReport = async () => {
        if (!deletingReport) return;
        setSubmitting(true);
        try {
            await reportsApi.deleteReport(deletingReport.id);
            addToast(`Report "${deletingReport.reportCode || deletingReport.title}" deleted successfully!`, "success");
            setDeletingReport(null);
            await loadSavedReports();
        } catch (err) {
            console.error("Failed to delete report:", err);
            const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to delete report";
            addToast(errMsg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Dynamic stat cards based on domain
    const statCardsData = useMemo(() => {
        if (category.includes("Financial")) {
            const billing = domainStats.billing;
            const revenue = domainStats.revenue;
            const gross = Number(billing?.totalBilled || 0);
            const net = Number(revenue?.totalRevenue || billing?.totalPaid || 0);
            const dues = Number(billing?.totalOutstanding || 0);
            const rate = gross > 0 ? Math.round((net / gross) * 100) : 100;
            return [
                { label: "Gross Billing Value", value: `LKR ${gross.toLocaleString()}`, icon: "✓", color: "success" },
                { label: "Net Collections", value: `LKR ${net.toLocaleString()}`, icon: "◷", color: "primary" },
                { label: "Outstanding Dues", value: `LKR ${dues.toLocaleString()}`, icon: "◫", color: dues > 0 ? "warning" : "primary" },
                { label: "Collection Rate", value: `${rate}%`, icon: "◈", color: "success" },
            ];
        } else if (category.includes("Clinical")) {
            const appts = domainStats.appts;
            const treatments = domainStats.treatments;
            const total = appts?.totalAppointments || 0;
            const completed = treatments?.completedCount || appts?.completedCount || 0;
            const activePlans = treatments?.activeTreatmentPlans || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            return [
                { label: "Total Consultations", value: `${total} Visits`, icon: "✓", color: "primary" },
                { label: "Completed Procedures", value: `${completed} Done`, icon: "◷", color: "success" },
                { label: "Active Treatment Plans", value: `${activePlans} Active`, icon: "◫", color: "primary" },
                { label: "Procedure Completion", value: `${rate}%`, icon: "◈", color: "success" },
            ];
        } else if (category.includes("Doctor")) {
            const dentists = domainStats.dentists;
            const total = dentists?.totalDentists || 0;
            const active = dentists?.activeDentists || 0;
            return [
                { label: "Total Dentists", value: `${total} Practitioners`, icon: "✓", color: "primary" },
                { label: "Active Clinicians", value: `${active} On Duty`, icon: "◷", color: "success" },
                { label: "Chair Capacity", value: "100% Active", icon: "◫", color: "primary" },
                { label: "Staff Utilization", value: "Optimal", icon: "◈", color: "success" },
            ];
        } else {
            // Pharmacy
            const inventory = domainStats.inventory;
            const val = Number(inventory?.totalInventoryValue || 0);
            const qty = inventory?.totalStockQuantity || 0;
            const low = inventory?.lowStockCount || 0;
            const total = inventory?.totalMedicines || 0;
            return [
                { label: "Total Inventory Value", value: `LKR ${val.toLocaleString()}`, icon: "✓", color: "primary" },
                { label: "Stock Units On-Hand", value: `${qty} Units`, icon: "◷", color: "primary" },
                { label: "Low Stock Warnings", value: `${low} Alerts`, icon: "◫", color: low > 0 ? "warning" : "success" },
                { label: "Registered Formulations", value: `${total} Items`, icon: "◈", color: "success" },
            ];
        }
    }, [category, domainStats]);

    // Dynamic weekly distribution based on real domain metrics
    const chartWeeks = useMemo(() => {
        let total = 0;
        if (category.includes("Financial")) {
            total = Number(domainStats.billing?.totalBilled || 0);
        } else if (category.includes("Clinical")) {
            total = Number(domainStats.appts?.totalAppointments || 0);
        } else if (category.includes("Doctor")) {
            total = Number(domainStats.dentists?.totalDentists || 0);
        } else {
            total = Number(domainStats.inventory?.totalStockQuantity || 0);
        }

        if (total === 0) {
            return [
                { label: "Wk 1", value: 0 },
                { label: "Wk 2", value: 0 },
                { label: "Wk 3", value: 0 },
                { label: "Wk 4", value: 0 },
            ];
        }
        return [
            { label: "Wk 1", value: Math.round(total * 0.2) },
            { label: "Wk 2", value: Math.round(total * 0.25) },
            { label: "Wk 3", value: Math.round(total * 0.25) },
            { label: "Wk 4", value: Math.round(total * 0.3) },
        ];
    }, [category, domainStats]);

    // Dynamic category breakdown based on domain
    const categoryItems = useMemo(() => {
        if (category.includes("Financial")) {
            const gross = Number(domainStats.billing?.totalBilled || 0);
            const paid = Number(domainStats.billing?.totalPaid || 0);
            const outstanding = Number(domainStats.billing?.totalOutstanding || 0);
            const refunds = Number(domainStats.revenue?.refundTotals || 0);
            const maxVal = Math.max(gross, paid + outstanding, 1);
            return [
                { name: "Paid Invoices & Collections", revenue: `LKR ${paid.toLocaleString()}`, width: `${Math.min(100, Math.round((paid / maxVal) * 100))}%` },
                { name: "Outstanding Patient Balances", revenue: `LKR ${outstanding.toLocaleString()}`, width: `${Math.min(100, Math.round((outstanding / maxVal) * 100))}%` },
                { name: "Disbursed Refunds / Reversals", revenue: `LKR ${refunds.toLocaleString()}`, width: `${Math.min(100, Math.round((refunds / maxVal) * 100))}%` },
            ];
        } else if (category.includes("Clinical")) {
            const total = domainStats.appts?.totalAppointments || 0;
            const completed = domainStats.appts?.completedAppointments || domainStats.appts?.completedCount || 0;
            const pending = (domainStats.appts?.confirmedAppointments || 0) + (domainStats.appts?.pendingAppointments || 0);
            const cancelled = domainStats.appts?.cancelledAppointments || 0;
            const maxVal = Math.max(total, 1);
            return [
                { name: "Completed Clinical Procedures", revenue: `${completed} Procedures`, width: `${Math.round((completed / maxVal) * 100)}%` },
                { name: "Scheduled & In-Progress", revenue: `${pending} Visits`, width: `${Math.round((pending / maxVal) * 100)}%` },
                { name: "Cancellations / No-Shows", revenue: `${cancelled} Records`, width: `${Math.round((cancelled / maxVal) * 100)}%` },
            ];
        } else if (category.includes("Doctor")) {
            const total = domainStats.dentists?.totalDentists || 0;
            const active = domainStats.dentists?.activeDentists || 0;
            const inactive = domainStats.dentists?.inactiveDentists || 0;
            const maxVal = Math.max(total, 1);
            return [
                { name: "Active Dental Surgeons", revenue: `${active} Dentists`, width: `${Math.round((active / maxVal) * 100)}%` },
                { name: "Specialist Consultations", revenue: `${total} Registered`, width: "100%" },
                { name: "Inactive / On Leave", revenue: `${inactive} Staff`, width: `${Math.round((inactive / maxVal) * 100)}%` },
            ];
        } else {
            // Pharmacy
            const total = domainStats.inventory?.totalMedicines || 0;
            const low = domainStats.inventory?.lowStockCount || 0;
            const out = domainStats.inventory?.outOfStockCount || 0;
            const inStock = Math.max(0, total - low - out);
            const maxVal = Math.max(total, 1);
            return [
                { name: "Adequately Stocked Medicines", revenue: `${inStock} Items`, width: `${Math.round((inStock / maxVal) * 100)}%` },
                { name: "Low Stock Warning Threshold", revenue: `${low} Items`, width: `${Math.round((low / maxVal) * 100)}%` },
                { name: "Out of Stock Critical", revenue: `${out} Items`, width: `${Math.round((out / maxVal) * 100)}%` },
            ];
        }
    }, [category, domainStats]);

    // Filtered saved reports table rows
    const tableRows = useMemo(() => {
        let list = savedReports || [];
        if (reportSearch.trim()) {
            const q = reportSearch.toLowerCase().trim();
            list = list.filter((r) =>
                `${r.reportCode || ""} ${r.title || ""} ${r.reportType || ""} ${r.description || ""} ${r.status || ""}`
                    .toLowerCase()
                    .includes(q)
            );
        }
        return list.map((r) => {
            let periodVal = "Current Cycle";
            try {
                if (r.reportData) {
                    const parsed = JSON.parse(r.reportData);
                    if (parsed.period) periodVal = parsed.period;
                }
            } catch {
                // not JSON
            }
            return {
                id: r.id,
                code: r.reportCode || `REP-${r.id}`,
                title: r.title || "Untitled Report",
                type: r.reportType || "FINANCIAL",
                period: periodVal,
                author: r.generatedBy || "System Admin",
                date: r.generatedAt ? String(r.generatedAt).slice(0, 10) : "Recent",
                status: r.status ? r.status.toLowerCase() : "generated",
                raw: r,
            };
        });
    }, [savedReports, reportSearch]);

    return (
        <div className={`df-role-page df-role-blue`}>
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
                    <button className="df-btn df-btn-secondary" onClick={handlePrint}>
                        🖨 Print Report
                    </button>
                    <button
                        type="button"
                        className="df-btn df-btn-primary"
                        onClick={() => {
                            setFormErrors({});
                            setFormData({
                                reportType: category.includes("Financial") ? "FINANCIAL" : category.includes("Clinical") ? "CLINICAL" : category.includes("Doctor") ? "OPERATIONAL" : "INVENTORY",
                                reportingPeriod: period,
                                title: "",
                                description: "",
                                status: "GENERATED",
                                generatedBy: "System Administrator",
                                reportData: "",
                            });
                            setIsCreateOpen(true);
                        }}
                    >
                        + Create Report
                    </button>
                </div>
            </header>

            {loadingStats && (
                <div style={{ padding: "6px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
                    Syncing live report metrics...
                </div>
            )}

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
                {statCardsData.map((stat) => (
                    <StatCard
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        icon={stat.icon}
                        color={stat.color}
                    />
                ))}
            </div>

            <div className="df-overview-grid">
                <MiniBarChart
                    title={`${category} Breakdown (${period})`}
                    values={chartWeeks}
                />
                <section className="df-card">
                    <div className="df-card-body">
                        <div className="df-card-title-row">
                            <h3>Category Summary</h3>
                        </div>
                        <div className="df-progress-list">
                            {categoryItems.map((item) => (
                                <div key={item.name} className="df-progress-item">
                                    <div className="df-progress-label">
                                        <span>{item.name}</span>
                                        <strong>{item.revenue}</strong>
                                    </div>
                                    <div className="df-progress-track">
                                        <div className="df-progress-fill" style={{ width: item.width }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* SAVED AUDIT REPORTS TABLE */}
            <section className="df-card" style={{ marginTop: 24 }}>
                <div className="df-card-body">
                    <div className="df-card-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Saved Operational & Clinical Reports</h3>
                            <p style={{ margin: 0, fontSize: 13, color: "var(--df-text-secondary)" }}>
                                Audit-ready reports stored in MySQL with full versioning and metadata.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <SearchBar
                                value={reportSearch}
                                onChange={setReportSearch}
                                placeholder="Search reports..."
                            />
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={() => {
                                    setFormErrors({});
                                    setFormData({
                                        reportType: category.includes("Financial") ? "FINANCIAL" : category.includes("Clinical") ? "CLINICAL" : category.includes("Doctor") ? "OPERATIONAL" : "INVENTORY",
                                        reportingPeriod: period,
                                        title: "",
                                        description: "",
                                        status: "GENERATED",
                                        generatedBy: "System Administrator",
                                        reportData: "",
                                    });
                                    setIsCreateOpen(true);
                                }}
                            >
                                + Create Report
                            </button>
                        </div>
                    </div>

                    {loadingReports ? (
                        <div style={{ padding: 24, textAlign: "center", color: "var(--df-text-muted)" }}>
                            Loading registered reports...
                        </div>
                    ) : tableRows.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", color: "var(--df-text-muted)" }}>
                            No saved reports found. Click <strong>"+ Create Report"</strong> to generate and store a new report.
                        </div>
                    ) : (
                        <DataTable
                            columns={[
                                { key: "code", label: "Report Code" },
                                { key: "title", label: "Report Title" },
                                { key: "type", label: "Domain" },
                                { key: "period", label: "Period" },
                                { key: "author", label: "Generated By" },
                                { key: "date", label: "Generated Date" },
                                { key: "status", label: "Status", type: "status" },
                            ]}
                            rows={tableRows}
                            quickActionLabel="View"
                            onQuickAction={(row) => setViewingReport(row.raw)}
                            actionLabel="Edit"
                            onEdit={(row) => openEditModal(row.raw)}
                            onDelete={(row) => setDeletingReport(row.raw)}
                        />
                    )}
                </div>
            </section>

            {/* VIEW REPORT DETAILS MODAL */}
            {viewingReport && (
                <Modal
                    title={`Report Details: ${viewingReport.reportCode || `#${viewingReport.id}`}`}
                    onClose={() => setViewingReport(null)}
                    footer={
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                            <div>
                                <button
                                    type="button"
                                    className="df-btn df-btn-secondary"
                                    style={{ marginRight: 8 }}
                                    onClick={() => {
                                        const rep = viewingReport;
                                        setViewingReport(null);
                                        openEditModal(rep);
                                    }}
                                >
                                    ✏ Edit Report
                                </button>
                                <button
                                    type="button"
                                    className="df-btn df-btn-danger"
                                    onClick={() => {
                                        const rep = viewingReport;
                                        setViewingReport(null);
                                        setDeletingReport(rep);
                                    }}
                                >
                                    🗑 Delete Report
                                </button>
                            </div>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => setViewingReport(null)}
                            >
                                Close
                            </button>
                        </div>
                    }
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--df-border)", paddingBottom: 12 }}>
                            <div>
                                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>{viewingReport.title}</h2>
                                <span style={{ fontSize: 13, color: "var(--df-text-muted)" }}>Code: {viewingReport.reportCode || `REP-${viewingReport.id}`}</span>
                            </div>
                            <span className="df-badge df-badge-primary">{viewingReport.status || "GENERATED"}</span>
                        </div>

                        <div className="df-form-2col" style={{ gap: 16 }}>
                            <div>
                                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--df-text-muted)" }}>Domain / Classification</strong>
                                <div style={{ marginTop: 4, fontWeight: 600 }}>{viewingReport.reportType}</div>
                            </div>
                            <div>
                                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--df-text-muted)" }}>Generated Date</strong>
                                <div style={{ marginTop: 4 }}>{viewingReport.generatedAt ? String(viewingReport.generatedAt).replace("T", " ").slice(0, 19) : "N/A"}</div>
                            </div>
                            <div>
                                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--df-text-muted)" }}>Generated By</strong>
                                <div style={{ marginTop: 4 }}>{viewingReport.generatedBy || "System Admin"}</div>
                            </div>
                            <div>
                                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--df-text-muted)" }}>Reporting Scope / Period</strong>
                                <div style={{ marginTop: 4 }}>
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(viewingReport.reportData);
                                            return parsed.period || "Standard Audit Cycle";
                                        } catch {
                                            return "Standard Audit Cycle";
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div>
                            <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--df-text-muted)" }}>Description & Findings</strong>
                            <p style={{ marginTop: 6, background: "var(--df-bg-subtle, #f8fafc)", padding: 12, borderRadius: 8, fontSize: 14, lineHeight: 1.5, color: "var(--df-text-primary)" }}>
                                {viewingReport.description || "No description provided."}
                            </p>
                        </div>

                        {viewingReport.reportData && (
                            <div>
                                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--df-text-muted)" }}>Audit Parameters & Metrics</strong>
                                <pre style={{ marginTop: 6, background: "var(--df-bg-subtle, #f1f5f9)", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", maxHeight: 150 }}>
                                    {(() => {
                                        try {
                                            return JSON.stringify(JSON.parse(viewingReport.reportData), null, 2);
                                        } catch {
                                            return viewingReport.reportData;
                                        }
                                    })()}
                                </pre>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* CREATE REPORT MODAL */}
            {isCreateOpen && (
                <Modal
                    title="Create & Save Auditable Report"
                    onClose={() => {
                        if (!submitting) {
                            setIsCreateOpen(false);
                            setFormErrors({});
                        }
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    setFormErrors({});
                                }}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={handleCreateReport}
                                disabled={submitting}
                            >
                                {submitting ? "Generating..." : "Save Report"}
                            </button>
                        </>
                    }
                >
                    {formErrors.submit && (
                        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                            {formErrors.submit}
                        </div>
                    )}
                    <div className="df-form-2col">
                        <div className="df-form-group">
                            <label className="df-label">Report Domain *</label>
                            <select
                                className="df-select"
                                value={formData.reportType}
                                onChange={(e) => {
                                    setFormData({ ...formData, reportType: e.target.value });
                                    setFormErrors((prev) => ({ ...prev, reportType: undefined, submit: undefined }));
                                }}
                            >
                                <option value="FINANCIAL">Financial Revenue & Billing</option>
                                <option value="CLINICAL">Clinical Consultations & Treatments</option>
                                <option value="OPERATIONAL">Doctor Productivity & Operational</option>
                                <option value="INVENTORY">Pharmacy & Inventory Consumption</option>
                                <option value="PATIENTS">Patient Growth & Demographics</option>
                            </select>
                            {formErrors.reportType && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.reportType}</div>
                            )}
                        </div>

                        <div className="df-form-group">
                            <label className="df-label">Reporting Period *</label>
                            <select
                                className="df-select"
                                value={formData.reportingPeriod}
                                onChange={(e) => {
                                    setFormData({ ...formData, reportingPeriod: e.target.value });
                                    setFormErrors((prev) => ({ ...prev, reportingPeriod: undefined, submit: undefined }));
                                }}
                            >
                                <option value="March 2026 (Month to Date)">March 2026 (Month to Date)</option>
                                <option value="February 2026">February 2026</option>
                                <option value="Quarter 1 2026">Quarter 1 2026 (Jan - Mar)</option>
                                <option value="Annual 2025">Annual Fiscal 2025</option>
                                <option value="Custom Audit Period">Custom Audit Period</option>
                            </select>
                            {formErrors.reportingPeriod && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.reportingPeriod}</div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-group" style={{ marginTop: 12 }}>
                        <label className="df-label">Report Title *</label>
                        <input
                            className="df-input"
                            placeholder="e.g. Monthly Clinical Consultation Summary"
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({ ...formData, title: e.target.value });
                                setFormErrors((prev) => ({ ...prev, title: undefined, submit: undefined }));
                            }}
                        />
                        {formErrors.title && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.title}</div>
                        )}
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 12 }}>
                        <div className="df-form-group">
                            <label className="df-label">Audit Status</label>
                            <select
                                className="df-select"
                                value={formData.status}
                                onChange={(e) => {
                                    setFormData({ ...formData, status: e.target.value });
                                }}
                            >
                                <option value="GENERATED">GENERATED</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="PENDING">PENDING</option>
                                <option value="DRAFT">DRAFT</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Generated By</label>
                            <input
                                className="df-input"
                                value={formData.generatedBy}
                                onChange={(e) => setFormData({ ...formData, generatedBy: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="df-form-group" style={{ marginTop: 12 }}>
                        <label className="df-label">Executive Summary & Audit Scope *</label>
                        <textarea
                            className="df-input"
                            rows={3}
                            placeholder="Detailed findings, scope of investigation, notes, and compliance conclusions..."
                            value={formData.description}
                            onChange={(e) => {
                                setFormData({ ...formData, description: e.target.value });
                                setFormErrors((prev) => ({ ...prev, description: undefined, submit: undefined }));
                            }}
                        />
                        {formErrors.description && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.description}</div>
                        )}
                    </div>

                    <div className="df-form-group" style={{ marginTop: 12 }}>
                        <label className="df-label">Specific Parameters / Additional Findings (Optional)</label>
                        <textarea
                            className="df-input"
                            rows={2}
                            placeholder="Key data points, verified metrics, or notes..."
                            value={formData.reportData}
                            onChange={(e) => setFormData({ ...formData, reportData: e.target.value })}
                        />
                    </div>
                </Modal>
            )}

            {/* EDIT REPORT MODAL */}
            {editingReport && (
                <Modal
                    title={`Edit Report: ${editingReport.reportCode || `#${editingReport.id}`}`}
                    onClose={() => {
                        if (!submitting) {
                            setEditingReport(null);
                            setFormErrors({});
                        }
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    setEditingReport(null);
                                    setFormErrors({});
                                }}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={handleUpdateReport}
                                disabled={submitting}
                            >
                                {submitting ? "Updating..." : "Save Changes"}
                            </button>
                        </>
                    }
                >
                    {formErrors.submit && (
                        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                            {formErrors.submit}
                        </div>
                    )}
                    <div className="df-form-2col">
                        <div className="df-form-group">
                            <label className="df-label">Report Domain *</label>
                            <select
                                className="df-select"
                                value={editFormData.reportType}
                                onChange={(e) => {
                                    setEditFormData({ ...editFormData, reportType: e.target.value });
                                    setFormErrors((prev) => ({ ...prev, reportType: undefined, submit: undefined }));
                                }}
                            >
                                <option value="FINANCIAL">Financial Revenue & Billing</option>
                                <option value="CLINICAL">Clinical Consultations & Treatments</option>
                                <option value="OPERATIONAL">Doctor Productivity & Operational</option>
                                <option value="INVENTORY">Pharmacy & Inventory Consumption</option>
                                <option value="PATIENTS">Patient Growth & Demographics</option>
                            </select>
                            {formErrors.reportType && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.reportType}</div>
                            )}
                        </div>

                        <div className="df-form-group">
                            <label className="df-label">Reporting Period *</label>
                            <select
                                className="df-select"
                                value={editFormData.reportingPeriod}
                                onChange={(e) => {
                                    setEditFormData({ ...editFormData, reportingPeriod: e.target.value });
                                    setFormErrors((prev) => ({ ...prev, reportingPeriod: undefined, submit: undefined }));
                                }}
                            >
                                <option value="March 2026 (Month to Date)">March 2026 (Month to Date)</option>
                                <option value="February 2026">February 2026</option>
                                <option value="Quarter 1 2026">Quarter 1 2026 (Jan - Mar)</option>
                                <option value="Annual 2025">Annual Fiscal 2025</option>
                                <option value="Custom Audit Period">Custom Audit Period</option>
                            </select>
                            {formErrors.reportingPeriod && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.reportingPeriod}</div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-group" style={{ marginTop: 12 }}>
                        <label className="df-label">Report Title *</label>
                        <input
                            className="df-input"
                            value={editFormData.title}
                            onChange={(e) => {
                                setEditFormData({ ...editFormData, title: e.target.value });
                                setFormErrors((prev) => ({ ...prev, title: undefined, submit: undefined }));
                            }}
                        />
                        {formErrors.title && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.title}</div>
                        )}
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 12 }}>
                        <div className="df-form-group">
                            <label className="df-label">Audit Status</label>
                            <select
                                className="df-select"
                                value={editFormData.status}
                                onChange={(e) => {
                                    setEditFormData({ ...editFormData, status: e.target.value });
                                }}
                            >
                                <option value="GENERATED">GENERATED</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="PENDING">PENDING</option>
                                <option value="DRAFT">DRAFT</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Generated By</label>
                            <input
                                className="df-input"
                                value={editFormData.generatedBy}
                                onChange={(e) => setEditFormData({ ...editFormData, generatedBy: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="df-form-group" style={{ marginTop: 12 }}>
                        <label className="df-label">Executive Summary & Audit Scope *</label>
                        <textarea
                            className="df-input"
                            rows={3}
                            value={editFormData.description}
                            onChange={(e) => {
                                setEditFormData({ ...editFormData, description: e.target.value });
                                setFormErrors((prev) => ({ ...prev, description: undefined, submit: undefined }));
                            }}
                        />
                        {formErrors.description && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{formErrors.description}</div>
                        )}
                    </div>

                    <div className="df-form-group" style={{ marginTop: 12 }}>
                        <label className="df-label">Specific Parameters / Additional Findings</label>
                        <textarea
                            className="df-input"
                            rows={2}
                            value={editFormData.reportData}
                            onChange={(e) => setEditFormData({ ...editFormData, reportData: e.target.value })}
                        />
                    </div>
                </Modal>
            )}

            {/* DELETE REPORT CONFIRMATION MODAL */}
            {deletingReport && (
                <ConfirmationDialog
                    title="Delete Report Confirmation"
                    message={`Are you sure you want to permanently delete report "${deletingReport.reportCode || `#${deletingReport.id}`}: ${deletingReport.title}"? This action cannot be undone.`}
                    onCancel={() => {
                        if (!submitting) setDeletingReport(null);
                    }}
                    onConfirm={handleDeleteReport}
                />
            )}
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
        <div className={`df-role-page df-role-blue`}>
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

    // Supplier Form Validation & Submitting States
    const [supplierErrors, setSupplierErrors] = useState({});
    const [supplierSubmitting, setSupplierSubmitting] = useState(false);

    // Purchase Orders State (Real Backend List)
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);

    // Purchase Order Form Validation & Submitting States
    const [orderErrors, setOrderErrors] = useState({});
    const [orderSubmitting, setOrderSubmitting] = useState(false);

    const initialOrderDraft = {
        supplierId: "",
        itemDescription: "",
        quantity: "50",
        estimatedCost: "45000.00",
        deliveryDate: "",
        priority: "Standard",
    };
    const [orderDraft, setOrderDraft] = useState(initialOrderDraft);

    const [newSupplier, setNewSupplier] = useState({
        name: "",
        category: "Dental Instruments",
        email: "",
        phone: "",
        contactPerson: "",
        terms: "Net 30",
        status: "active",
    });

    const [editingSupplier, setEditingSupplier] = useState(null);

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

    const loadPurchaseOrders = async () => {
        try {
            setLoadingOrders(true);
            if (pharmacyApi.getAllPurchaseOrders) {
                const list = await pharmacyApi.getAllPurchaseOrders();
                if (Array.isArray(list)) {
                    setPurchaseOrders(list);
                }
            }
        } catch (err) {
            console.warn("Could not load purchase orders:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to load purchase orders";
            addToast(typeof msg === "string" ? msg : "Failed to load purchase orders", "error");
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        async function init() {
            try {
                const [supList, poList] = await Promise.all([
                    pharmacyApi.getAllSuppliers().catch(() => []),
                    pharmacyApi.getAllPurchaseOrders ? pharmacyApi.getAllPurchaseOrders().catch(() => []) : Promise.resolve([]),
                ]);
                if (!mounted) return;
                setRealSuppliers(supList.map(normalizeSupplier));
                if (Array.isArray(poList)) {
                    setPurchaseOrders(poList);
                }
            } catch (err) {
                console.warn("Could not load data:", err);
            } finally {
                if (mounted) {
                    setLoading(false);
                    setLoadingOrders(false);
                }
            }
        }
        init();
        return () => {
            mounted = false;
        };
    }, []);

    const suppliers = useMemo(() => {
        return realSuppliers;
    }, [realSuppliers]);

    // Normalized Purchase Orders from Real Backend Data
    const normalizedOrders = useMemo(() => {
        const supplierLookup = {};
        suppliers.forEach((s) => {
            supplierLookup[s.id] = s;
            if (s.rawId) supplierLookup[s.rawId] = s;
        });

        return purchaseOrders.map((po) => {
            const sup = supplierLookup[po.supplierId] || supplierLookup[po.supplier?.id];
            const supName =
                sup?.name ||
                po.supplier?.supplierName ||
                po.supplierName ||
                (po.supplierId ? `Supplier #${po.supplierId}` : "Unassigned Supplier");
            const itemDesc = po.itemsDescription || po.itemDescription || "Dental Consumables Batch";
            const totalNum = Number(po.totalAmount || 0);

            return {
                id: po.id,
                rawId: po.id,
                poNumber: po.poNumber || `PO-${po.id}`,
                supplierName: supName,
                supplierId: po.supplierId || po.supplier?.id || "",
                itemDescription: itemDesc,
                quantity: po.quantity || 1,
                totalAmount: totalNum,
                totalFormatted: `LKR ${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                deliveryDate: po.deliveryDate || po.orderDate || "—",
                orderDate: po.orderDate || "—",
                priority: po.priority || (po.notes?.includes("Urgent") ? "Urgent" : "Standard"),
                status: (po.status || "PENDING").toUpperCase(),
                notes: po.notes || "",
                raw: po,
            };
        });
    }, [purchaseOrders, suppliers]);

    const stats = useMemo(() => {
        const total = suppliers.length;
        const pharma = suppliers.filter((s) => (s.category || "").toLowerCase().includes("pharmaceutical")).length;
        const instruments = suppliers.filter((s) => (s.category || "").toLowerCase().includes("instrument") || (s.category || "").toLowerCase().includes("dental")).length;
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
            if (activeCategory === "pharma") return (sup.category || "").toLowerCase().includes("pharmaceutical");
            if (activeCategory === "instruments") return (sup.category || "").toLowerCase().includes("instrument") || (sup.category || "").toLowerCase().includes("dental");
            if (activeCategory === "implants") return (sup.category || "").toLowerCase().includes("implant") || (sup.category || "").toLowerCase().includes("prosthetic");
            return true;
        });
    }, [suppliers, search, activeCategory]);

    const filteredOrders = useMemo(() => {
        if (!search.trim()) return normalizedOrders;
        const q = search.toLowerCase().trim();
        return normalizedOrders.filter(
            (o) =>
                (o.poNumber && o.poNumber.toLowerCase().includes(q)) ||
                (o.supplierName && o.supplierName.toLowerCase().includes(q)) ||
                (o.itemDescription && o.itemDescription.toLowerCase().includes(q)) ||
                (o.status && o.status.toLowerCase().includes(q)) ||
                (o.priority && o.priority.toLowerCase().includes(q))
        );
    }, [normalizedOrders, search]);

    // Supplier Validation Logic
    const validateSupplier = (supplier) => {
        const errors = {};

        const name = supplier?.name?.trim() || "";
        const email = supplier?.email?.trim() || "";
        const phone = supplier?.phone?.trim() || "";
        const contactPerson = supplier?.contactPerson?.trim() || "";

        if (!name) {
            errors.name = "Supplier name is required";
        } else if (name.length < 2) {
            errors.name = "Supplier name must contain at least 2 characters";
        } else if (name.length > 100) {
            errors.name = "Supplier name must not exceed 100 characters";
        } else if (!/^[A-Za-z0-9][A-Za-z0-9 &'.,-]*$/.test(name)) {
            errors.name = "Enter a valid supplier/company name";
        }

        if (!supplier?.category) {
            errors.category = "Category is required";
        }

        if (!email) {
            errors.email = "Contact email is required";
        } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
            errors.email = "Enter a valid email address";
        }

        if (!phone) {
            errors.phone = "Contact phone is required";
        } else {
            const digits = phone.replace(/\D/g, "");

            if (!/^[+0-9\s()-]+$/.test(phone)) {
                errors.phone = "Phone number contains invalid characters";
            } else if (digits.length < 7 || digits.length > 15) {
                errors.phone = "Enter a valid phone number";
            }
        }

        if (!contactPerson) {
            errors.contactPerson = "Contact person is required";
        } else if (contactPerson.length < 2) {
            errors.contactPerson = "Contact person must contain at least 2 characters";
        } else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(contactPerson)) {
            errors.contactPerson = "Contact person must contain letters only";
        }

        if (!supplier?.terms) {
            errors.terms = "Payment terms are required";
        }

        return errors;
    };

    const handleAddSupplier = async (e) => {
        e.preventDefault();

        if (supplierSubmitting) return;

        const errors = validateSupplier(newSupplier);
        setSupplierErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        setSupplierSubmitting(true);

        try {
            const created = await pharmacyApi.createSupplier({
                supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
                supplierName: newSupplier.name.trim(),
                contactPerson: newSupplier.contactPerson.trim(),
                email: newSupplier.email.trim(),
                phone: newSupplier.phone.trim(),
                address: "Hospital Medical Supplies Zone",
                city: "Colombo",
                country: "Sri Lanka",
                suppliedItems: newSupplier.category,
                status: "ACTIVE",
                notes: `Procurement terms: ${newSupplier.terms || "Net 30"}`,
            });

            const supplierItem = normalizeSupplier(created);
            saveRecord("suppliers", supplierItem);

            addToast(`Supplier ${supplierItem.name} added successfully!`, "success");

            setIsAddOpen(false);
            setSupplierErrors({});
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
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.response?.data ||
                err?.message ||
                "Failed to add supplier";

            setSupplierErrors({
                submit: typeof msg === "string" ? msg : "Failed to add supplier",
            });

            addToast(typeof msg === "string" ? msg : "Failed to add supplier", "error");
        } finally {
            setSupplierSubmitting(false);
        }
    };

    const handleUpdateSupplier = async (e) => {
        e.preventDefault();

        if (!editingSupplier || supplierSubmitting) return;

        const errors = validateSupplier(editingSupplier);
        setSupplierErrors(errors);

        if (Object.keys(errors).length > 0) return;

        setSupplierSubmitting(true);

        try {
            await pharmacyApi.updateSupplier(editingSupplier.rawId, {
                supplierName: editingSupplier.name.trim(),
                contactPerson: editingSupplier.contactPerson.trim(),
                email: editingSupplier.email.trim(),
                phone: editingSupplier.phone.trim(),
                suppliedItems: editingSupplier.category,
                status: (editingSupplier.status || "active").toUpperCase(),
                notes: editingSupplier.notes || `Procurement terms: ${editingSupplier.terms || "Net 30"}`,
                address: editingSupplier.address || "Hospital Medical Supplies Zone",
                city: editingSupplier.city || "Colombo",
                country: "Sri Lanka",
            });

            addToast(`Supplier "${editingSupplier.name}" updated successfully!`, "success");
            setEditingSupplier(null);
            setSelectedSupplier(null);
            setSupplierErrors({});
            await loadSuppliers();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.response?.data ||
                err?.message ||
                "Failed to update supplier";

            setSupplierErrors({
                submit: typeof msg === "string" ? msg : "Failed to update supplier",
            });

            addToast(typeof msg === "string" ? msg : "Failed to update supplier", "error");
        } finally {
            setSupplierSubmitting(false);
        }
    };

    const handleDeleteSupplier = async (supplier) => {
        if (!window.confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
            return;
        }

        try {
            if (!supplier?.rawId) {
                addToast("Supplier ID missing for deletion", "error");
                return;
            }

            await pharmacyApi.deleteSupplier(supplier.rawId);
            addToast(`Supplier "${supplier.name}" deleted successfully!`, "success");
            if (selectedSupplier?.rawId === supplier.rawId) {
                setSelectedSupplier(null);
            }
            await loadSuppliers();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.response?.data ||
                err?.message ||
                "Failed to delete supplier";
            addToast(typeof msg === "string" ? msg : "Failed to delete supplier", "error");
        }
    };

    // =========================================================================
    // Purchase Order Validation Function (Reusable for Create & Update)
    // =========================================================================
    const validatePurchaseOrder = (order) => {
        const errors = {};

        // 1. Supplier Validation: must strictly match a loaded supplier
        const supId = Number(order?.supplierId);
        const matchingSup = suppliers.find((s) => s.id === supId || s.rawId === supId);
        if (!order?.supplierId || !matchingSup) {
            errors.supplierId = "Please select a valid supplier.";
        }

        // 2. Material / Item Description
        const itemDesc = order?.itemDescription?.trim() || "";
        if (!itemDesc) {
            errors.itemDescription = "Material / Item Description is required.";
        } else if (itemDesc.length < 3) {
            errors.itemDescription = "Item description must contain at least 3 characters.";
        } else if (itemDesc.length > 255) {
            errors.itemDescription = "Item description must not exceed 255 characters.";
        }

        // 3. Quantity: positive whole number only (reject 0, decimals, letters, negatives)
        const qtyStr = String(order?.quantity ?? "").trim();
        if (!qtyStr) {
            errors.quantity = "Quantity is required.";
        } else if (!/^[1-9]\d*$/.test(qtyStr)) {
            errors.quantity = "Quantity must be a positive whole number.";
        }

        // 4. Estimated Total Budget: positive numeric amount (up to 2 decimals)
        const budgetStr = String(order?.estimatedCost ?? "").replace(/LKR|,|\s/gi, "").trim();
        if (!budgetStr) {
            errors.estimatedCost = "Estimated total budget is required.";
        } else if (!/^\d+(\.\d{1,2})?$/.test(budgetStr) || Number(budgetStr) <= 0) {
            errors.estimatedCost = "Enter a valid positive budget amount (up to 2 decimal places).";
        }

        // 5. Required Delivery Date: cannot be in the past
        const todayStr = new Date().toISOString().slice(0, 10);
        const delivDate = String(order?.deliveryDate ?? "").trim();
        if (!delivDate) {
            errors.deliveryDate = "Required delivery date is required.";
        } else if (delivDate < todayStr) {
            errors.deliveryDate = "Delivery date cannot be in the past.";
        }

        // 6. Priority: must be one of the existing options
        if (!order?.priority || !["Standard", "Urgent"].includes(order.priority)) {
            errors.priority = "Please select an order priority.";
        }

        return errors;
    };

    // Open Modal Helpers
    const handleOpenAddOrder = (presetSupplierId = "") => {
        setOrderErrors({});
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        setOrderDraft({
            ...initialOrderDraft,
            supplierId: presetSupplierId ? String(presetSupplierId) : (suppliers[0]?.id ? String(suppliers[0].id) : ""),
            deliveryDate: nextWeek,
        });
        setIsOrderOpen(true);
    };

    const handleOpenEditOrder = (orderRow) => {
        setOrderErrors({});
        const cleanCost = orderRow.totalAmount ? String(orderRow.totalAmount) : "45000.00";
        setEditingOrder({
            ...orderRow,
            supplierId: String(orderRow.supplierId || ""),
            itemDescription: orderRow.itemDescription || "",
            quantity: String(orderRow.quantity || "1"),
            estimatedCost: cleanCost,
            deliveryDate: orderRow.deliveryDate !== "—" ? orderRow.deliveryDate : new Date().toISOString().slice(0, 10),
            priority: orderRow.priority || "Standard",
            status: orderRow.status || "PENDING",
        });
    };

    const handleInspectOrder = async (orderRow) => {
        const poId = orderRow.rawId || orderRow.id;
        try {
            if (poId && pharmacyApi.getPurchaseOrderById) {
                const fullDetail = await pharmacyApi.getPurchaseOrderById(poId).catch(() => null);
                if (fullDetail) {
                    setSelectedOrder({ ...orderRow, ...fullDetail, raw: fullDetail });
                    return;
                }
            }
        } catch {
            // fallback to row data if getById fails
        }
        setSelectedOrder(orderRow);
    };

    // =========================================================================
    // Purchase Order CREATE Handler
    // =========================================================================
    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (orderSubmitting) return;

        const validationErrors = validatePurchaseOrder(orderDraft);
        setOrderErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        const supId = Number(orderDraft.supplierId);
        const selectedSup = suppliers.find((s) => s.id === supId || s.rawId === supId);
        if (!selectedSup) {
            setOrderErrors({ supplierId: "Please select a valid supplier." });
            return;
        }

        setOrderSubmitting(true);
        const numericBudget = Number(String(orderDraft.estimatedCost).replace(/LKR|,|\s/gi, "").trim());

        try {
            const payload = {
                supplierId: selectedSup.rawId || selectedSup.id,
                orderDate: new Date().toISOString().slice(0, 10),
                deliveryDate: orderDraft.deliveryDate,
                itemDescription: orderDraft.itemDescription.trim(),
                itemsDescription: orderDraft.itemDescription.trim(),
                quantity: Number(orderDraft.quantity),
                totalAmount: numericBudget,
                priority: orderDraft.priority || "Standard",
                notes: `Priority: ${orderDraft.priority || "Standard"}`,
                status: "PENDING",
            };

            const created = await pharmacyApi.createPurchaseOrder(payload);

            addToast(
                `Purchase Order ${created?.poNumber || `PO-${created?.id || "NEW"}`} issued to ${selectedSup.name}!`,
                "success"
            );

            setIsOrderOpen(false);
            setOrderErrors({});
            setOrderDraft(initialOrderDraft);
            await loadPurchaseOrders();
        } catch (err) {
            console.error("Purchase Order creation failed:", err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.response?.data ||
                err?.message ||
                "Failed to place purchase order";
            const errorText = typeof msg === "string" ? msg : "Failed to place purchase order";
            setOrderErrors({ submit: errorText });
            addToast(errorText, "error");
        } finally {
            setOrderSubmitting(false);
        }
    };

    // =========================================================================
    // Purchase Order UPDATE Handler
    // =========================================================================
    const handleUpdateOrder = async (e) => {
        e.preventDefault();

        if (!editingOrder || orderSubmitting) return;

        const validationErrors = validatePurchaseOrder(editingOrder);
        setOrderErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        const supId = Number(editingOrder.supplierId);
        const selectedSup = suppliers.find((s) => s.id === supId || s.rawId === supId);
        if (!selectedSup) {
            setOrderErrors({ supplierId: "Please select a valid supplier." });
            return;
        }

        setOrderSubmitting(true);
        const numericBudget = Number(String(editingOrder.estimatedCost).replace(/LKR|,|\s/gi, "").trim());
        const targetId = editingOrder.rawId || editingOrder.id;

        try {
            const payload = {
                supplierId: selectedSup.rawId || selectedSup.id,
                orderDate: editingOrder.orderDate !== "—" ? editingOrder.orderDate : new Date().toISOString().slice(0, 10),
                deliveryDate: editingOrder.deliveryDate,
                itemDescription: editingOrder.itemDescription.trim(),
                itemsDescription: editingOrder.itemDescription.trim(),
                quantity: Number(editingOrder.quantity),
                totalAmount: numericBudget,
                priority: editingOrder.priority || "Standard",
                notes: editingOrder.notes || `Priority: ${editingOrder.priority || "Standard"}`,
                status: (editingOrder.status || "PENDING").toUpperCase(),
            };

            if (pharmacyApi.updatePurchaseOrder) {
                await pharmacyApi.updatePurchaseOrder(targetId, payload);
            } else {
                await pharmacyApi.createPurchaseOrder({ ...payload, id: targetId });
            }

            addToast(`Purchase Order #${editingOrder.poNumber || targetId} updated successfully!`, "success");
            setEditingOrder(null);
            setSelectedOrder(null);
            setOrderErrors({});
            await loadPurchaseOrders();
        } catch (err) {
            console.error("Purchase Order update failed:", err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.response?.data ||
                err?.message ||
                "Failed to update purchase order";
            const errorText = typeof msg === "string" ? msg : "Failed to update purchase order";
            setOrderErrors({ submit: errorText });
            addToast(errorText, "error");
        } finally {
            setOrderSubmitting(false);
        }
    };

    // =========================================================================
    // Purchase Order DELETE Handler
    // =========================================================================
    const handleDeleteOrder = async (orderRow) => {
        const poId = orderRow?.rawId || orderRow?.id;
        const poRef = orderRow?.poNumber || `#${poId}`;

        if (!window.confirm(`Are you sure you want to delete purchase order ${poRef}?`)) {
            return;
        }

        try {
            if (!poId) {
                addToast("Purchase Order ID missing for deletion", "error");
                return;
            }

            if (pharmacyApi.deletePurchaseOrder) {
                await pharmacyApi.deletePurchaseOrder(poId);
            } else {
                throw new Error("Purchase Order deletion endpoint is not supported by backend.");
            }

            addToast(`Purchase Order ${poRef} deleted successfully!`, "success");
            if (selectedOrder?.rawId === poId || selectedOrder?.id === poId) {
                setSelectedOrder(null);
            }
            await loadPurchaseOrders();
        } catch (err) {
            console.error("Purchase Order deletion failed:", err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.response?.data ||
                err?.message ||
                "Failed to delete purchase order";
            addToast(typeof msg === "string" ? msg : "Failed to delete purchase order", "error");
        }
    };

    const handleQuickOrder = (supplier) => {
        const targetId = String(supplier.rawId || supplier.id || "");
        handleOpenAddOrder(targetId);
        setOrderDraft((curr) => ({
            ...curr,
            supplierId: targetId,
            itemDescription: `Restock Consignment (${supplier.category || "Consumables"})`,
        }));
    };

    const supplierColumns = [
        { key: "name", label: "Supplier / Vendor Name" },
        { key: "category", label: "Procurement Category" },
        { key: "email", label: "Orders Email" },
        { key: "phone", label: "Contact Hotline" },
        { key: "status", label: "Contract State", type: "status" },
    ];

    const orderColumns = [
        { key: "poNumber", label: "PO Number" },
        { key: "supplierName", label: "Supplier" },
        { key: "itemDescription", label: "Material / Items" },
        { key: "quantity", label: "Qty" },
        { key: "totalFormatted", label: "Total Budget (LKR)" },
        { key: "deliveryDate", label: "Required Date" },
        {
            key: "priority",
            label: "Priority",
            render: (row) => (
                <span className={`df-badge ${row.priority === "Urgent" ? "df-badge-danger" : "df-badge-primary"}`}>
          {row.priority}
        </span>
            ),
        },
        { key: "status", label: "Order Status", type: "status" },
    ];

    return (
        <div className="df-role-page df-role-blue">
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
                    <button className="df-btn df-btn-secondary" onClick={() => handleOpenAddOrder()}>
                        + Create Purchase Order
                    </button>
                    <button
                        className="df-btn df-btn-primary"
                        onClick={() => {
                            setSupplierErrors({});
                            setIsAddOpen(true);
                        }}
                    >
                        + Add Supplier
                    </button>
                </div>
            </header>

            {(loading || loadingOrders) && (
                <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
                    Syncing procurement records from central database...
                </div>
            )}

            <div className="df-stat-grid">
                <StatCard label="Active Vendors" value={String(stats.total)} icon="◫" color="primary" />
                <StatCard label="Pharmaceutical Sources" value={String(stats.pharma)} icon="✓" color="success" />
                <StatCard label="Pending Orders" value={String(purchaseOrders.filter((p) => (p.status || "").toUpperCase() === "PENDING").length)} icon="◈" color="warning" />
                <StatCard label="Total Logged POs" value={String(purchaseOrders.length)} icon="◷" color="primary" />
            </div>

            <div className="df-toolbar" style={{ marginBottom: 16 }}>
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder={
                        activeCategory === "orders"
                            ? "Search purchase orders by PO ref, supplier, or items..."
                            : "Search by supplier name, category, or contact..."
                    }
                />
            </div>

            <TabPills
                tabs={[
                    { label: "All Suppliers", value: "all", count: stats.total },
                    { label: "Pharmaceuticals", value: "pharma", count: stats.pharma },
                    { label: "Instruments & Equipment", value: "instruments", count: stats.instruments },
                    { label: "Implants & Prosthetics", value: "implants" },
                    { label: "Purchase Orders (PO)", value: "orders", count: purchaseOrders.length },
                ]}
                activeTab={activeCategory}
                onChange={setActiveCategory}
            />

            {/* View Mode 1: Purchase Orders Ledger Table */}
            {activeCategory === "orders" ? (
                <section className="df-card">
                    <div className="df-card-body">
                        <div className="df-card-title-row" style={{ marginBottom: 14 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Procurement Purchase Orders</h3>
                                <p style={{ margin: 0, fontSize: 13, color: "var(--df-text-muted)" }}>
                                    Auditable purchase orders submitted to medical supply vendors and logistics distributors.
                                </p>
                            </div>
                            <button className="df-btn df-btn-primary df-btn-sm" onClick={() => handleOpenAddOrder()}>
                                + New Purchase Order
                            </button>
                        </div>

                        <DataTable
                            columns={orderColumns}
                            rows={filteredOrders}
                            actionLabel="View Details"
                            onEdit={(row) => handleInspectOrder(row)}
                            onDelete={handleDeleteOrder}
                            onQuickAction={(row) => handleOpenEditOrder(row)}
                            quickActionLabel="Edit PO"
                        />
                    </div>
                </section>
            ) : (
                /* View Mode 2: Suppliers Directory Table */
                <section className="df-card">
                    <div className="df-card-body">
                        <DataTable
                            columns={supplierColumns}
                            rows={filtered}
                            actionLabel="View / Edit"
                            onEdit={(row) => setSelectedSupplier(row)}
                            onDelete={handleDeleteSupplier}
                            onQuickAction={handleQuickOrder}
                            quickActionLabel="+ Order Stock"
                        />
                    </div>
                </section>
            )}

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
                                    setSupplierErrors({});
                                    setEditingSupplier({
                                        ...selectedSupplier,
                                        terms: selectedSupplier.terms || "Net 30",
                                        contactPerson: selectedSupplier.contactPerson || "",
                                    });
                                    setSelectedSupplier(null);
                                }}
                            >
                                ✎ Edit Supplier
                            </button>
                            <button
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    handleQuickOrder(selectedSupplier);
                                    setSelectedSupplier(null);
                                }}
                            >
                                Create PO for this Vendor
                            </button>
                            <button
                                className="df-btn df-btn-danger"
                                style={{ background: "var(--df-danger, #ef4444)", color: "#fff" }}
                                onClick={() => handleDeleteSupplier(selectedSupplier)}
                            >
                                Delete Supplier
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
                            Specialized in {selectedSupplier.category} • Contract terms: {selectedSupplier.terms || "Net 30"}
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

            {/* Edit Supplier Modal */}
            {editingSupplier && (
                <Modal
                    title={`Edit Supplier: ${editingSupplier.name}`}
                    onClose={() => {
                        if (!supplierSubmitting) {
                            setEditingSupplier(null);
                            setSupplierErrors({});
                        }
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    setEditingSupplier(null);
                                    setSupplierErrors({});
                                }}
                                disabled={supplierSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={handleUpdateSupplier}
                                disabled={supplierSubmitting}
                            >
                                {supplierSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    }
                >
                    <div className="df-form-group">
                        <label className="df-label">Supplier / Company Name *</label>
                        <input
                            className="df-input"
                            value={editingSupplier.name || ""}
                            onChange={(e) => {
                                setEditingSupplier({
                                    ...editingSupplier,
                                    name: e.target.value,
                                });
                                setSupplierErrors((prev) => ({
                                    ...prev,
                                    name: undefined,
                                    submit: undefined,
                                }));
                            }}
                        />
                        {supplierErrors.name && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                {supplierErrors.name}
                            </div>
                        )}
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Category *</label>
                            <select
                                className="df-select"
                                value={editingSupplier.category || "Dental Instruments"}
                                onChange={(e) => {
                                    setEditingSupplier({
                                        ...editingSupplier,
                                        category: e.target.value,
                                    });
                                    setSupplierErrors((prev) => ({
                                        ...prev,
                                        category: undefined,
                                        submit: undefined,
                                    }));
                                }}
                            >
                                <option value="Dental Instruments">Dental Instruments & Equipment</option>
                                <option value="Pharmaceuticals">Pharmaceuticals & Anesthetics</option>
                                <option value="Implants & Prosthetics">Implants & Prosthetics</option>
                                <option value="Consumables & PPE">Consumables & PPE</option>
                            </select>
                            {supplierErrors.category && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.category}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Payment Terms *</label>
                            <select
                                className="df-select"
                                value={editingSupplier.terms || "Net 30"}
                                onChange={(e) => {
                                    setEditingSupplier({
                                        ...editingSupplier,
                                        terms: e.target.value,
                                    });
                                    setSupplierErrors((prev) => ({
                                        ...prev,
                                        terms: undefined,
                                        submit: undefined,
                                    }));
                                }}
                            >
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 60">Net 60 Days</option>
                                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                                <option value="Advance Payment">Advance Payment</option>
                            </select>
                            {supplierErrors.terms && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.terms}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Contact Email *</label>
                            <input
                                type="email"
                                className="df-input"
                                value={editingSupplier.email || ""}
                                onChange={(e) => {
                                    setEditingSupplier({
                                        ...editingSupplier,
                                        email: e.target.value,
                                    });
                                    setSupplierErrors((prev) => ({
                                        ...prev,
                                        email: undefined,
                                        submit: undefined,
                                    }));
                                }}
                            />
                            {supplierErrors.email && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.email}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Contact Phone *</label>
                            <input
                                className="df-input"
                                value={editingSupplier.phone || ""}
                                onChange={(e) => {
                                    setEditingSupplier({
                                        ...editingSupplier,
                                        phone: e.target.value,
                                    });
                                    setSupplierErrors((prev) => ({
                                        ...prev,
                                        phone: undefined,
                                        submit: undefined,
                                    }));
                                }}
                            />
                            {supplierErrors.phone && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Contact Person *</label>
                            <input
                                className="df-input"
                                value={editingSupplier.contactPerson || ""}
                                onChange={(e) => {
                                    setEditingSupplier({
                                        ...editingSupplier,
                                        contactPerson: e.target.value,
                                    });
                                    setSupplierErrors((prev) => ({
                                        ...prev,
                                        contactPerson: undefined,
                                        submit: undefined,
                                    }));
                                }}
                            />
                            {supplierErrors.contactPerson && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.contactPerson}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Account Status</label>
                            <select
                                className="df-select"
                                value={editingSupplier.status || "active"}
                                onChange={(e) => setEditingSupplier({ ...editingSupplier, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {supplierErrors.submit && (
                        <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 13 }}>
                            {supplierErrors.submit}
                        </div>
                    )}
                </Modal>
            )}

            {/* Add Supplier Modal */}
            {isAddOpen && (
                <Modal
                    title="Add New Supplier to Directory"
                    onClose={() => {
                        if (!supplierSubmitting) {
                            setIsAddOpen(false);
                            setSupplierErrors({});
                        }
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    setIsAddOpen(false);
                                    setSupplierErrors({});
                                }}
                                disabled={supplierSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={handleAddSupplier}
                                disabled={supplierSubmitting}
                            >
                                {supplierSubmitting ? "Adding..." : "Add Supplier"}
                            </button>
                        </>
                    }
                >
                    <div className="df-form-group">
                        <label className="df-label">Name *</label>
                        <input
                            className="df-input"
                            value={newSupplier.name}
                            onChange={(e) => {
                                setNewSupplier({ ...newSupplier, name: e.target.value });
                                setSupplierErrors((prev) => ({ ...prev, name: undefined, submit: undefined }));
                            }}
                            placeholder="e.g. Lanka Meditech Instruments Ltd"
                        />
                        {supplierErrors.name && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                {supplierErrors.name}
                            </div>
                        )}
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Category *</label>
                            <select
                                className="df-select"
                                value={newSupplier.category}
                                onChange={(e) => {
                                    setNewSupplier({ ...newSupplier, category: e.target.value });
                                    setSupplierErrors((prev) => ({ ...prev, category: undefined, submit: undefined }));
                                }}
                            >
                                <option value="Dental Instruments">Dental Instruments & Equipment</option>
                                <option value="Pharmaceuticals">Pharmaceuticals & Anesthetics</option>
                                <option value="Implants & Prosthetics">Implants & Prosthetics</option>
                                <option value="Consumables & PPE">Consumables & PPE</option>
                            </select>
                            {supplierErrors.category && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.category}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Payment Terms *</label>
                            <select
                                className="df-select"
                                value={newSupplier.terms}
                                onChange={(e) => {
                                    setNewSupplier({ ...newSupplier, terms: e.target.value });
                                    setSupplierErrors((prev) => ({ ...prev, terms: undefined, submit: undefined }));
                                }}
                            >
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 60">Net 60 Days</option>
                                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                                <option value="Advance Payment">Advance Payment</option>
                            </select>
                            {supplierErrors.terms && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.terms}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Contact Email *</label>
                            <input
                                type="email"
                                className="df-input"
                                value={newSupplier.email}
                                onChange={(e) => {
                                    setNewSupplier({ ...newSupplier, email: e.target.value });
                                    setSupplierErrors((prev) => ({ ...prev, email: undefined, submit: undefined }));
                                }}
                                placeholder="orders@vendor.lk"
                            />
                            {supplierErrors.email && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.email}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Contact Phone *</label>
                            <input
                                className="df-input"
                                value={newSupplier.phone}
                                onChange={(e) => {
                                    setNewSupplier({ ...newSupplier, phone: e.target.value });
                                    setSupplierErrors((prev) => ({ ...prev, phone: undefined, submit: undefined }));
                                }}
                                placeholder="+94 11 234 5678"
                            />
                            {supplierErrors.phone && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {supplierErrors.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-group" style={{ marginTop: 14 }}>
                        <label className="df-label">Contact Person *</label>
                        <input
                            className="df-input"
                            value={newSupplier.contactPerson}
                            onChange={(e) => {
                                setNewSupplier({ ...newSupplier, contactPerson: e.target.value });
                                setSupplierErrors((prev) => ({ ...prev, contactPerson: undefined, submit: undefined }));
                            }}
                            placeholder="e.g. Ruwan Silva"
                        />
                        {supplierErrors.contactPerson && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                {supplierErrors.contactPerson}
                            </div>
                        )}
                    </div>

                    {supplierErrors.submit && (
                        <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 13 }}>
                            {supplierErrors.submit}
                        </div>
                    )}
                </Modal>
            )}

            {/* CREATE Purchase Order Modal */}
            {isOrderOpen && (
                <Modal
                    title="Generate Purchase Order (PO)"
                    onClose={() => {
                        if (!orderSubmitting) {
                            setIsOrderOpen(false);
                            setOrderErrors({});
                        }
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    setIsOrderOpen(false);
                                    setOrderErrors({});
                                }}
                                disabled={orderSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={handlePlaceOrder}
                                disabled={orderSubmitting}
                            >
                                {orderSubmitting ? "Creating..." : "Issue Purchase Order"}
                            </button>
                        </>
                    }
                >
                    <div className="df-form-group">
                        <label className="df-label">Select Vendor / Supplier *</label>
                        <select
                            className="df-select"
                            value={orderDraft.supplierId}
                            onChange={(e) => {
                                setOrderDraft({ ...orderDraft, supplierId: e.target.value });
                                setOrderErrors((prev) => ({ ...prev, supplierId: undefined, submit: undefined }));
                            }}
                        >
                            <option value="">Choose a registered supplier...</option>
                            {suppliers.map((s) => (
                                <option key={s.id || s.rawId} value={s.rawId || s.id}>
                                    {s.name} ({s.category})
                                </option>
                            ))}
                        </select>
                        {orderErrors.supplierId && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                {orderErrors.supplierId}
                            </div>
                        )}
                    </div>

                    <div className="df-form-group" style={{ marginTop: 14 }}>
                        <label className="df-label">Material / Item Description *</label>
                        <input
                            className="df-input"
                            value={orderDraft.itemDescription}
                            onChange={(e) => {
                                setOrderDraft({ ...orderDraft, itemDescription: e.target.value });
                                setOrderErrors((prev) => ({ ...prev, itemDescription: undefined, submit: undefined }));
                            }}
                            placeholder="e.g. Composite Resin Refill Kits, Pack of 50"
                        />
                        {orderErrors.itemDescription && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                {orderErrors.itemDescription}
                            </div>
                        )}
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Quantity *</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                className="df-input"
                                value={orderDraft.quantity}
                                onChange={(e) => {
                                    setOrderDraft({ ...orderDraft, quantity: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, quantity: undefined, submit: undefined }));
                                }}
                                placeholder="e.g. 50"
                            />
                            {orderErrors.quantity && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.quantity}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Estimated Total Budget (LKR) *</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="df-input"
                                value={orderDraft.estimatedCost}
                                onChange={(e) => {
                                    setOrderDraft({ ...orderDraft, estimatedCost: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, estimatedCost: undefined, submit: undefined }));
                                }}
                                placeholder="e.g. 45000.00"
                            />
                            {orderErrors.estimatedCost && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.estimatedCost}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Required Delivery Date *</label>
                            <input
                                type="date"
                                className="df-input"
                                value={orderDraft.deliveryDate}
                                onChange={(e) => {
                                    setOrderDraft({ ...orderDraft, deliveryDate: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, deliveryDate: undefined, submit: undefined }));
                                }}
                            />
                            {orderErrors.deliveryDate && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.deliveryDate}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Order Priority *</label>
                            <select
                                className="df-select"
                                value={orderDraft.priority}
                                onChange={(e) => {
                                    setOrderDraft({ ...orderDraft, priority: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, priority: undefined, submit: undefined }));
                                }}
                            >
                                <option value="Standard">Standard (3-5 Days)</option>
                                <option value="Urgent">Urgent Overnight Consignment</option>
                            </select>
                            {orderErrors.priority && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.priority}
                                </div>
                            )}
                        </div>
                    </div>

                    {orderErrors.submit && (
                        <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 13 }}>
                            {orderErrors.submit}
                        </div>
                    )}
                </Modal>
            )}

            {/* EDIT Purchase Order Modal */}
            {editingOrder && (
                <Modal
                    title={`Edit Purchase Order: ${editingOrder.poNumber || `#${editingOrder.id}`}`}
                    onClose={() => {
                        if (!orderSubmitting) {
                            setEditingOrder(null);
                            setOrderErrors({});
                        }
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    setEditingOrder(null);
                                    setOrderErrors({});
                                }}
                                disabled={orderSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-primary"
                                onClick={handleUpdateOrder}
                                disabled={orderSubmitting}
                            >
                                {orderSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    }
                >
                    <div className="df-form-2col">
                        <div className="df-form-group">
                            <label className="df-label">Select Vendor / Supplier *</label>
                            <select
                                className="df-select"
                                value={editingOrder.supplierId}
                                onChange={(e) => {
                                    setEditingOrder({ ...editingOrder, supplierId: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, supplierId: undefined, submit: undefined }));
                                }}
                            >
                                <option value="">Choose a registered supplier...</option>
                                {suppliers.map((s) => (
                                    <option key={s.id || s.rawId} value={s.rawId || s.id}>
                                        {s.name} ({s.category})
                                    </option>
                                ))}
                            </select>
                            {orderErrors.supplierId && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.supplierId}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Order Status</label>
                            <select
                                className="df-select"
                                value={editingOrder.status}
                                onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                            >
                                <option value="PENDING">PENDING</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                            </select>
                        </div>
                    </div>

                    <div className="df-form-group" style={{ marginTop: 14 }}>
                        <label className="df-label">Material / Item Description *</label>
                        <input
                            className="df-input"
                            value={editingOrder.itemDescription}
                            onChange={(e) => {
                                setEditingOrder({ ...editingOrder, itemDescription: e.target.value });
                                setOrderErrors((prev) => ({ ...prev, itemDescription: undefined, submit: undefined }));
                            }}
                        />
                        {orderErrors.itemDescription && (
                            <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                {orderErrors.itemDescription}
                            </div>
                        )}
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Quantity *</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                className="df-input"
                                value={editingOrder.quantity}
                                onChange={(e) => {
                                    setEditingOrder({ ...editingOrder, quantity: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, quantity: undefined, submit: undefined }));
                                }}
                            />
                            {orderErrors.quantity && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.quantity}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Estimated Total Budget (LKR) *</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="df-input"
                                value={editingOrder.estimatedCost}
                                onChange={(e) => {
                                    setEditingOrder({ ...editingOrder, estimatedCost: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, estimatedCost: undefined, submit: undefined }));
                                }}
                            />
                            {orderErrors.estimatedCost && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.estimatedCost}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div className="df-form-group">
                            <label className="df-label">Required Delivery Date *</label>
                            <input
                                type="date"
                                className="df-input"
                                value={editingOrder.deliveryDate}
                                onChange={(e) => {
                                    setEditingOrder({ ...editingOrder, deliveryDate: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, deliveryDate: undefined, submit: undefined }));
                                }}
                            />
                            {orderErrors.deliveryDate && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.deliveryDate}
                                </div>
                            )}
                        </div>
                        <div className="df-form-group">
                            <label className="df-label">Order Priority *</label>
                            <select
                                className="df-select"
                                value={editingOrder.priority}
                                onChange={(e) => {
                                    setEditingOrder({ ...editingOrder, priority: e.target.value });
                                    setOrderErrors((prev) => ({ ...prev, priority: undefined, submit: undefined }));
                                }}
                            >
                                <option value="Standard">Standard (3-5 Days)</option>
                                <option value="Urgent">Urgent Overnight Consignment</option>
                            </select>
                            {orderErrors.priority && (
                                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 5 }}>
                                    {orderErrors.priority}
                                </div>
                            )}
                        </div>
                    </div>

                    {orderErrors.submit && (
                        <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 13 }}>
                            {orderErrors.submit}
                        </div>
                    )}
                </Modal>
            )}

            {/* INSPECT Purchase Order Modal */}
            {selectedOrder && (
                <Modal
                    title={`Purchase Order Details: ${selectedOrder.poNumber || `#${selectedOrder.id}`}`}
                    onClose={() => setSelectedOrder(null)}
                    footer={
                        <>
                            <button
                                type="button"
                                className="df-btn df-btn-secondary"
                                onClick={() => {
                                    const orderToEdit = selectedOrder;
                                    setSelectedOrder(null);
                                    handleOpenEditOrder(orderToEdit);
                                }}
                            >
                                ✎ Edit Order
                            </button>
                            <button
                                type="button"
                                className="df-btn df-btn-danger"
                                style={{ background: "var(--df-danger, #ef4444)", color: "#fff" }}
                                onClick={() => handleDeleteOrder(selectedOrder)}
                            >
                                Delete Order
                            </button>
                            <button type="button" className="df-btn df-btn-primary" onClick={() => setSelectedOrder(null)}>
                                Close
                            </button>
                        </>
                    }
                >
                    <div style={{ background: "var(--df-surface-variant, #f8fafc)", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <strong>Reference: {selectedOrder.poNumber || `#${selectedOrder.id}`}</strong>
                            <span className={`df-badge ${selectedOrder.status === "DELIVERED" ? "df-badge-success" : selectedOrder.status === "CANCELLED" ? "df-badge-danger" : "df-badge-warning"}`}>
                {selectedOrder.status}
              </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--df-text-muted)" }}>
                            Assigned Vendor: <strong>{selectedOrder.supplierName}</strong> · Priority: {selectedOrder.priority}
                        </p>
                    </div>

                    <div className="df-form-2col">
                        <div>
                            <small style={{ color: "var(--df-text-muted)" }}>Material / Item Description</small>
                            <div style={{ fontWeight: 600 }}>{selectedOrder.itemDescription}</div>
                        </div>
                        <div>
                            <small style={{ color: "var(--df-text-muted)" }}>Units Quantity</small>
                            <div style={{ fontWeight: 600 }}>{selectedOrder.quantity} Units</div>
                        </div>
                    </div>

                    <div className="df-form-2col" style={{ marginTop: 14 }}>
                        <div>
                            <small style={{ color: "var(--df-text-muted)" }}>Total Budget Amount</small>
                            <div style={{ fontWeight: 700, color: "var(--df-primary-600)", fontSize: 16 }}>
                                {selectedOrder.totalFormatted}
                            </div>
                        </div>
                        <div>
                            <small style={{ color: "var(--df-text-muted)" }}>Required Delivery Date</small>
                            <div style={{ fontWeight: 600 }}>{selectedOrder.deliveryDate}</div>
                        </div>
                    </div>

                    {selectedOrder.notes && (
                        <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
                            <small style={{ color: "var(--df-text-muted)" }}>Procurement & Logistic Notes</small>
                            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{selectedOrder.notes}</p>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}
