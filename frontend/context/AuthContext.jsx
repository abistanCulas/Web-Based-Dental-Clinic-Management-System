import { createContext, useContext, useEffect, useState } from "react";
import authApi, { normalizeRole } from "../api/auth";
import apiClient from "../api/client";

const AuthContext = createContext(null);

// Development-only quick-fill demo accounts.
// These credentials must never be shipped to a production build, so the
// exported map is empty unless the app is running in dev mode.
const DEV_DEMO_USERS = {
  "admin@dentaflow.com": { password: "pw-demo123", role: "admin", name: "System Administrator", phone: "+94 77 000 0000", avatar: null },
  "patient@dentaflow.com": { password: "pw-demo123", role: "patient", name: "Sarah Mitchell", phone: "+94 77 123 4567", avatar: null },
  "dentist@dentaflow.com": { password: "pw-demo123", role: "doctor", name: "Dr. James Wilson", phone: "+94 77 234 5678", avatar: null },
  "receptionist@dentaflow.com": { password: "pw-demo123", role: "receptionist", name: "Emma Rodriguez", phone: "+94 77 345 6789", avatar: null },
  "cashier@dentaflow.com": { password: "pw-demo123", role: "cashier", name: "Michael Chen", phone: "+94 77 456 7890", avatar: null },
  "pharmacist@dentaflow.com": { password: "pw-demo123", role: "pharmacist", name: "Lisa Thompson", phone: "+94 77 567 8901", avatar: null },
};

export const DEMO_USERS = import.meta.env.DEV ? DEV_DEMO_USERS : {};

const ROLE_DASHBOARD = {
  patient: "/patient",
  doctor: "/doctor",
  receptionist: "/receptionist",
  cashier: "/user",
  user: "/user",
  pharmacist: "/pharmacist",
  admin: "/admin",
};

export function getDashboardPath(role) {
  return ROLE_DASHBOARD[role] || "/";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("dentaflow-user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const legacyRoles = { dentist: "doctor" };
      return legacyRoles[parsed.role] ? { ...parsed, role: legacyRoles[parsed.role] } : parsed;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    return !!localStorage.getItem("dentaflow-token");
  });

  // Restore authenticated user and validate token on application load
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("dentaflow-token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const profile = await authApi.getMe();
        let staffRole = null;
        const upperRole = String(profile.role || "").trim().toUpperCase();

        if (upperRole === "STAFF" || upperRole === "ROLE_STAFF") {
          const staff = await authApi.getStaffByUserId(profile.id);
          if (staff?.role) {
            staffRole = staff.role;
          } else {
            const lowerEmail = (profile.email || "").toLowerCase();
            if (lowerEmail.includes("reception")) staffRole = "RECEPTIONIST";
            else if (lowerEmail.includes("pharm")) staffRole = "PHARMACIST";
            else if (lowerEmail.includes("cashier")) staffRole = "CASHIER";
          }
        }

        const normalized = normalizeRole(profile.role, staffRole, profile.email);
        const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email;

        const updatedUser = {
          id: profile.id,
          userId: profile.id,
          email: profile.email,
          name: fullName,
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          phone: profile.phone || "",
          role: normalized,
          backendRole: profile.role,
          staffRole,
          token,
          avatar: profile.profileImage || null,
          profileImage: profile.profileImage || null,
        };

        setUser(updatedUser);
        localStorage.setItem("dentaflow-user", JSON.stringify(updatedUser));
      } catch (error) {
        // If unauthorized / token expired, clear session
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("dentaflow-token");
          localStorage.removeItem("dentaflow-user");
          delete apiClient.defaults.headers.common["Authorization"];
          setUser(null);
        }
        // If network error (offline), keep existing local state
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const initUserSession = async (data, emailHint = "") => {
    const token = data.token;
    localStorage.setItem("dentaflow-token", token);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    let staffRole = null;
    const upperRole = String(data.role || "").trim().toUpperCase();

    if (upperRole === "STAFF" || upperRole === "ROLE_STAFF") {
      const staff = await authApi.getStaffByUserId(data.userId);
      if (staff?.role) {
        staffRole = staff.role;
      } else {
        const lowerEmail = (emailHint || data.username || "").toLowerCase();
        if (lowerEmail.includes("reception")) staffRole = "RECEPTIONIST";
        else if (lowerEmail.includes("pharm")) staffRole = "PHARMACIST";
        else if (lowerEmail.includes("cashier")) staffRole = "CASHIER";
      }
    }

    // Fetch full profile from GET /api/auth/me
    let profile = null;
    try {
      profile = await authApi.getMe();
    } catch {
      profile = {
        id: data.userId,
        email: data.username,
        role: data.role,
      };
    }

    const normalized = normalizeRole(profile.role || data.role, staffRole, profile.email || data.username || emailHint);
    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email || data.username || "User";

    const userObj = {
      id: profile.id || data.userId,
      userId: data.userId || profile.id,
      email: profile.email || data.username || emailHint,
      name: fullName,
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
      role: normalized,
      backendRole: data.role || profile.role,
      staffRole,
      token,
      avatar: profile.profileImage || null,
      profileImage: profile.profileImage || null,
    };

    setUser(userObj);
    localStorage.setItem("dentaflow-user", JSON.stringify(userObj));
    return { success: true, redirect: getDashboardPath(normalized), user: userObj };
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      return await initUserSession(data, email);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        (error.code === "ERR_NETWORK"
          ? "Cannot connect to server. Ensure backend is running on port 8080."
          : "Invalid email or password");
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (payload) => {
    setLoading(true);
    try {
      const data = await authApi.googleAuth(payload);
      return await initUserSession(data, data.username);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        (error.code === "ERR_NETWORK"
          ? "Cannot connect to server. Ensure backend is running on port 8080."
          : "Google authentication failed. Please try again.");
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = async (token) => {
    setLoading(true);
    try {
      localStorage.setItem("dentaflow-token", token);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const profile = await authApi.getMe();
      return await initUserSession({
        token,
        userId: profile.id,
        username: profile.email,
        role: profile.role,
      }, profile.email);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Authentication failed. Please log in again.";
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const nameParts = (data.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "Patient";

      let backendRole = (data.role || "PATIENT").trim().toUpperCase();
      if (backendRole.startsWith("ROLE_")) backendRole = backendRole.slice(5);
      if (backendRole === "DOCTOR") backendRole = "DENTIST";

      const payload = {
        firstName,
        lastName,
        email: data.email?.trim().toLowerCase(),
        phone: data.phone?.trim() || "",
        password: data.password,
        role: backendRole,
        verificationToken: data.verificationToken,
        otp: data.otp,
      };

      const result = await authApi.register(payload);
      return { success: true, user: result, redirect: "/login" };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        (error.code === "ERR_NETWORK"
          ? "Cannot connect to server. Ensure backend is running on port 8080."
          : "Registration failed. Please check your information.");
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("dentaflow-token");
    localStorage.removeItem("dentaflow-user");
    delete apiClient.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("dentaflow-user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        loginWithToken,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
