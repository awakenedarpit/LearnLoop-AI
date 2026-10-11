"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import "../sign-in/sign-in.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const result = await supabase.auth.getUser() as { data: { user: { id: string } | null }; error: Error | null };
        const { data, error: authError } = result;
        if (!active) return;
        if (authError || !data.user) setError("This reset link is invalid or has expired. Request a new one.");
        else setReady(true);
      } catch (caught) {
        if (active) setError(caught instanceof Error && caught.message === "SUPABASE_NOT_CONFIGURED" ? "Authentication is not configured for this deployment yet." : "We could not validate this reset link.");
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setError("The passwords do not match."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      setMessage("Your password has been updated. You can now sign in with it.");
      setPassword(""); setConfirmation("");
    } catch (caught) {
      setError(caught instanceof Error && /password/i.test(caught.message) ? "Use a password with at least six characters." : "We could not update your password. Request a new reset link and try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-card">
        <Link className="sign-in-brand" href="/">Learn<span>Loop</span><small>AI learning studio</small></Link>
        <div className="sign-in-symbol" aria-hidden="true">✓</div>
        <p className="sign-in-eyebrow">PASSWORD RESET</p>
        <h1>Choose a new password.</h1>
        <p className="sign-in-description">Use a password you can remember. Your learning data stays behind the authenticated session.</p>
        <form onSubmit={submit}>
          <label htmlFor="reset-password">New password</label>
          <input id="reset-password" type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" />
          <label htmlFor="reset-password-confirm">Confirm new password</label>
          <input id="reset-password-confirm" type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Enter it again" />
          <button type="submit" disabled={busy || !ready}>{busy ? "Updating…" : "Update password"}</button>
        </form>
        {message && <p className="sign-in-success" role="status">{message} <Link href="/sign-in">Sign in</Link></p>}
        {error && <p className="sign-in-error" role="alert">{error}</p>}
        <Link className="sign-in-back" href="/sign-in">← Back to sign in</Link>
      </section>
    </main>
  );
}
