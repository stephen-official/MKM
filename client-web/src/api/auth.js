import { api } from '../api'; // Go up to src/api.js

export const fetchGodowns = () => api.get('/auth/register-godowns');
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });