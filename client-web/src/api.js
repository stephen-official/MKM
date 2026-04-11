// // // // import axios from "axios";

// // // // export const api = axios.create({
// // // //   // Make sure this matches your Backend URL
// // // //   baseURL: "http://localhost:5000/api", 
// // // // });



// // // import axios from 'axios';

// // // export const api = axios.create({ 
// // //   baseURL: 'http://localhost:5000/api' 
// // // });

// // // // Add an interceptor here later if you need to send JWT Tokens!




// // import axios from "axios";

// // export const api = axios.create({
// //   baseURL: "http://localhost:5000/api",
// // });

// // // Add a request interceptor to include the token
// // api.interceptors.request.use(
// //   (config) => {
// //     const token = localStorage.getItem("token"); // Ensure your Login.jsx saves it here
// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //     return config;
// //   },
// //   (error) => {
// //     return Promise.reject(error);
// //   }
// // );






// import axios from "axios";

// export const api = axios.create({
//   baseURL: "http://localhost:5000/api",
// });

// // Interceptor to attach the token to every outgoing request
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

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // MANDATORY for Socket.io and Auth sync
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);