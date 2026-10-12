import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import logo from "../mkmLogo.png";
import { api, setSession } from "../api.js";
import { Banner, Button, Tabs } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";

const MIN_PASSWORD_LENGTH = 8;

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

/* Admin accounts are provisioned by the organisation (the API refuses admin
   self-registration), so this portal offers sign-in and password recovery only. */
export const AuthPage = ({ onLogin, initialMode = "login", notice }) => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  const [mode, setMode] = useState(resetToken ? "reset" : initialMode === "reset" ? "reset" : "login");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(notice ? { variant: "warn", text: notice } : null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState(resetToken);
  const [newPassword, setNewPassword] = useState("");

  const switchMode = (next) => {
    setMode(next);
    setStatus(null);
  };

  const run = async (action, failure) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      const text = errorMessage(error, failure);
      setStatus({ variant: "alert", text });
      showToast(text, "error");
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = (event) => {
    event.preventDefault();
    run(async () => {
      const { data } = await api.post("/auth/login", { email: email.trim(), password });
      // A kitchen account is valid, just not for this console: never keep its token.
      if (data.role !== "admin") {
        setStatus({ variant: "alert", text: "This console is for administrators. Kitchen accounts sign in on the kitchen app." });
        return;
      }
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, role: data.role });
      onLogin({ role: data.role });
    }, "Sign-in failed. Check your email and password.");
  };

  const submitForgot = (event) => {
    event.preventDefault();
    run(async () => {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setStatus({ variant: "success", text: data.message || "If that email is registered, a reset link is on its way." });
    }, "Could not send the reset email. Try again shortly.");
  };

  const submitReset = (event) => {
    event.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setStatus({ variant: "alert", text: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    run(async () => {
      await api.post("/auth/reset-password", { token: token.trim(), newPassword });
      setNewPassword("");
      setToken("");
      setMode("login");
      setStatus({ variant: "success", text: "Password updated. You can sign in now." });
      showToast("Password updated", "success");
    }, "Reset failed or the link has expired. Request a new one.");
  };

  const passwordField = (id, label, value, onChange, autoComplete) => (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={id === "new-password" ? MIN_PASSWORD_LENGTH : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-field__toggle"
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );

  const emailField = (
    <div className="field">
      <label className="field__label" htmlFor="email">Email address</label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="Montessori Kitchen" className="auth-logo" />
          <h1 className="auth-title">Admin Portal</h1>
          <p className="auth-subtitle">Montessori Kitchen Management</p>
        </div>

        {mode !== "reset" && (
          <Tabs
            className="auth-tabs"
            label="Account"
            value={mode}
            onChange={switchMode}
            items={[
              { value: "login", label: "Sign in" },
              { value: "forgot", label: "Forgot password" }
            ]}
          />
        )}

        {status && <Banner variant={status.variant}>{status.text}</Banner>}

        {mode === "login" && (
          <form className="auth-form" onSubmit={submitLogin}>
            {emailField}
            {passwordField("password", "Password", password, setPassword, "current-password")}
            <Button type="submit" block disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
        )}

        {mode === "forgot" && (
          <form className="auth-form" onSubmit={submitForgot}>
            <p className="auth-help">Enter your account email and we will send you a link to choose a new password.</p>
            {emailField}
            <Button type="submit" block disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          </form>
        )}

        {mode === "reset" && (
          <form className="auth-form" onSubmit={submitReset}>
            <p className="auth-help">Choose a new password for your account.</p>
            {!resetToken && (
              <div className="field">
                <label className="field__label" htmlFor="reset-token">Reset code</label>
                <input id="reset-token" required value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
            )}
            {passwordField("new-password", "New password", newPassword, setNewPassword, "new-password")}
            <Button type="submit" block disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
            <Button variant="ghost" block onClick={() => switchMode("login")}>Back to sign in</Button>
          </form>
        )}
      </div>
    </div>
  );
};
