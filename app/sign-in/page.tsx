"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import "./sign-in.css";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendSignInLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback?next=%2F", window.location.origin).toString();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (signInError) throw signInError;
      setMessage("Check your inbox for a secure sign-in link. You can close this tab while you wait.");
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "SUPABASE_NOT_CONFIGURED"
        ? "Sign-in is not configured yet. The project owner must connect a dedicated Supabase project first."
        : "We could not send a sign-in link. Check the email and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-card">
        <Link className="sign-in-brand" href="/">Learn<span>Loop</span><small>AI learning studio</small></Link>
        <div className="sign-in-symbol" aria-hidden="true">↗</div>
        <p className="sign-in-eyebrow">WELCOME BACK</p>
        <h1>Learning, picked up right where you left off.</h1>
        <p className="sign-in-description">Enter your email and we’ll send you a secure link to sign in.</p>
        <form onSubmit={sendSignInLink}>
          <label htmlFor="signin-email">Email address</label>
          <input id="signin-email" type="email" autoComplete="email" required maxLength={254}
            placeholder="you@school.edu" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" disabled={busy}>{busy ? "Sending link…" : "Email me a sign-in link"}</button>
        </form>
        {message && <p className="sign-in-success" role="status">{message}</p>}
        {error && <p className="sign-in-error" role="alert">{error}</p>}
        <p className="sign-in-footnote">Authentication is being configured. Demo pages remain available without signing in until cloud mode is enabled.</p>
        <Link className="sign-in-back" href="/">← Back to LearnLoop</Link>
      </section>
    </main>
  );
}
