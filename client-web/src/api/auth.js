// import axios from 'axios';

// const API = axios.create({ baseURL: 'http://localhost:5000/api/auth' }); // Adjust to your backend port

// export const fetchGodowns = () => API.get('/register-godowns');
// export const registerUser = (data) => API.post('/register', data);
// export const loginUser = (data) => API.post('/login', data);
// export const forgotPassword = (email) => API.post('/forgot-password', { email });





import { api } from '../api'; // Go up to src/api.js

export const fetchGodowns = () => api.get('/auth/register-godowns');
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });