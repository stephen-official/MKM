import React, { useState, useEffect } from 'react';
import { api } from '../api'; 
import { toast } from 'react-hot-toast';

const AuthPage = () => {
  const [mode, setMode] = useState("login"); // 'login', 'register', or 'forgot'
  const [godowns, setGodowns] = useState([]);
  const [formData, setFormData] = useState({ 
    name: "", email: "", password: "", role: "user", godownId: "" 
  });
  const [resetData, setResetData] = useState({ email: "", token: "", newPassword: "" });

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





