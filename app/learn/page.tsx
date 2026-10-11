import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpenCheck, Code2, RotateCcw, Sparkles, Target } from "lucide-react";
import { CONCEPTS } from "@/lib/learning/catalog";

export default function LearnPage() {
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark" />LEARNLOOP LEARN</p><h1 className="page-title">A clearer path through Python.</h1><p className="page-subtitle">Start with a small check-in, focus on the concepts that need another look, then come back with fresh questions.</p></div></div>
      <section className="card card-pad" style={{ padding: 0, overflow: "hidden" }}>
        <div className="hero-panel" style={{ border: 0, borderRadius: 0, minHeight: 190 }}>
          <div className="hero-copy"><div className="hero-kicker"><Code2 size={13} /> PYTHON FUNDAMENTALS</div><h2 className="hero-title">Learn in a loop that fits you.</h2><p>Six foundational ideas. A real starting point. One useful next step at a time.</p><Link href="/learn/diagnostic" className="button button-primary">Begin with a diagnostic <ArrowRight size={14} /></Link></div>
          <div className="hero-art" aria-hidden="true"><span className="hero-art-ring" /><Image src="/learnloop-mark.svg" alt="" width={64} height={64} /></div>
        </div>
      </section>
      <section style={{ marginTop: 22 }} aria-labelledby="concepts-heading">
        <div className="card-head"><div><span className="section-kicker">YOUR CONCEPT MAP</span><h2 className="card-title" id="concepts-heading" style={{ marginTop: 4 }}>Six ideas to get comfortable with.</h2><p className="card-description">These areas appear in your diagnostic, practice, and reassessment.</p></div></div>
        <div className="concept-grid">{CONCEPTS.map((concept, index) => <div className="concept-tile" key={concept.id}><strong><span style={{ display: "inline-grid", width: 20, height: 20, placeItems: "center", margin: "0 6px 0 0", borderRadius: 6, background: index % 2 ? "#f2edff" : "#edf0ff", color: index % 2 ? "#8470c9" : "#6074d0", verticalAlign: "-5px" }}>{index + 1}</span>{concept.label}</strong><span>{concept.description}</span></div>)}</div>
      </section>
      <div className="learning-grid" style={{ marginTop: 19 }}>
        <article className="learning-card card"><div className="learning-card-icon"><Target size={16} /></div><h2>Diagnose</h2><p>Map your current understanding across all six Python concepts.</p><Link className="subtle-link" href="/learn/diagnostic">Take the check-in <ArrowRight size={12} /></Link></article>
        <article className="learning-card card"><div className="learning-card-icon"><BookOpenCheck size={16} /></div><h2>Practice</h2><p>Try new questions chosen from concepts that need another look.</p><Link className="subtle-link" href="/learn/practice">Explore focused practice <ArrowRight size={12} /></Link></article>
        <article className="learning-card card"><div className="learning-card-icon"><RotateCcw size={16} /></div><h2>Reassess</h2><p>Use fresh questions and compare with your actual saved baseline.</p><Link className="subtle-link" href="/learn/reassess">See what changed <ArrowRight size={12} /></Link></article>
      </div>
      <div style={{ marginTop: 16 }} className="disclaimer"><Sparkles size={14} />Completed answers can request a clearly labeled AI study note. Verified scores and answer keys remain deterministic, and curated guidance is shown when Gemini is unavailable.</div>
    </>
  );
}
