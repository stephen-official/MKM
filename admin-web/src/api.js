import axios from "axios";

const API_BASE = "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("accessToken", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("accessToken");
  }
};

const storedToken = localStorage.getItem("accessToken");
if (storedToken) setAuthToken(storedToken);
