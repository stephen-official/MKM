import { jwtDecode } from "jwt-decode";

export const isAccessTokenValid = (token, now = Date.now()) => {
  if (!token) return false;
  try {
    const payload = jwtDecode(token);
    return typeof payload.exp === "number" && payload.exp * 1000 > now;
  } catch {
    return false;
  }
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("godownId");
};
