// // // // // // // // import { useState } from 'react'
// // // // // // // // import reactLogo from './assets/react.svg'
// // // // // // // // import viteLogo from './assets/vite.svg'
// // // // // // // // import heroImg from './assets/hero.png'
// // // // // // // // import './App.css'

// // // // // // // // function App() {
// // // // // // // //   const [count, setCount] = useState(0)

// // // // // // // //   return (
// // // // // // // //     <>
// // // // // // // //       <section id="center">
// // // // // // // //         <div className="hero">
// // // // // // // //           <img src={heroImg} className="base" width="170" height="179" alt="" />
// // // // // // // //           <img src={reactLogo} className="framework" alt="React logo" />
// // // // // // // //           <img src={viteLogo} className="vite" alt="Vite logo" />
// // // // // // // //         </div>
// // // // // // // //         <div>
// // // // // // // //           <h1>Get started</h1>
// // // // // // // //           <p>
// // // // // // // //             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
// // // // // // // //           </p>
// // // // // // // //         </div>
// // // // // // // //         <button
// // // // // // // //           className="counter"
// // // // // // // //           onClick={() => setCount((count) => count + 1)}
// // // // // // // //         >
// // // // // // // //           Count is {count}
// // // // // // // //         </button>
// // // // // // // //       </section>

// // // // // // // //       <div className="ticks"></div>

// // // // // // // //       <section id="next-steps">
// // // // // // // //         <div id="docs">
// // // // // // // //           <svg className="icon" role="presentation" aria-hidden="true">
// // // // // // // //             <use href="/icons.svg#documentation-icon"></use>
// // // // // // // //           </svg>
// // // // // // // //           <h2>Documentation</h2>
// // // // // // // //           <p>Your questions, answered</p>
// // // // // // // //           <ul>
// // // // // // // //             <li>
// // // // // // // //               <a href="https://vite.dev/" target="_blank">
// // // // // // // //                 <img className="logo" src={viteLogo} alt="" />
// // // // // // // //                 Explore Vite
// // // // // // // //               </a>
// // // // // // // //             </li>
// // // // // // // //             <li>
// // // // // // // //               <a href="https://react.dev/" target="_blank">
// // // // // // // //                 <img className="button-icon" src={reactLogo} alt="" />
// // // // // // // //                 Learn more
// // // // // // // //               </a>
// // // // // // // //             </li>
// // // // // // // //           </ul>
// // // // // // // //         </div>
// // // // // // // //         <div id="social">
// // // // // // // //           <svg className="icon" role="presentation" aria-hidden="true">
// // // // // // // //             <use href="/icons.svg#social-icon"></use>
// // // // // // // //           </svg>
// // // // // // // //           <h2>Connect with us</h2>
// // // // // // // //           <p>Join the Vite community</p>
// // // // // // // //           <ul>
// // // // // // // //             <li>
// // // // // // // //               <a href="https://github.com/vitejs/vite" target="_blank">
// // // // // // // //                 <svg
// // // // // // // //                   className="button-icon"
// // // // // // // //                   role="presentation"
// // // // // // // //                   aria-hidden="true"
// // // // // // // //                 >
// // // // // // // //                   <use href="/icons.svg#github-icon"></use>
// // // // // // // //                 </svg>
// // // // // // // //                 GitHub
// // // // // // // //               </a>
// // // // // // // //             </li>
// // // // // // // //             <li>
// // // // // // // //               <a href="https://chat.vite.dev/" target="_blank">
// // // // // // // //                 <svg
// // // // // // // //                   className="button-icon"
// // // // // // // //                   role="presentation"
// // // // // // // //                   aria-hidden="true"
// // // // // // // //                 >
// // // // // // // //                   <use href="/icons.svg#discord-icon"></use>
// // // // // // // //                 </svg>
// // // // // // // //                 Discord
// // // // // // // //               </a>
// // // // // // // //             </li>
// // // // // // // //             <li>
// // // // // // // //               <a href="https://x.com/vite_js" target="_blank">
// // // // // // // //                 <svg
// // // // // // // //                   className="button-icon"
// // // // // // // //                   role="presentation"
// // // // // // // //                   aria-hidden="true"
// // // // // // // //                 >
// // // // // // // //                   <use href="/icons.svg#x-icon"></use>
// // // // // // // //                 </svg>
// // // // // // // //                 X.com
// // // // // // // //               </a>
// // // // // // // //             </li>
// // // // // // // //             <li>
// // // // // // // //               <a href="https://bsky.app/profile/vite.dev" target="_blank">
// // // // // // // //                 <svg
// // // // // // // //                   className="button-icon"
// // // // // // // //                   role="presentation"
// // // // // // // //                   aria-hidden="true"
// // // // // // // //                 >
// // // // // // // //                   <use href="/icons.svg#bluesky-icon"></use>
// // // // // // // //                 </svg>
// // // // // // // //                 Bluesky
// // // // // // // //               </a>
// // // // // // // //             </li>
// // // // // // // //           </ul>
// // // // // // // //         </div>
// // // // // // // //       </section>

// // // // // // // //       <div className="ticks"></div>
// // // // // // // //       <section id="spacer"></section>
// // // // // // // //     </>
// // // // // // // //   )
// // // // // // // // }

// // // // // // // // export default App





// // // // // // // import { useState } from 'react'
// // // // // // // import reactLogo from './assets/react.svg'
// // // // // // // import viteLogo from './assets/vite.svg'
// // // // // // // import heroImg from './assets/hero.png'
// // // // // // // import './App.css'
// // // // // // // // Integrated: Import the real-time notification hook
// // // // // // // import { useNotifications } from './hooks/useNotifications'
// // // // // // // import { Toaster } from 'react-hot-toast' // Recommended for the pop-up alerts

// // // // // // // /**
// // // // // // //  * AppContent Component
// // // // // // //  * This wrapper ensures the Socket.io listeners stay active 
// // // // // // //  * regardless of which "section" or "route" the user is on.
// // // // // // //  */
// // // // // // // function AppContent() {
// // // // // // //   // Integrated: Start real-time listeners for low stock and requests
// // // // // // //   useNotifications();

// // // // // // //   const [count, setCount] = useState(0)

// // // // // // //   return (
// // // // // // //     <div className="app-container">
// // // // // // //       {/* Toast container to display the real-time alerts visually */}
// // // // // // //       <Toaster position="top-right" reverseOrder={false} />

// // // // // // //       <section id="center">
// // // // // // //         <div className="hero">
// // // // // // //           <img src={heroImg} className="base" width="170" height="179" alt="" />
// // // // // // //           <img src={reactLogo} className="framework" alt="React logo" />
// // // // // // //           <img src={viteLogo} className="vite" alt="Vite logo" />
// // // // // // //         </div>
// // // // // // //         <div>
// // // // // // //           <h1>Get started</h1>
// // // // // // //           <p>
// // // // // // //             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //         <button
// // // // // // //           className="counter"
// // // // // // //           onClick={() => setCount((count) => count + 1)}
// // // // // // //         >
// // // // // // //           Count is {count}
// // // // // // //         </button>
// // // // // // //       </section>

// // // // // // //       <div className="ticks"></div>

// // // // // // //       <section id="next-steps">
// // // // // // //         <div id="docs">
// // // // // // //           <svg className="icon" role="presentation" aria-hidden="true">
// // // // // // //             <use href="/icons.svg#documentation-icon"></use>
// // // // // // //           </svg>
// // // // // // //           <h2>Documentation</h2>
// // // // // // //           <p>Your questions, answered</p>
// // // // // // //           <ul>
// // // // // // //             <li>
// // // // // // //               <a href="https://vite.dev/" target="_blank" rel="noreferrer">
// // // // // // //                 <img className="logo" src={viteLogo} alt="" />
// // // // // // //                 Explore Vite
// // // // // // //               </a>
// // // // // // //             </li>
// // // // // // //             <li>
// // // // // // //               <a href="https://react.dev/" target="_blank" rel="noreferrer">
// // // // // // //                 <img className="button-icon" src={reactLogo} alt="" />
// // // // // // //                 Learn more
// // // // // // //               </a>
// // // // // // //             </li>
// // // // // // //           </ul>
// // // // // // //         </div>
// // // // // // //         <div id="social">
// // // // // // //           <svg className="icon" role="presentation" aria-hidden="true">
// // // // // // //             <use href="/icons.svg#social-icon"></use>
// // // // // // //           </svg>
// // // // // // //           <h2>Connect with us</h2>
// // // // // // //           <p>Join the Vite community</p>
// // // // // // //           <ul>
// // // // // // //             <li>
// // // // // // //               <a href="https://github.com/vitejs/vite" target="_blank" rel="noreferrer">
// // // // // // //                 <svg className="button-icon" role="presentation" aria-hidden="true">
// // // // // // //                   <use href="/icons.svg#github-icon"></use>
// // // // // // //                 </svg>
// // // // // // //                 GitHub
// // // // // // //               </a>
// // // // // // //             </li>
// // // // // // //             <li>
// // // // // // //               <a href="https://chat.vite.dev/" target="_blank" rel="noreferrer">
// // // // // // //                 <svg className="button-icon" role="presentation" aria-hidden="true">
// // // // // // //                   <use href="/icons.svg#discord-icon"></use>
// // // // // // //                 </svg>
// // // // // // //                 Discord
// // // // // // //               </a>
// // // // // // //             </li>
// // // // // // //             <li>
// // // // // // //               <a href="https://x.com/vite_js" target="_blank" rel="noreferrer">
// // // // // // //                 <svg className="button-icon" role="presentation" aria-hidden="true">
// // // // // // //                   <use href="/icons.svg#x-icon"></use>
// // // // // // //                 </svg>
// // // // // // //                 X.com
// // // // // // //               </a>
// // // // // // //             </li>
// // // // // // //             <li>
// // // // // // //               <a href="https://bsky.app/profile/vite.dev" target="_blank" rel="noreferrer">
// // // // // // //                 <svg className="button-icon" role="presentation" aria-hidden="true">
// // // // // // //                   <use href="/icons.svg#bluesky-icon"></use>
// // // // // // //                 </svg>
// // // // // // //                 Bluesky
// // // // // // //               </a>
// // // // // // //             </li>
// // // // // // //           </ul>
// // // // // // //         </div>
// // // // // // //       </section>

// // // // // // //       <div className="ticks"></div>
// // // // // // //       <section id="spacer"></section>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Main App Entry
// // // // // // //  * In a real project, you might wrap AppContent with an AuthProvider here
// // // // // // //  */
// // // // // // // function App() {
// // // // // // //   return (
// // // // // // //     <>
// // // // // // //       <AppContent />
// // // // // // //     </>
// // // // // // //   )
// // // // // // // }

// // // // // // // export default App




// // // // // // import React from 'react';
// // // // // // import { ClientStore } from './components/ClientStore'; // Adjust path if needed
// // // // // // import { Toaster } from 'react-hot-toast';

// // // // // // function App() {
// // // // // //   return (
// // // // // //     <>
// // // // // //       <Toaster position="top-center" />
// // // // // //       <ClientStore />
// // // // // //     </>
// // // // // //   );
// // // // // // }

// // // // // // export default App;





// // // // // import React from 'react';
// // // // // import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// // // // // import { ClientStore } from './components/ClientStore';
// // // // // import Login from './pages/Login'; 
// // // // // import { Toaster } from 'react-hot-toast';

// // // // // // Simple Guard Component
// // // // // const ProtectedRoute = ({ children }) => {
// // // // //   const token = localStorage.getItem('token');
// // // // //   return token ? children : <Navigate to="/login" />;
// // // // // };

// // // // // function App() {
// // // // //   return (
// // // // //     <Router>
// // // // //       <Toaster position="top-center" />
// // // // //       <Routes>
// // // // //         <Route path="/login" element={<Login />} />
        
// // // // //         {/* Only logged-in users can see the store */}
// // // // //         <Route 
// // // // //           path="/" 
// // // // //           element={
// // // // //             <ProtectedRoute>
// // // // //               <ClientStore />
// // // // //             </ProtectedRoute>
// // // // //           } 
// // // // //         />
        
// // // // //         {/* Catch-all: redirect to home */}
// // // // //         <Route path="*" element={<Navigate to="/" />} />
// // // // //       </Routes>
// // // // //     </Router>
// // // // //   );
// // // // // }

// // // // // export default App;





// // // // import React, { useEffect } from 'react';
// // // // import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// // // // import { ClientStore } from './components/ClientStore';
// // // // import Login from './pages/Login'; 
// // // // import { Toaster } from 'react-hot-toast';
// // // // import { socket } from './socket'; // Ensure you have a central socket export
// // // // import { jwtDecode } from 'jwt-decode';

// // // // // Simple Guard Component
// // // // const ProtectedRoute = ({ children }) => {
// // // //   const token = localStorage.getItem('token');
// // // //   return token ? children : <Navigate to="/login" />;
// // // // };

// // // // function App() {
// // // //   useEffect(() => {
// // // //     const token = localStorage.getItem('token');
    
// // // //     if (token) {
// // // //       try {
// // // //         const user = jwtDecode(token);
        
// // // //         // Connect and Join Room logic
// // // //         if (user && user.godownId) {
// // // //           socket.connect(); // Ensure socket is connected
          
// // // //           // Emit join-godown so this client receives targeted low-stock alerts
// // // //           socket.emit("join-godown", user.godownId);
          
// // // //           // If the user is an admin, join the admins room as well
// // // //           if (user.role === 'admin') {
// // // //             socket.emit("join-godown", "admins");
// // // //           }
          
// // // //           console.log(`Connected to socket. Joined room: ${user.godownId}`);
// // // //         }
// // // //       } catch (error) {
// // // //         console.error("Invalid token on socket initialization", error);
// // // //         localStorage.removeItem('token');
// // // //       }
// // // //     }

// // // //     return () => {
// // // //       socket.disconnect(); // Clean up on unmount
// // // //     };
// // // //   }, []);

// // // //   return (
// // // //     <Router>
// // // //       {/* Toast notifications for real-time alerts and success messages */}
// // // //       <Toaster 
// // // //         position="top-center" 
// // // //         toastOptions={{
// // // //           duration: 3000,
// // // //           style: {
// // // //             background: '#333',
// // // //             color: '#fff',
// // // //             fontSize: '12px',
// // // //             fontWeight: 'bold'
// // // //           }
// // // //         }} 
// // // //       />
      
// // // //       <Routes>
// // // //         <Route path="/login" element={<Login />} />
        
// // // //         {/* Protected Storefront */}
// // // //         <Route 
// // // //           path="/" 
// // // //           element={
// // // //             <ProtectedRoute>
// // // //               <ClientStore />
// // // //             </ProtectedRoute>
// // // //           } 
// // // //         />
        
// // // //         {/* Catch-all: redirect to home */}
// // // //         <Route path="*" element={<Navigate to="/" />} />
// // // //       </Routes>
// // // //     </Router>
// // // //   );
// // // // }

// // // // export default App;





// // // import React, { useEffect } from 'react';
// // // import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// // // import { Toaster } from 'react-hot-toast';

// // // // Updated Imports
// // // import { socket } from "./socket"; 
// // // import { jwtDecode } from "jwt-decode";

// // // // Component Imports
// // // import { ClientStore } from './components/ClientStore';
// // // import Login from './pages/Login'; 

// // // /**
// // //  * ProtectedRoute Guard
// // //  * Checks for a valid token in localStorage before allowing access to the store.
// // //  */
// // // const ProtectedRoute = ({ children }) => {
// // //   const token = localStorage.getItem('token');
// // //   return token ? children : <Navigate to="/login" />;
// // // };

// // // function App() {
// // //   useEffect(() => {
// // //     const token = localStorage.getItem('token');
    
// // //     if (token) {
// // //       try {
// // //         // Decode the token to get user details (godownId and role)
// // //         const user = jwtDecode(token);
        
// // //         if (user && user.godownId) {
// // //           // 1. Establish the physical connection
// // //           socket.connect(); 
          
// // //           // 2. Join the specific Godown room for targeted low-stock alerts
// // //           socket.emit("join-godown", user.godownId);
          
// // //           // 3. If the user is an admin, join the global admin room
// // //           if (user.role === 'admin') {
// // //             socket.emit("join-godown", "admins");
// // //           }
          
// // //           console.log(`Socket Active: Joined Godown Room ${user.godownId}`);
// // //         }
// // //       } catch (error) {
// // //         console.error("Auth Error: Socket initialization failed", error);
// // //         // Clear corrupt tokens
// // //         localStorage.removeItem('token');
// // //       }
// // //     }

// // //     // Cleanup: Disconnect socket when the app unmounts to prevent duplicate listeners
// // //     return () => {
// // //       socket.disconnect();
// // //     };
// // //   }, []);

// // //   return (
// // //     <Router>
// // //       {/* Real-time Notification Overlay */}
// // //       <Toaster 
// // //         position="top-center" 
// // //         toastOptions={{
// // //           duration: 3000,
// // //           style: {
// // //             background: '#1A1A1A',
// // //             color: '#FFFFFF',
// // //             fontSize: '12px',
// // //             fontWeight: '900',
// // //             borderRadius: '12px',
// // //             textTransform: 'uppercase',
// // //             letterSpacing: '0.05em'
// // //           }
// // //         }} 
// // //       />
      
// // //       <Routes>
// // //         {/* Authentication Route */}
// // //         <Route path="/login" element={<Login />} />
        
// // //         {/* Main Storefront - Protected by Auth Guard */}
// // //         <Route 
// // //           path="/" 
// // //           element={
// // //             <ProtectedRoute>
// // //               <ClientStore />
// // //             </ProtectedRoute>
// // //           } 
// // //         />
        
// // //         {/* Wildcard: Redirect any unknown paths to the main store */}
// // //         <Route path="*" element={<Navigate to="/" />} />
// // //       </Routes>
// // //     </Router>
// // //   );
// // // }

// // // export default App;







// // import React, { useEffect } from 'react';
// // import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// // import { Toaster } from 'react-hot-toast';
// // import { io } from "socket.io-client"; // Added socket.io-client import
// // import { jwtDecode } from "jwt-decode";

// // // Component Imports
// // import { ClientStore } from './components/ClientStore';
// // import Login from './pages/Login'; 

// // /**
// //  * SOCKET CONFIGURATION
// //  * withCredentials: true is mandatory to fix the 'Access-Control-Allow-Credentials' error
// //  * autoConnect: false prevents connection before we have a valid token
// //  */
// // export const socket = io("http://localhost:5000", {
// //   withCredentials: true, 
// //   autoConnect: false,
// //   transports: ['polling', 'websocket'] // Ensures compatibility if one fails
// // });

// // /**
// //  * ProtectedRoute Guard
// //  * Checks for a valid token in localStorage before allowing access to the store.
// //  */
// // const ProtectedRoute = ({ children }) => {
// //   const token = localStorage.getItem('token');
// //   return token ? children : <Navigate to="/login" />;
// // };

// // function App() {
// //   useEffect(() => {
// //     const token = localStorage.getItem('token');
    
// //     if (token) {
// //       try {
// //         // Decode the token to get user details (godownId and role)
// //         const user = jwtDecode(token);
        
// //         if (user && (user.godownId || user.role === 'admin')) {
// //           // 1. Establish the physical connection with credentials enabled
// //           socket.connect(); 
          
// //           socket.on("connect", () => {
// //             console.log("✅ Socket Connected to Backend");

// //             // 2. Join the specific Godown room for targeted alerts
// //             if (user.godownId) {
// //               socket.emit("join-godown", user.godownId);
// //               console.log(`📡 Joined Godown Room: ${user.godownId}`);
// //             }
            
// //             // 3. If the user is an admin, join the global admin room
// //             if (user.role === 'admin') {
// //               socket.emit("join-admin"); // Changed to join-admin to match your backend logic
// //               console.log("🛡️ Joined Admin Room");
// //             }
// //           });

// //           // Handle potential connection errors
// //           socket.on("connect_error", (err) => {
// //             console.error("❌ Socket Connection Error:", err.message);
// //           });
// //         }
// //       } catch (error) {
// //         console.error("Auth Error: Socket initialization failed", error);
// //         localStorage.removeItem('token');
// //       }
// //     }

// //     // Cleanup: Disconnect and remove listeners to prevent memory leaks
// //     return () => {
// //       socket.off("connect");
// //       socket.off("connect_error");
// //       socket.disconnect();
// //     };
// //   }, []);

// //   return (
// //     <Router>
// //       {/* Real-time Notification Overlay */}
// //       <Toaster 
// //         position="top-center" 
// //         toastOptions={{
// //           duration: 3000,
// //           style: {
// //             background: '#1A1A1A',
// //             color: '#FFFFFF',
// //             fontSize: '12px',
// //             fontWeight: '900',
// //             borderRadius: '12px',
// //             textTransform: 'uppercase',
// //             letterSpacing: '0.05em'
// //           }
// //         }} 
// //       />
      
// //       <Routes>
// //         <Route path="/login" element={<Login />} />
        
// //         <Route 
// //           path="/" 
// //           element={
// //             <ProtectedRoute>
// //               <ClientStore />
// //             </ProtectedRoute>
// //           } 
// //         />
        
// //         <Route path="*" element={<Navigate to="/" />} />
// //       </Routes>
// //     </Router>
// //   );
// // }

// // export default App;






// import React, { useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { Toaster } from 'react-hot-toast';
// import { io } from "socket.io-client";
// import { jwtDecode } from "jwt-decode";
// import { ClientStore } from './components/ClientStore';
// import Login from './pages/Login'; 

// export const socket = io("http://localhost:5000", {
//   withCredentials: true, 
//   autoConnect: false,
//   transports: ['polling', 'websocket']
// });

// const ProtectedRoute = ({ children }) => {
//   const token = localStorage.getItem('token');
//   return token ? children : <Navigate to="/login" />;
// };

// function App() {
//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       try {
//         const user = jwtDecode(token);
//         if (user && (user.godownId || user.role === 'admin')) {
//           socket.connect(); 
//           socket.on("connect", () => {
//             if (user.godownId) socket.emit("join-godown", user.godownId);
//             if (user.role === 'admin') socket.emit("join-admin");
//           });
//         }
//       } catch (error) {
//         localStorage.removeItem('token');
//       }
//     }
//     return () => socket.disconnect();
//   }, []);

//   return (
//     <Router>
//       <Toaster position="top-center" />
//       <Routes>
//         <Route path="/login" element={<Login />} />
//         <Route path="/" element={<ProtectedRoute><ClientStore /></ProtectedRoute>} />
//         <Route path="*" element={<Navigate to="/" />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;







import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast'; // Import toast
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { ClientStore } from './components/ClientStore';
import Login from './pages/Login'; 

// Socket configuration
export const socket = io("http://localhost:5000", {
  withCredentials: true, 
  autoConnect: false,
  transports: ['polling', 'websocket']
});

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const user = jwtDecode(token);
        
        if (user && (user.godownId || user.role === 'admin')) {
          // 1. Establish connection
          socket.connect(); 

          socket.on("connect", () => {
            console.log("Connected to Socket Server");
            if (user.godownId) socket.emit("join-godown", user.godownId);
            if (user.role === 'admin') socket.emit("join-admin");
          });

          // 2. Global Listeners for Notifications
          socket.on("low_stock_alert", (data) => {
            toast.error(data.payload.message || "Low Stock Alert!", {
              duration: 5000,
              icon: '⚠️',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
                fontWeight: 'bold'
              }
            });
          });

          socket.on("request_approved", (data) => {
            toast.success("Inventory request approved! Stock updated.", {
              duration: 4000,
              icon: '✅'
            });
            // Note: If you want to refresh data automatically on specific pages, 
            // you might want to use a state management tool or a custom event.
          });

          socket.on("request_rejected", (data) => {
            toast.error("Your inventory request was rejected.", {
              icon: '❌'
            });
          });
        }
      } catch (error) {
        console.error("Auth/Socket Error:", error);
        localStorage.removeItem('token');
      }
    }

    // Cleanup on unmount or token change
    return () => {
      socket.off("connect");
      socket.off("low_stock_alert");
      socket.off("request_approved");
      socket.off("request_rejected");
      socket.disconnect();
    };
  }, []);

  return (
    <Router>
      {/* Toaster setup with global styles */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            fontFamily: 'sans-serif',
            fontSize: '14px',
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <ClientStore />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;