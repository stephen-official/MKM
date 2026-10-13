import axios from "axios";
import { toast } from "react-hot-toast";
import { clearSession } from "./utils/session";

/**
 * API Configuration
 * Priority: 
 * 1. Environment Variable (VITE_API_URL)
 * 2. Hardcoded Production Render URL
 */
const BASE_URL = import.meta.env.VITE_API_URL || "https://mkm-backend-xr78.onrender.com/api";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Request Interceptor: Attach JWT Token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Ensure the token is passed in the standard Bearer format
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Response Interceptor (Useful for handling 401/403 globally)
let refreshRequest = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && error.response.data?.code === "FEATURE_DISABLED") {
      const key = `mkm:feature-toast:${error.response.data.feature}`;
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          toast.error("This feature is currently disabled for your kitchen.");
        }
      } catch { /* storage unavailable: skip the toast rather than break the request flow */ }
    }
    const refreshToken = localStorage.getItem("refreshToken");
    if (error.response?.status === 401 && refreshToken && !originalRequest?._retried && !originalRequest?.url?.includes("/auth/")) {
      originalRequest._retried = true;
      try {
        refreshRequest ||= axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { data } = await refreshRequest;
        localStorage.setItem("token", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        clearSession();
        if (window.location.pathname !== "/login") window.location.assign("/login");
      } finally {
        refreshRequest = null;
      }
    }
    return Promise.reject(error);
  }
);
