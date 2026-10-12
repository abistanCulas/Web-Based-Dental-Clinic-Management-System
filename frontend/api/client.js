import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

const initialToken = typeof window !== "undefined" ? localStorage.getItem("dentaflow-token") : null;
if (initialToken) {
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

// Request interceptor: automatically attach JWT Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("dentaflow-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token expiration or unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthLogin = error.config?.url?.includes("/auth/login");
      if (!isAuthLogin) {
        localStorage.removeItem("dentaflow-token");
        localStorage.removeItem("dentaflow-user");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
