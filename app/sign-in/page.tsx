"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import "./sign-in.css";

type AuthMode = "signin" | "signup" | "link" | "forgot";

function friendlyAuthError(message: string): string {
  if (message === "SUPABASE_NOT_CONFIGURED") return "Sign-in is not configured for this deployment yet. The project owner must set the protected Supabase URL and publishable key.";
  if (/invalid login credentials/i.test(message)) return "That email or password was not recognized.";
  if (/user already registered/i.test(message)) return "An account already exists for this email. Try signing in instead.";
  if (/password should be at least/i.test(message)) return "Use a password with at least six characters.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a moment and try again.";
  return "We could not complete that request. Check your details and try again.";
}

export default function SignInPage() {
  const router = useRouter();
  const [initialNotice] = useState(() => {
    if (typeof window === "undefined") return { message: "", error: "" };
    const params = new URLSearchParams(window.location.search);
    return {
      error: params.get("error") === "callback" ? "That confirmation link is invalid or has already been used. Request a new one." : params.get("error") === "not-configured" ? "Authentication is not configured for this deployment yet." : "",
      message: params.get("message") === "signed-out" ? "You have been signed out." : "",
    };
  });
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState(initialNotice.message);
  const [error, setError] = useState(initialNotice.error);
  const [busy, setBusy] = useState(false);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const callback = new URL("/auth/callback?next=%2F", window.location.origin).toString();
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.push("/");
      } else if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { name: displayName.trim() || undefined }, emailRedirectTo: callback },
        });
        if (authError) throw authError;
        setMessage(data.session ? "Your account is ready. Redirecting…" : "Check your inbox to confirm your email, then sign in.");
        if (data.session) router.push("/");
      } else if (mode === "link") {
        const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback, shouldCreateUser: false } });
        if (authError) throw authError;
        setMessage("Check your inbox for a secure sign-in link. You can close this tab while you wait.");
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: new URL("/auth/callback?next=%2Freset-password", window.location.origin).toString() });
        if (authError) throw authError;
        setMessage("If an account exists for that email, we sent password reset instructions.");
      }
    } catch (caught) {
      setError(friendlyAuthError(caught instanceof Error ? caught.message : ""));
    } finally {
      setBusy(false);
    }
  }

  const isPassword = mode === "signin" || mode === "signup";
  const title = mode === "signup" ? "Start your learning loop." : mode === "forgot" ? "Reset your password." : "Learning, picked up right where you left off.";
  const description = mode === "signup" ? "Create a student account to keep your learning progress connected." : mode === "forgot" ? "Enter your email and we’ll send reset instructions if an account exists." : mode === "link" ? "Use a secure email link without entering a password." : "Sign in to continue your learning journey.";

  return (
    <main className="sign-in-page">
      <section className="sign-in-card">
        <Link className="sign-in-brand" href="/">Learn<span>Loop</span><small>AI learning studio</small></Link>
        <div className="sign-in-symbol" aria-hidden="true">↗</div>
        <p className="sign-in-eyebrow">{mode === "signup" ? "CREATE ACCOUNT" : mode === "forgot" ? "ACCOUNT RECOVERY" : "WELCOME BACK"}</p>
        <h1>{title}</h1>
        <p className="sign-in-description">{description}</p>
        <div className="auth-tabs" role="tablist" aria-label="Authentication options">
          <button type="button" className={mode === "signin" ? "auth-tab auth-tab-active" : "auth-tab"} onClick={() => changeMode("signin")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "auth-tab auth-tab-active" : "auth-tab"} onClick={() => changeMode("signup")}>Create account</button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && <><label htmlFor="signup-name">Name <span>(optional)</span></label><input id="signup-name" type="text" autoComplete="name" maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></>}
          <label htmlFor="signin-email">Email address</label>
          <input id="signin-email" type="email" autoComplete="email" required maxLength={254} placeholder="you@school.edu" value={email} onChange={(event) => setEmail(event.target.value)} />
          {isPassword && <><label htmlFor="signin-password">Password</label><input id="signin-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></>}
          <button type="submit" disabled={busy}>{busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "link" ? "Email me a sign-in link" : "Send reset instructions"}</button>
        </form>
        {message && <p className="sign-in-success" role="status">{message}</p>}
        {error && <p className="sign-in-error" role="alert">{error}</p>}
        {mode === "signin" && <div className="auth-secondary-actions"><button type="button" onClick={() => changeMode("forgot")}>Forgot password?</button><button type="button" onClick={() => changeMode("link")}>Use an email link</button></div>}
        {(mode === "forgot" || mode === "link") && <button className="auth-text-button" type="button" onClick={() => changeMode("signin")}>Back to password sign-in</button>}
        <p className="sign-in-footnote">New accounts start without a privileged role. Teacher and organization-admin access must be assigned through a trusted provisioning process.</p>
        <Link className="sign-in-back" href="/">← Back to LearnLoop</Link>
      </section>
    </main>
  );
}
