import axios from "axios";

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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error("Auth Error: Redirecting to login or clearing session...");
      // You could handle logout logic here if the token expires
    }
    return Promise.reject(error);
  }
);