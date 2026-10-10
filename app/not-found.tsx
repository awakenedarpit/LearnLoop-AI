import Link from "next/link";

export default function NotFound() {
  return <main className="dashboard-column">
    <section className="card card-pad">
      <p className="section-kicker">PAGE NOT FOUND</p>
      <h1 className="card-title" style={{ marginTop: 7 }}>Let’s find your next step.</h1>
      <p className="card-description">That page isn’t part of this learning loop. Your saved demo progress is unchanged.</p>
      <Link className="button button-primary" href="/" style={{ marginTop: 16 }}>Back to your learning overview</Link>
    </section>
  </main>;
}
