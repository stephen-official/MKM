// // // // // import React, { useState } from 'react';
// // // // // import { loginUser } from '../api/auth';
// // // // // import { Link, useNavigate } from 'react-router-dom';

// // // // // const Login = () => {
// // // // //   const [formData, setFormData] = useState({ email: '', password: '' });
// // // // //   const navigate = useNavigate();

// // // // //   const handleLogin = async (e) => {
// // // // //     e.preventDefault();
// // // // //     try {
// // // // //       const { data } = await loginUser(formData);
// // // // //       localStorage.setItem('token', data.accessToken);
// // // // //       localStorage.setItem('role', data.role);
// // // // //       navigate('/');
// // // // //     } catch (err) {
// // // // //       alert("Invalid Credentials");
// // // // //     }
// // // // //   };

// // // // //   return (
// // // // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
// // // // //       <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
// // // // //         <h2 className="text-2xl font-bold text-center mb-6">Kitchen Login</h2>
// // // // //         <form onSubmit={handleLogin} className="space-y-4">
// // // // //           <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" 
// // // // //             onChange={(e) => setFormData({...formData, email: e.target.value})} />
// // // // //           <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg" 
// // // // //             onChange={(e) => setFormData({...formData, password: e.target.value})} />
          
// // // // //           <div className="text-right">
// // // // //             <Link to="/forgot-password text-sm text-blue-500">Forgot Password?</Link>
// // // // //           </div>

// // // // //           <button className="w-full bg-green-600 text-white p-3 rounded-lg font-bold">Login</button>
// // // // //         </form>
// // // // //         <p className="mt-4 text-center text-sm">
// // // // //           Don't have an account? <Link to="/register" className="text-blue-600">Register</Link>
// // // // //         </p>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };




// // // // import React, { useState } from 'react';
// // // // import { Link, useNavigate } from 'react-router-dom';
// // // // import { api } from '../api'; // Use your centralized axios instance

// // // // const Login = () => {
// // // //   const [formData, setFormData] = useState({ email: '', password: '' });
// // // //   const [error, setError] = useState("");
// // // //   const navigate = useNavigate();

// // // //   const handleLogin = async (e) => {
// // // //     e.preventDefault();
// // // //     setError(""); // Clear previous errors
    
// // // //     try {
// // // //       // 1. UPDATED: Using the 'api' instance directly as requested
// // // //       const response = await api.post('/auth/login', formData);
      
// // // //       // 2. UPDATED: Key is now 'token' to match your interceptor
// // // //       // Ensure your backend sends back 'token' and 'role' in the response body
// // // //       localStorage.setItem('token', response.data.token); 
// // // //       localStorage.setItem('role', response.data.user.role); 

// // // //       // 3. Navigate to the store/dashboard after successful login
// // // //       navigate('/');
// // // //     } catch (err) {
// // // //       console.error("Login Error:", err);
// // // //       setError(err.response?.data?.message || "Invalid Credentials");
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
// // // //       <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
// // // //         <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Kitchen Login</h2>
// // // //         <p className="text-center text-sm text-gray-500 mb-6">Regional Inventory Portal</p>
        
// // // //         {error && (
// // // //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
// // // //             {error}
// // // //           </div>
// // // //         )}

// // // //         <form onSubmit={handleLogin} className="space-y-4">
// // // //           <div>
// // // //             <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
// // // //             <input 
// // // //               type="email" 
// // // //               placeholder="name@example.com" 
// // // //               className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
// // // //               required
// // // //               onChange={(e) => setFormData({...formData, email: e.target.value})} 
// // // //             />
// // // //           </div>

// // // //           <div>
// // // //             <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
// // // //             <input 
// // // //               type="password" 
// // // //               placeholder="••••••••" 
// // // //               className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
// // // //               required
// // // //               onChange={(e) => setFormData({...formData, password: e.target.value})} 
// // // //             />
// // // //           </div>
          
// // // //           <div className="text-right">
// // // //             <Link to="/forgot-password" size="sm" className="text-sm text-blue-500 hover:underline">
// // // //               Forgot Password?
// // // //             </Link>
// // // //           </div>

// // // //           <button 
// // // //             type="submit"
// // // //             className="w-full bg-green-600 text-white p-3 rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors"
// // // //           >
// // // //             Sign In
// // // //           </button>
// // // //         </form>

// // // //         <p className="mt-6 text-center text-sm text-gray-600">
// // // //           Don't have an account? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Register</Link>
// // // //         </p>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Login;





// // // import React, { useState } from 'react';
// // // import { Link, useNavigate } from 'react-router-dom';
// // // import { api } from '../api'; 

// // // const Login = () => {
// // //   const [formData, setFormData] = useState({ email: '', password: '' });
// // //   const [error, setError] = useState("");
// // //   const navigate = useNavigate();

// // //   const handleLogin = async (e) => {
// // //     e.preventDefault();
// // //     setError("");
// // //     try {
// // //       // Calling your backend login route
// // //       const { data } = await api.post('/auth/login', formData);
      
// // //       // CRITICAL FIX: Save as 'token' to match api.js interceptor
// // //       localStorage.setItem('token', data.accessToken);
// // //       localStorage.setItem('role', data.role);
// // //       localStorage.setItem('godownId', data.godownId);
      
// // //       navigate('/'); // Redirect to the store
// // //     } catch (err) {
// // //       setError(err.response?.data?.message || "Invalid Credentials");
// // //     }
// // //   };

// // //   return (
// // //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
// // //       <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
// // //         <h2 className="text-2xl font-bold text-center mb-6">Kitchen Login</h2>
// // //         {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
// // //         <form onSubmit={handleLogin} className="space-y-4">
// // //           <input 
// // //             type="email" 
// // //             placeholder="Email" 
// // //             className="w-full p-3 border rounded-lg" 
// // //             required
// // //             onChange={(e) => setFormData({...formData, email: e.target.value})} 
// // //           />
// // //           <input 
// // //             type="password" 
// // //             placeholder="Password" 
// // //             className="w-full p-3 border rounded-lg" 
// // //             required
// // //             onChange={(e) => setFormData({...formData, password: e.target.value})} 
// // //           />
// // //           <button className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition-colors">
// // //             Login
// // //           </button>
// // //         </form>
// // //         <p className="mt-4 text-center text-sm text-gray-500">
// // //           Don't have an account? <Link to="/register" className="text-blue-600">Register</Link>
// // //         </p>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Login;






// // import React, { useState } from 'react';
// // import { Link, useNavigate } from 'react-router-dom';
// // import { api } from '../api'; 

// // const Login = () => {
// //   const [formData, setFormData] = useState({ email: '', password: '' });
// //   const [error, setError] = useState("");
// //   const navigate = useNavigate();

// //   const handleLogin = async (e) => {
// //     e.preventDefault();
// //     setError("");
// //     try {
// //       const { data } = await api.post('/auth/login', formData);
      
// //       // Save data exactly as the app expects
// //       localStorage.setItem('token', data.accessToken);
// //       localStorage.setItem('role', data.role);
// //       localStorage.setItem('godownId', data.godownId);
      
// //       navigate('/'); 
// //     } catch (err) {
// //       setError(err.response?.data?.message || "Invalid Credentials");
// //     }
// //   };

// //   return (
// //     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
// //       <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
// //         <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Kitchen Login</h2>
// //         {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
// //         <form onSubmit={handleLogin} className="space-y-4">
// //           <input 
// //             type="email" 
// //             placeholder="Email Address" 
// //             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
// //             required
// //             onChange={(e) => setFormData({...formData, email: e.target.value})} 
// //           />
// //           <input 
// //             type="password" 
// //             placeholder="Password" 
// //             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
// //             required
// //             onChange={(e) => setFormData({...formData, password: e.target.value})} 
// //           />
// //           <button className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition-shadow shadow-md">
// //             Login to Store
// //           </button>
// //         </form>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Login;





import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api'; 
import { toast } from 'react-hot-toast';

const AuthPage = () => {
  const [mode, setMode] = useState("login"); // 'login', 'register', or 'forgot'
  const [godowns, setGodowns] = useState([]);
  const [formData, setFormData] = useState({ 
    name: "", email: "", password: "", role: "user", godownId: "" 
  });
  const [resetData, setResetData] = useState({ email: "", token: "", newPassword: "" });
  const navigate = useNavigate();

  // Fetch godowns only when switching to register mode
  useEffect(() => {
    if (mode === "register") {
      api.get("/auth/register-godowns")
        .then((res) => setGodowns(res.data))
        .catch(() => toast.error("Failed to load regional centers"));
    }
  }, [mode]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        const { data } = await api.post('/auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        
        // Save to storage
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('role', data.role);
        localStorage.setItem('godownId', data.godownId);
        
        toast.success("Welcome back!");

        // CRITICAL: Use window.location.href instead of navigate('/') 
        // to force a full reload. This ensures App.js connects to the Socket.
        window.location.href = "/"; 
        
      } else if (mode === "register") {
        await api.post('/auth/register', formData);
        toast.success("Account created! Please login.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      if (!resetData.token) {
        await api.post('/auth/forgot-password', { email: resetData.email });
        toast.success("Reset link sent to your email");
      } else {
        await api.post('/auth/reset-password', { 
          token: resetData.token, 
          newPassword: resetData.newPassword 
        });
        toast.success("Password updated!");
        setMode("login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {mode === "login" ? "Kitchen Login" : mode === "register" ? "Register Staff" : "Reset Password"}
        </h2>

        {/* Tab Switching */}
        <div className="flex border-b mb-6">
          <button 
            className={`flex-1 pb-2 text-sm font-medium ${mode === 'login' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
            onClick={() => setMode("login")}
          >Login</button>
          <button 
            className={`flex-1 pb-2 text-sm font-medium ${mode === 'register' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
            onClick={() => setMode("register")}
          >Register</button>
          <button 
            className={`flex-1 pb-2 text-sm font-medium ${mode === 'forgot' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
            onClick={() => setMode("forgot")}
          >Forgot</button>
        </div>

        {mode !== "forgot" ? (
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "register" && (
              <input 
                type="text" placeholder="Full Name" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
                required onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            )}
            <input 
              type="email" placeholder="Email Address" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
              required onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
            <input 
              type="password" placeholder="Password" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
              required onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
            
            {mode === "register" && (
              <select 
                className="w-full p-3 border rounded-lg bg-white outline-none"
                required onChange={(e) => setFormData({...formData, godownId: e.target.value})}
              >
                <option value="">Assign to Region/Godown</option>
                {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            )}

            <button className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition-colors">
              {mode === "login" ? "Login to Store" : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input 
              type="email" placeholder="Registered Email" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
              required onChange={(e) => setResetData({...resetData, email: e.target.value})} 
            />
            {/* Show these only if user has the token from their email */}
            <input 
              type="text" placeholder="Reset Token (from email)" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
              onChange={(e) => setResetData({...resetData, token: e.target.value})} 
            />
            <input 
              type="password" placeholder="New Password" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
              onChange={(e) => setResetData({...resetData, newPassword: e.target.value})} 
            />
            <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">
              {resetData.token ? "Update Password" : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;





