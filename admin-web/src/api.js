// import axios from "axios";

// const API_BASE = "http://localhost:5000/api";

// export const api = axios.create({
//   baseURL: API_BASE
// });

// export const setAuthToken = (token) => {
//   if (token) {
//     api.defaults.headers.common.Authorization = `Bearer ${token}`;
//     localStorage.setItem("accessToken", token);
//   } else {
//     delete api.defaults.headers.common.Authorization;
//     localStorage.removeItem("accessToken");
//   }
// };

// const storedToken = localStorage.getItem("accessToken");
// if (storedToken) setAuthToken(storedToken);





import axios from "axios";

// Use the variable from Vercel/Env, or fallback to localhost for development
// Note: VITE_API_URL should be added to your Vercel Environment Variables
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE,
});

/**
 * Sets the Authorization header for all axios requests and manages localStorage.
 * @param {string|null} token - The JWT token or null to clear it.
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("accessToken", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("accessToken");
  }
};

// Automatically set the token on initial load if it exists in storage
const storedToken = localStorage.getItem("accessToken");
if (storedToken) {
  setAuthToken(storedToken);
}

export default api;