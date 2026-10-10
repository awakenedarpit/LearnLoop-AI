"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="dashboard-column">
    <section className="card card-pad" role="alert">
      <div className="empty-symbol" aria-hidden="true">!</div>
      <p className="section-kicker" style={{ marginTop: 14 }}>A TEMPORARY SETBACK</p>
      <h1 className="card-title" style={{ marginTop: 5 }}>This page did not load.</h1>
      <p className="card-description">Your saved learning answers remain on the server. Try loading the page again.</p>
      <button className="button button-primary" type="button" onClick={reset} style={{ marginTop: 16 }}>Try again</button>
    </section>
  </main>;
}
