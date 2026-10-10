import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, ShieldCheck, Timer } from "lucide-react";

export const metadata: Metadata = { title: "Assess" };

export default function AssessPage() {
  return <>
    <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark" />LEARNLOOP ASSESS</p><h1 className="page-title">Assessment, with evidence behind it.</h1><p className="page-subtitle">A focused space for teacher-created quizzes, timed student work and clear review.</p></div></div>
    <section className="card card-pad" style={{ maxWidth: 820, padding: 28 }}>
      <div className="learning-card-icon"><ClipboardList size={17} /></div><span className="state-chip state-chip-neutral" style={{ marginTop: 16 }}>PHASE 2 · IN DEVELOPMENT</span>
      <h2 className="card-title" style={{ marginTop: 13, fontSize: 19 }}>No assessments are published in this demo yet.</h2>
      <p className="card-description" style={{ maxWidth: 620, fontSize: 11 }}>The next milestone adds teacher quiz authoring, class assignments, timed student attempts with server-backed answer saves, deadline-based finalization and individual review. We do not show sample results as if they came from a real class.</p>
      <div className="learning-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 17 }}>
        <div className="concept-tile"><strong><Timer size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#7b72ca" }} />Server-owned attempts</strong><span>Saved answers and deadlines will be authoritative on the server, not in browser storage.</span></div>
        <div className="concept-tile"><strong><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6e987e" }} />Reviewable integrity</strong><span>Focus/fullscreen events will be reviewable signals, never proof of misconduct.</span></div>
      </div>
      <div className="disclaimer" style={{ marginTop: 17 }}>This is a fictional local demo, not a production assessment system. Do not enter real student data.</div>
      <Link className="button button-secondary" href="/learn" style={{ marginTop: 18 }}>Continue learning <ArrowRight size={13} /></Link>
    </section>
  </>;
}
