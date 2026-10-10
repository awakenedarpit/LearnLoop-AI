import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, FilePlus2, UsersRound } from "lucide-react";

export const metadata: Metadata = { title: "Teacher Space" };

export default function TeacherPage() {
  return <>
    <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark" />TEACHER WORKSPACE</p><h1 className="page-title">Make progress easier to see.</h1><p className="page-subtitle">A future-ready workspace for class assessments, thoughtful review and practical next steps.</p></div></div>
    <section className="card card-pad" style={{ maxWidth: 820, padding: 28 }}>
      <div className="learning-card-icon"><UsersRound size={17} /></div><span className="state-chip state-chip-neutral" style={{ marginTop: 16 }}>PHASE 2 · IN DEVELOPMENT</span>
      <h2 className="card-title" style={{ marginTop: 13, fontSize: 19 }}>Teacher tools are not active in this local demo yet.</h2>
      <p className="card-description" style={{ maxWidth: 620, fontSize: 11 }}>Quiz authoring, class assignment, timed assessment delivery, authorized individual review and data-backed reports are scheduled for the next phase. There are no real classes or submissions behind this screen.</p>
      <div className="learning-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 17 }}>
        <div className="concept-tile"><strong><FilePlus2 size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#6576cd" }} />Create with confidence</strong><span>Manually author quizzes or review AI-assisted drafts before they can be published.</span></div>
        <div className="concept-tile"><strong><BarChart3 size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#8371c6" }} />Review real results</strong><span>Reports will be derived from saved submissions and restricted to authorized classes.</span></div>
      </div>
      <div className="disclaimer" style={{ marginTop: 17 }}>Teacher/admin authentication and role authorization are not implemented in this phase.</div>
      <Link className="button button-primary" href="/learn" style={{ marginTop: 18 }}>Explore the student learning loop <ArrowRight size={13} /></Link>
    </section>
  </>;
}
