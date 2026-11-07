import { api } from '../api'; // Go up to src/api.js

export const loginUser = (data) => api.post('/auth/login', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });