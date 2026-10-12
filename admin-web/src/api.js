import axios from "axios";

// VITE_API_URL is set per environment (Vercel / .env); localhost is the dev fallback.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL: API_BASE });

const KEYS = { access: "accessToken", refresh: "refreshToken", role: "userRole" };

/** Fired on window when the session can no longer be renewed. */
export const SESSION_EXPIRED_EVENT = "mkm:session-expired";

const applyToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

export const setSession = ({ accessToken, refreshToken, role }) => {
  applyToken(accessToken);
  localStorage.setItem(KEYS.access, accessToken);
  if (refreshToken) localStorage.setItem(KEYS.refresh, refreshToken);
  if (role) localStorage.setItem(KEYS.role, role);
};

export const clearSession = () => {
  applyToken(null);
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
};

/** Revokes the refresh token server-side when possible, then forgets the session locally. */
export const logout = async () => {
  try {
    if (localStorage.getItem(KEYS.access)) await api.post("/auth/logout");
  } catch {
    // Best effort: an expired or offline session is still cleared locally.
  } finally {
    clearSession();
  }
};

// Kept for callers that only set or clear the access token.
export const setAuthToken = (token) => (token ? setSession({ accessToken: token }) : clearSession());

const stored = localStorage.getItem(KEYS.access);
if (stored) applyToken(stored);

// One refresh at a time: concurrent 401s wait on the same request.
let refreshing = null;
const refreshAccessToken = () => {
  const refreshToken = localStorage.getItem(KEYS.refresh);
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));
  refreshing ??= axios
    .post(`${API_BASE}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = config?.url?.startsWith("/auth/");
    if (response?.status !== 401 || !config || config._retried || isAuthCall) throw error;

    config._retried = true;
    try {
      const token = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw error;
    }
  }
);

export default api;
