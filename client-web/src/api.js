// // // // // // // import axios from "axios";

// // // // // // // export const api = axios.create({
// // // // // // //   // Make sure this matches your Backend URL
// // // // // // //   baseURL: "http://localhost:5000/api", 
// // // // // // // });



// // // // // // import axios from 'axios';

// // // // // // export const api = axios.create({ 
// // // // // //   baseURL: 'http://localhost:5000/api' 
// // // // // // });

// // // // // // // Add an interceptor here later if you need to send JWT Tokens!




// // // // // import axios from "axios";

// // // // // export const api = axios.create({
// // // // //   baseURL: "http://localhost:5000/api",
// // // // // });

// // // // // // Add a request interceptor to include the token
// // // // // api.interceptors.request.use(
// // // // //   (config) => {
// // // // //     const token = localStorage.getItem("token"); // Ensure your Login.jsx saves it here
// // // // //     if (token) {
// // // // //       config.headers.Authorization = `Bearer ${token}`;
// // // // //     }
// // // // //     return config;
// // // // //   },
// // // // //   (error) => {
// // // // //     return Promise.reject(error);
// // // // //   }
// // // // // );






// // // // import axios from "axios";

// // // // export const api = axios.create({
// // // //   baseURL: "http://localhost:5000/api",
// // // // });

// // // // // Interceptor to attach the token to every outgoing request
// // // // api.interceptors.request.use(
// // // //   (config) => {
// // // //     const token = localStorage.getItem("token"); 
// // // //     if (token) {
// // // //       config.headers.Authorization = `Bearer ${token}`;
// // // //     }
// // // //     return config;
// // // //   },
// // // //   (error) => Promise.reject(error)
// // // // );




// // // import axios from "axios";

// // // export const api = axios.create({
// // //   baseURL: "http://localhost:5000/api",
// // //   withCredentials: true, // MANDATORY for Socket.io and Auth sync
// // // });

// // // api.interceptors.request.use(
// // //   (config) => {
// // //     const token = localStorage.getItem("token"); 
// // //     if (token) {
// // //       config.headers.Authorization = `Bearer ${token}`;
// // //     }
// // //     return config;
// // //   },
// // //   (error) => Promise.reject(error)
// // // );







// // import axios from "axios";

// // export const api = axios.create({
// //   // Use the environment variable, fallback to localhost for development
// //   baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
// //   withCredentials: true, 
// // });

// // api.interceptors.request.use(
// //   (config) => {
// //     const token = localStorage.getItem("token"); 
// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //     return config;
// //   },
// //   (error) => Promise.reject(error)
// // );







// import axios from "axios";

// // Detect environment
// const isProd = import.meta.env.PROD;

// // Use correct base URL
// const BASE_URL = isProd
//   ? "https://mkm-backend-xr78.onrender.com/api"   // 👈 CHANGE THIS
//   : "http://localhost:5000/api";

// export const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || BASE_URL,
//   withCredentials: true,
// });

// // Attach token
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );




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