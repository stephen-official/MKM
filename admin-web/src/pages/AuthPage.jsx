// // import { useEffect, useState } from "react";
// // import { api, setAuthToken } from "../api.js";
// // import { useToast } from "../toast.jsx";

// // export const AuthPage = ({ onLogin }) => {
// //   const { showToast } = useToast();
// //   const [mode, setMode] = useState("login");
// //   const [godowns, setGodowns] = useState([]);
// //   const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", godownId: "" });
// //   const [forgotEmail, setForgotEmail] = useState("");
// //   const [forgotToken, setForgotToken] = useState("");
// //   const [newPassword, setNewPassword] = useState("");
// //   const [message, setMessage] = useState("");

// //   useEffect(() => {
// //     if (mode === "register") {
// //       api.get("/auth/register-godowns").then((res) => setGodowns(res.data)).catch(() => setGodowns([]));
// //     }
// //   }, [mode]);

// //   const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

// //   const login = async () => {
// //     try {
// //       if (!form.email || !form.password) return showToast("Email and password are required", "error");
// //       const res = await api.post("/auth/login", { email: form.email, password: form.password });
// //       setAuthToken(res.data.accessToken);
// //       localStorage.setItem("userRole", res.data.role);
// //       showToast("Login successful", "success");
// //       onLogin({ role: res.data.role, godownId: res.data.godownId });
// //     } catch (error) {
// //       setMessage(error?.response?.data?.message || "Login failed");
// //       showToast(error?.response?.data?.message || "Login failed", "error");
// //     }
// //   };

// //   const register = async () => {
// //     try {
// //       if (!form.name || !form.email || !form.password) return showToast("Name, email and password are required", "error");
// //       if (form.role === "user" && !form.godownId) return showToast("Please select godown for user role", "error");
// //       await api.post("/auth/register", form);
// //       setMessage("Registration successful. Please login.");
// //       showToast("Registration successful", "success");
// //       setMode("login");
// //     } catch (error) {
// //       setMessage(error?.response?.data?.message || "Registration failed");
// //       showToast(error?.response?.data?.message || "Registration failed", "error");
// //     }
// //   };

// //   const forgot = async () => {
// //     try {
// //       const res = await api.post("/auth/forgot-password", { email: forgotEmail });
// //       setMessage(`Reset token generated: ${res.data.token || "Check email flow"}`);
// //     } catch (error) {
// //       setMessage(error?.response?.data?.message || "Failed to generate token");
// //       showToast(error?.response?.data?.message || "Failed to generate token", "error");
// //     }
// //   };

// //   const resetPassword = async () => {
// //     try {
// //       await api.post("/auth/reset-password", { token: forgotToken, newPassword });
// //       setMessage("Password reset successful.");
// //       showToast("Password reset successful", "success");
// //       setMode("login");
// //     } catch (error) {
// //       setMessage(error?.response?.data?.message || "Reset failed");
// //       showToast(error?.response?.data?.message || "Reset failed", "error");
// //     }
// //   };

// //   return (
// //     <div className="auth-wrap">
// //       <h1>Inventory Login</h1>
// //       <div className="auth-tabs">
// //         <button onClick={() => setMode("login")} className={mode === "login" ? "tab-active" : ""}>Login</button>
// //         <button onClick={() => setMode("register")} className={mode === "register" ? "tab-active" : ""}>Register</button>
// //         <button onClick={() => setMode("forgot")} className={mode === "forgot" ? "tab-active" : ""}>Forgot Password</button>
// //       </div>
// //       {mode !== "forgot" && (
// //         <>
// //           {mode === "register" && <input placeholder="Name" value={form.name} onChange={(e) => onChange("name", e.target.value)} />}
// //           <input placeholder="Email" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
// //           <input placeholder="Password" type="password" value={form.password} onChange={(e) => onChange("password", e.target.value)} />
// //           {mode === "register" && (
// //             <>
// //               <select value={form.role} onChange={(e) => onChange("role", e.target.value)}>
// //                 <option value="admin">Admin</option>
// //                 <option value="user">User</option>
// //               </select>
// //               {form.role === "user" && (
// //                 <select value={form.godownId} onChange={(e) => onChange("godownId", e.target.value)}>
// //                   <option value="">Select godown</option>
// //                   {godowns.map((g) => (
// //                     <option key={g._id} value={g._id}>{g.name}</option>
// //                   ))}
// //                 </select>
// //               )}
// //             </>
// //           )}
// //           <button onClick={mode === "login" ? login : register}>{mode === "login" ? "Login" : "Register"}</button>
// //         </>
// //       )}
// //       {mode === "forgot" && (
// //         <>
// //           <input placeholder="Registered email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
// //           <button onClick={forgot}>Generate Reset Token</button>
// //           <input placeholder="Reset token" value={forgotToken} onChange={(e) => setForgotToken(e.target.value)} />
// //           <input placeholder="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
// //           <button onClick={resetPassword}>Reset Password</button>
// //         </>
// //       )}
// //       <p>{message}</p>
// //     </div>
// //   );
// // };













// // 14









// import { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom"; // Added for URL token capture
// import { api, setAuthToken } from "../api.js";
// import { useToast } from "../toast.jsx";

// export const AuthPage = ({ onLogin, initialMode = "login" }) => {
//   const { showToast } = useToast();
//   const [searchParams] = useSearchParams();
  
//   // 1. Initialize mode from prop (allows deep linking to "reset")
//   const [mode, setMode] = useState(initialMode);
//   const [godowns, setGodowns] = useState([]);
//   const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", godownId: "" });
//   const [forgotEmail, setForgotEmail] = useState("");
  
//   // 2. Auto-fill token from URL if it exists
//   const [forgotToken, setForgotToken] = useState(searchParams.get("token") || "");
//   const [newPassword, setNewPassword] = useState("");
//   const [message, setMessage] = useState("");

//   useEffect(() => {
//     if (mode === "register") {
//       api.get("/auth/register-godowns")
//         .then((res) => setGodowns(res.data))
//         .catch(() => setGodowns([]));
//     }
    
//     // Switch to "forgot" mode automatically if a token is present in URL
//     if (searchParams.get("token")) {
//       setMode("forgot");
//     }
//   }, [mode, searchParams]);

//   const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

//   const login = async () => {
//     try {
//       if (!form.email || !form.password) return showToast("Email and password are required", "error");
//       const res = await api.post("/auth/login", { email: form.email, password: form.password });
//       setAuthToken(res.data.accessToken);
//       localStorage.setItem("userRole", res.data.role);
//       showToast("Login successful", "success");
//       onLogin({ role: res.data.role, godownId: res.data.godownId });
//     } catch (error) {
//       const errMsg = error?.response?.data?.message || "Login failed";
//       setMessage(errMsg);
//       showToast(errMsg, "error");
//     }
//   };

//   const register = async () => {
//     try {
//       if (!form.name || !form.email || !form.password) return showToast("Name, email and password are required", "error");
//       if (form.role === "user" && !form.godownId) return showToast("Please select godown for user role", "error");
//       await api.post("/auth/register", form);
//       setMessage("Registration successful. Please login.");
//       showToast("Registration successful", "success");
//       setMode("login");
//     } catch (error) {
//       const errMsg = error?.response?.data?.message || "Registration failed";
//       setMessage(errMsg);
//       showToast(errMsg, "error");
//     }
//   };

//   const forgot = async () => {
//     if (!forgotEmail) return showToast("Please enter your email", "error");
//     try {
//       const res = await api.post("/auth/forgot-password", { email: forgotEmail });
//       // Uses the actual success message from your backend logic
//       setMessage(res.data.message); 
//       showToast("Request sent successfully", "success");
//     } catch (error) {
//       const errMsg = error?.response?.data?.message || "Failed to generate token";
//       setMessage(errMsg);
//       showToast(errMsg, "error");
//     }
//   };

//   const resetPassword = async () => {
//     if (!forgotToken || !newPassword) return showToast("Token and new password are required", "error");
//     try {
//       await api.post("/auth/reset-password", { token: forgotToken, newPassword });
//       setMessage("Password reset successful. You can now login.");
//       showToast("Password reset successful", "success");
//       setMode("login");
//     } catch (error) {
//       const errMsg = error?.response?.data?.message || "Reset failed";
//       setMessage(errMsg);
//       showToast(errMsg, "error");
//     }
//   };

//   return (
//     <div className="auth-wrap">
//       <h1>Inventory Management</h1>
//       <div className="auth-tabs">
//         <button onClick={() => setMode("login")} className={mode === "login" ? "tab-active" : ""}>Login</button>
//         <button onClick={() => setMode("register")} className={mode === "register" ? "tab-active" : ""}>Register</button>
//         <button onClick={() => setMode("forgot")} className={mode === "forgot" ? "tab-active" : ""}>Forgot Password</button>
//       </div>

//       {mode !== "forgot" && (
//         <>
//           {mode === "register" && (
//             <input 
//               placeholder="Name" 
//               value={form.name} 
//               onChange={(e) => onChange("name", e.target.value)} 
//             />
//           )}
//           <input 
//             placeholder="Email" 
//             value={form.email} 
//             onChange={(e) => onChange("email", e.target.value)} 
//           />
//           <input 
//             placeholder="Password" 
//             type="password" 
//             value={form.password} 
//             onChange={(e) => onChange("password", e.target.value)} 
//           />
          
//           {mode === "register" && (
//             <>
//               <select value={form.role} onChange={(e) => onChange("role", e.target.value)}>
//                 <option value="admin">Admin</option>
//                 <option value="user">User</option>
//               </select>
//               {form.role === "user" && (
//                 <select value={form.godownId} onChange={(e) => onChange("godownId", e.target.value)}>
//                   <option value="">Select godown</option>
//                   {godowns.map((g) => (
//                     <option key={g._id} value={g._id}>{g.name}</option>
//                   ))}
//                 </select>
//               )}
//             </>
//           )}
//           <button onClick={mode === "login" ? login : register}>
//             {mode === "login" ? "Login" : "Register"}
//           </button>
//         </>
//       )}

//       {mode === "forgot" && (
//         <>
//           <div className="forgot-section">
//             <h3>Request Reset Link</h3>
//             <input 
//               placeholder="Registered email" 
//               value={forgotEmail} 
//               onChange={(e) => setForgotEmail(e.target.value)} 
//             />
//             <button onClick={forgot}>Send Email</button>
//           </div>

//           <hr style={{ margin: "20px 0", opacity: 0.3 }} />

//           <div className="reset-section">
//             <h3>Complete Reset</h3>
//             <input 
//               placeholder="Reset token (from email)" 
//               value={forgotToken} 
//               onChange={(e) => setForgotToken(e.target.value)} 
//             />
//             <input 
//               placeholder="New password" 
//               type="password" 
//               value={newPassword} 
//               onChange={(e) => setNewPassword(e.target.value)} 
//             />
//             <button onClick={resetPassword}>Reset Password</button>
//           </div>
//         </>
//       )}
      
//       {message && <p className="auth-message">{message}</p>}
//     </div>
//   );
// };













import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom"; 
import { api, setAuthToken } from "../api.js";
import { useToast } from "../toast.jsx";

export const AuthPage = ({ onLogin, initialMode = "login" }) => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState(initialMode);
  const [godowns, setGodowns] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", godownId: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  
  // Captures token from URL automatically if user clicked the email link
  const [forgotToken, setForgotToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode === "register") {
      api.get("/auth/register-godowns")
        .then((res) => setGodowns(res.data))
        .catch(() => setGodowns([]));
    }
    
    // If a token is in the URL, prioritize the 'forgot' (reset) view
    if (searchParams.get("token")) {
      setMode("forgot");
    }
  }, [mode, searchParams]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const login = async () => {
    try {
      if (!form.email || !form.password) return showToast("Email and password are required", "error");
      const res = await api.post("/auth/login", { email: form.email, password: form.password });
      setAuthToken(res.data.accessToken);
      localStorage.setItem("userRole", res.data.role);
      showToast("Login successful", "success");
      onLogin({ role: res.data.role, godownId: res.data.godownId });
    } catch (error) {
      const errMsg = error?.response?.data?.message || "Login failed";
      setMessage(errMsg);
      showToast(errMsg, "error");
    }
  };

  const register = async () => {
    try {
      if (!form.name || !form.email || !form.password) return showToast("Name, email and password are required", "error");
      if (form.role === "user" && !form.godownId) return showToast("Please select godown for user role", "error");
      await api.post("/auth/register", form);
      setMessage("Registration successful. Please login.");
      showToast("Registration successful", "success");
      setMode("login");
    } catch (error) {
      const errMsg = error?.response?.data?.message || "Registration failed";
      setMessage(errMsg);
      showToast(errMsg, "error");
    }
  };

  // --- FIXED FORGOT PASSWORD LOGIC ---
  const forgot = async () => {
    if (!forgotEmail) return showToast("Please enter your email", "error");
    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail });
      // SUCCESS: The backend sends a generic confirmation message
      setMessage(res.data.message); 
      showToast("Check your inbox", "success");
    } catch (error) {
      console.error("Forgot Password Error:", error);
      const errMsg = error?.response?.data?.message || "Failed to send reset email";
      setMessage(errMsg);
      showToast(errMsg, "error");
    }
  };

  const resetPassword = async () => {
    if (!forgotToken || !newPassword) return showToast("Token and new password are required", "error");
    try {
      await api.post("/auth/reset-password", { token: forgotToken, newPassword });
      setMessage("Password reset successful. You can now login.");
      showToast("Password reset successful", "success");
      setMode("login");
    } catch (error) {
      const errMsg = error?.response?.data?.message || "Reset failed or token expired";
      setMessage(errMsg);
      showToast(errMsg, "error");
    }
  };

  return (
    <div className="auth-wrap">
      <h1>MKM Inventory</h1>
      <div className="auth-tabs">
        <button onClick={() => setMode("login")} className={mode === "login" ? "tab-active" : ""}>Login</button>
        <button onClick={() => setMode("register")} className={mode === "register" ? "tab-active" : ""}>Register</button>
        <button onClick={() => setMode("forgot")} className={mode === "forgot" ? "tab-active" : ""}>Forgot Password</button>
      </div>

      {mode !== "forgot" && (
        <div className="auth-form">
          {mode === "register" && (
            <input 
              placeholder="Full Name" 
              value={form.name} 
              onChange={(e) => onChange("name", e.target.value)} 
            />
          )}
          <input 
            placeholder="Email Address" 
            value={form.email} 
            onChange={(e) => onChange("email", e.target.value)} 
          />
          <input 
            placeholder="Password" 
            type="password" 
            value={form.password} 
            onChange={(e) => onChange("password", e.target.value)} 
          />
          
          {mode === "register" && (
            <>
              <select value={form.role} onChange={(e) => onChange("role", e.target.value)}>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              {form.role === "user" && (
                <select value={form.godownId} onChange={(e) => onChange("godownId", e.target.value)}>
                  <option value="">Select Associated Godown</option>
                  {godowns.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
          <button className="btn-primary" onClick={mode === "login" ? login : register}>
            {mode === "login" ? "Login" : "Register"}
          </button>
        </div>
      )}

      {mode === "forgot" && (
        <div className="auth-form">
          <div className="forgot-section">
            <p>Enter your email to receive a reset link.</p>
            <input 
              placeholder="Registered Email" 
              value={forgotEmail} 
              onChange={(e) => setForgotEmail(e.target.value)} 
            />
            <button className="btn-secondary" onClick={forgot}>Send Reset Link</button>
          </div>

          <hr className="auth-divider" />

          <div className="reset-section">
            <p>Or enter the token from your email manually.</p>
            <input 
              placeholder="Reset Token" 
              value={forgotToken} 
              onChange={(e) => setForgotToken(e.target.value)} 
            />
            <input 
              placeholder="New Password" 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
            />
            <button className="btn-primary" onClick={resetPassword}>Update Password</button>
          </div>
        </div>
      )}
      
      {message && <p className="auth-status-message">{message}</p>}
    </div>
  );
};