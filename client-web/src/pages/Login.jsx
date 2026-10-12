import { useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../api";

const fieldClass = "w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-green-700 focus:ring-4 focus:ring-green-700/10";

export default function Login() {
  const [screen, setScreen] = useState("login");
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const login = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("role", data.role);
      localStorage.setItem("godownId", data.godownId);
      window.location.assign("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not sign in");
    } finally { setSubmitting(false); }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (!resetSent) {
        await api.post("/auth/forgot-password", { email });
        setResetSent(true);
        toast.success("Check your email for the reset token");
      } else {
        await api.post("/auth/reset-password", { token, newPassword });
        toast.success("Password updated. You can sign in now.");
        setScreen("login");
        setResetSent(false);
        setToken("");
        setNewPassword("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reset password");
    } finally { setSubmitting(false); }
  };

  return <main className="kitchen-auth min-h-screen bg-[#f2f6f3] px-5 py-10 flex items-center justify-center">
    <section className="kitchen-auth__card w-full max-w-md rounded-3xl border border-green-900/10 bg-white p-7 shadow-xl shadow-green-950/5" aria-labelledby="auth-title">
      <header className="mb-7">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-green-700">Montessori Group of Schools</p>
        <h1 id="auth-title" className="text-3xl font-bold tracking-tight text-slate-900">{screen === "login" ? "Kitchen sign in" : resetSent ? "Enter reset token" : "Reset password"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{screen === "login" ? "Use your staff account to manage kitchen stock." : resetSent ? "Use the token sent to your email and choose a new password." : "We’ll send a reset token to your registered email."}</p>
      </header>

      {screen === "login" ? <form className="space-y-5" onSubmit={login}>
        <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Email address</span><input className={fieldClass} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Password</span><input className={fieldClass} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="w-full min-h-12 rounded-xl bg-green-800 px-4 font-bold text-white disabled:opacity-60" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
        <button type="button" className="w-full py-2 text-sm font-bold text-green-800" onClick={() => setScreen("reset")}>Forgot password?</button>
      </form> : <form className="space-y-5" onSubmit={resetPassword}>
        {!resetSent ? <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Registered email</span><input className={fieldClass} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label> : <>
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Reset token</span><input className={fieldClass} type="text" autoComplete="one-time-code" required value={token} onChange={(event) => setToken(event.target.value)} /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">New password</span><input className={fieldClass} type="password" minLength="8" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small className="mt-2 block text-xs text-slate-500">At least 8 characters</small></label>
        </>}
        <button className="w-full min-h-12 rounded-xl bg-green-800 px-4 font-bold text-white disabled:opacity-60" disabled={submitting}>{submitting ? "Please wait…" : resetSent ? "Update password" : "Send reset token"}</button>
        <button type="button" className="w-full py-2 text-sm font-bold text-green-800" onClick={() => { setScreen("login"); setResetSent(false); }}>Back to sign in</button>
      </form>}
      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">Need an account? Ask your administrator to create a kitchen staff account.</p>
    </section>
  </main>;
}
