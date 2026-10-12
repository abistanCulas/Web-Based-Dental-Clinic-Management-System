import apiClient from "./client";

/**
 * Normalizes backend role representation into one of the frontend dashboard roles:
 * - ADMIN -> "admin"
 * - DENTIST -> "doctor"
 * - PATIENT -> "patient"
 * - STAFF + Receptionist -> "receptionist"
 * - STAFF + Pharmacist -> "pharmacist"
 * - STAFF + Cashier -> "cashier"
 *
 * @param {string} rawRole - Backend role (e.g. "ADMIN", "DENTIST", "PATIENT", "STAFF", "CASHIER")
 * @param {string|null} staffRole - Sub-role from Staff entity (e.g. "RECEPTIONIST", "PHARMACIST", "CASHIER")
 * @returns {"admin"|"doctor"|"patient"|"receptionist"|"pharmacist"|"cashier"|"user"}
 */
export function normalizeRole(rawRole, staffRole = null, emailOrUsername = "") {
  if (!rawRole) return "cashier";

  let upperRole = String(rawRole).trim().toUpperCase();
  if (upperRole.startsWith("ROLE_")) {
    upperRole = upperRole.slice(5);
  }

  let upperStaff = staffRole ? String(staffRole).trim().toUpperCase() : "";
  if (upperStaff.startsWith("ROLE_")) {
    upperStaff = upperStaff.slice(5);
  }

  if (upperRole === "ADMIN") return "admin";
  if (upperRole === "DENTIST" || upperRole === "DOCTOR") return "doctor";
  if (upperRole === "PATIENT") return "patient";

  if (upperRole === "RECEPTIONIST" || upperStaff.includes("RECEPTION")) return "receptionist";
  if (upperRole === "PHARMACIST" || upperStaff.includes("PHARM")) return "pharmacist";
  if (upperRole === "CASHIER" || upperStaff.includes("CASHIER")) return "cashier";

  if (upperRole === "STAFF") {
    if (upperStaff) {
      if (upperStaff.includes("RECEPTION")) return "receptionist";
      if (upperStaff.includes("PHARM")) return "pharmacist";
      if (upperStaff.includes("CASHIER")) return "cashier";
      if (upperStaff.includes("ADMIN")) return "admin";
      // DO NOT map staff roles containing DOCTOR/DENTIST to "doctor"
      // This prevents cross-contamination between staff and doctor entities
    }

    const lower = String(emailOrUsername || "").toLowerCase();
    if (lower.includes("reception")) return "receptionist";
    if (lower.includes("pharm")) return "pharmacist";
    if (lower.includes("cashier")) return "cashier";

    return "receptionist";
  }

  // If role directly contains the staff sub-role name
  if (upperRole.includes("RECEPTION")) return "receptionist";
  if (upperRole.includes("PHARM")) return "pharmacist";
  if (upperRole.includes("CASHIER")) return "cashier";
  if (upperRole === "USER") return "user";

  // If already normalized lowercase
  const lower = String(rawRole).trim().toLowerCase();
  const validRoles = ["patient", "doctor", "admin", "receptionist", "pharmacist", "cashier", "user"];
  if (validRoles.includes(lower)) return lower;

  return lower;
}

/**
 * Decode JWT token payload
 * @param {string} token
 * @returns {object|null}
 */
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired or malformed
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() >= payload.exp * 1000;
}

export const authApi = {
  /**
   * Log in user with credentials
   * POST /api/auth/login
   * @param {string} usernameOrEmail
   * @param {string} password
   * @returns {Promise<{token: string, tokenType: string, userId: number, username: string, role: string}>}
   */
  async login(usernameOrEmail, password) {
    const response = await apiClient.post("/auth/login", {
      usernameOrEmail: usernameOrEmail.trim(),
      password,
    });
    return response.data;
  },

  /**
   * Register a new user
   * POST /api/auth/register
   * @param {object} data
   * @returns {Promise<object>}
   */
  async register(data) {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  /**
   * Get current authenticated user profile
   * GET /api/auth/me
   * @returns {Promise<object>}
   */
  async getMe() {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  /**
   * Retrieve staff details by user ID if available
   * GET /api/staff/user/{userId}
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async getStaffByUserId(userId) {
    try {
      const response = await apiClient.get(`/staff/user/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Change current user's password
   * POST /api/auth/change-password
   */
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Deactivate current user's account (Patient direct deactivation, Staff review request)
   * POST /api/auth/deactivate
   * @param {string} [reason]
   */
  async deactivateAccount(reason) {
    const response = await apiClient.post("/auth/deactivate", reason ? { reason } : {});
    return response.data;
  },

  /**
   * Request password reset OTP
   * POST /api/auth/forgot-password
   * @param {string} email
   */
  async forgotPassword(email) {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  /**
   * Verify OTP
   * POST /api/auth/verify-otp
   * @param {string} email
   * @param {string} otp
   */
  async verifyOtp(email, otp) {
    const response = await apiClient.post("/auth/verify-otp", { email, otp });
    return response.data;
  },

  /**
   * Reset password using verified resetToken
   * POST /api/auth/reset-password
   * @param {string} email
   * @param {string} resetToken
   * @param {string} newPassword
   */
  async resetPassword(email, resetToken, newPassword) {
    const response = await apiClient.post("/auth/reset-password", {
      email,
      resetToken,
      newPassword,
    });
    return response.data;
  },

  /**
   * Resend password reset OTP
   * POST /api/auth/resend-otp
   * @param {string} email
   */
  async resendOtp(email) {
    const response = await apiClient.post("/auth/resend-otp", { email });
    return response.data;
  },

  /**
   * Send registration OTP code to email
   * POST /api/auth/register/send-otp
   * @param {string} email
   */
  async sendRegistrationOtp(email) {
    const response = await apiClient.post("/auth/register/send-otp", {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  },

  /**
   * Resend registration OTP code
   * POST /api/auth/register/resend-otp
   * @param {string} email
   */
  async resendRegistrationOtp(email) {
    const response = await apiClient.post("/auth/register/resend-otp", {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  },

  /**
   * Verify registration OTP code and optionally complete registration
   * POST /api/auth/register/verify-otp
   * @param {object} data - { email, otp, firstName, lastName, phone, password, role }
   */
  async verifyRegistrationOtp(data) {
    const response = await apiClient.post("/auth/register/verify-otp", data);
    return response.data;
  },

  /**
   * Complete registration with verified token or verified OTP
   * POST /api/auth/register
   * @param {object} data
   */
  async completeRegistration(data) {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  /**
   * Authenticate with Google using authorization code or ID token
   * POST /api/auth/google
   * @param {{ code?: string, idToken?: string, redirectUri?: string, mode?: string }} payload
   * @returns {Promise<{token: string, tokenType: string, userId: number, username: string, role: string}>}
   */
  async googleAuth(payload) {
    const response = await apiClient.post("/auth/google", payload);
    return response.data;
  },

  /**
   * Fetch backend Google OAuth configuration
   * GET /api/auth/oauth2/google/config
   * @returns {Promise<{configured: boolean, clientId: string, redirectUri: string}>}
   */
  async getGoogleConfig() {
    try {
      const response = await apiClient.get("/auth/oauth2/google/config");
      return response.data;
    } catch {
      return { configured: false, clientId: "", redirectUri: "" };
    }
  },

  /**
   * Fetch Google OAuth authorization URL from backend
   * GET /api/auth/oauth2/google/url
   * @param {string} [redirectUri]
   * @param {string} [state]
   * @returns {Promise<{url: string}>}
   */
  async getGoogleAuthUrl(redirectUri, state) {
    const params = {};
    if (redirectUri) params.redirectUri = redirectUri;
    if (state) params.state = state;
    const response = await apiClient.get("/auth/oauth2/google/url", { params });
    return response.data;
  },
};

export default authApi;
