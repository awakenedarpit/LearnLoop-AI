import Link from "next/link";
import Image from "next/image";
import { Activity, ArrowRight, Award, BookOpenCheck, Brain, Check, CircleHelp, Clock3, Compass, Flame, RotateCcw, Sparkles, Target, TriangleAlert } from "lucide-react";
import { getProgressOverview, type ProgressOverview } from "@/lib/services/learning";

const sessionTitle = (kind: string) => kind === "diagnostic" ? "Python diagnostic" : kind === "practice" ? "Focused practice" : "Fresh reassessment";

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Activity; label: string; value: string; note: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={16} aria-hidden="true" /></div><div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-hint">{note}</span></div></div>;
}

export function ProgressDashboard() {
  let overview: ProgressOverview | null = null;
  let errorMessage = "";
  try {
    overview = getProgressOverview();
  } catch (reason) {
    errorMessage = reason instanceof Error ? reason.message : "Progress is temporarily unavailable.";
  }
  if (!overview) return <section className="card card-pad" role="alert"><div className="empty-symbol"><TriangleAlert size={18} /></div><h2 className="card-title" style={{ marginTop: 13 }}>Progress could not load</h2><p className="card-description">{errorMessage || "Try again in a moment."}</p><Link className="button button-secondary" style={{ marginTop: 13 }} href="/">Try again</Link></section>;

  const hasDiagnostic = overview.latestDiagnostic !== null;
  const delta = overview.scoreChange;
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow"><span className="eyebrow-mark" />YOUR LEARNING WORKSPACE</p><h1 className="page-title">A little progress, made visible.</h1><p className="page-subtitle">Every result here comes from a saved learning session. Start with a short diagnostic to find a useful next step.</p></div>
        <Link className="subtle-link" href="/learn/history">View learning history <ArrowRight size={13} /></Link>
      </div>
      <section className="hero-panel" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={13} aria-hidden="true" /> YOUR NEXT LEARNING LOOP</div>
          <h2 id="hero-title" className="hero-title">{hasDiagnostic ? "Turn a tricky concept into your next win." : "Find your next concept to unlock."}</h2>
          <p>{hasDiagnostic ? "Your diagnostic points to a few ideas worth revisiting. Practice makes the next check-in more useful." : "Six short questions map your Python starting point. There is no pass or fail—just a clearer direction for what to learn next."}</p>
          <Link className="button button-primary" href={hasDiagnostic ? "/learn/practice" : "/learn/diagnostic"}>
            {hasDiagnostic ? "Practice a concept" : "Take the Python diagnostic"}<ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true"><span className="hero-art-ring" /><Image src="/learnloop-mark.svg" alt="" width={64} height={64} /></div>
      </section>
      <div className="stats-row">
        <Metric icon={Target} label="LATEST DIAGNOSTIC" value={overview.latestDiagnostic ? `${overview.latestDiagnostic.scorePercent}%` : "—"} note={overview.latestDiagnostic ? `${overview.latestDiagnostic.correctCount} of ${overview.latestDiagnostic.totalQuestions} correct` : "Not assessed yet"} tone="" />
        <Metric icon={Brain} label="CONCEPTS TO REVISIT" value={hasDiagnostic ? String(overview.recommendedConcepts.length) : "—"} note={hasDiagnostic ? "From your latest diagnostic" : "Start with a diagnostic"} tone="stat-icon-lavender" />
        <Metric icon={Activity} label="SESSIONS COMPLETED" value={String(overview.completedSessions)} note={overview.completedSessions === 1 ? "One step in your loop" : "Saved learning sessions"} tone="stat-icon-green" />
        <Metric icon={Award} label="CHANGE SINCE BASELINE" value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}%`} note={delta === null ? "Available after reassessment" : "Diagnostic to reassessment"} tone="stat-icon-amber" />
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-column">
          <section className="card card-pad" aria-labelledby="concept-heading">
            <div className="card-head"><div><span className="section-kicker">CONCEPT CHECK-IN</span><h2 className="card-title" id="concept-heading" style={{ marginTop: 4 }}>Python Fundamentals</h2><p className="card-description">{hasDiagnostic ? "Signals from your latest diagnostic—not a permanent label." : "Your concept indicators will appear after your first diagnostic."}</p></div><span className="state-chip state-chip-neutral">{hasDiagnostic ? "Latest saved results" : "Not assessed"}</span></div>
            <div className="progress-list">
              {overview.concepts.map((concept) => <div className="progress-row" key={concept.concept}>
                <span className="progress-label">{concept.label}</span>
                <div className="progress-track" role="progressbar" aria-label={`${concept.label} accuracy`} aria-valuenow={concept.accuracy ?? 0} aria-valuemin={0} aria-valuemax={100}><div className={`progress-fill${concept.accuracy === null ? " progress-fill-unassessed" : ""}`} style={{ width: `${concept.accuracy ?? 0}%` }} /></div>
                <span className="progress-value">{concept.accuracy === null ? "—" : `${concept.accuracy}%`}</span>
              </div>)}
            </div>
            <div className="disclaimer" style={{ marginTop: 19 }}><CircleHelp size={14} aria-hidden="true" />These are early learning indicators from a small question set, not a definitive measure of ability.</div>
          </section>
          <section className="card card-pad" aria-labelledby="history-heading">
            <div className="card-head"><div><span className="section-kicker">RECENT ACTIVITY</span><h2 className="card-title" id="history-heading" style={{ marginTop: 4 }}>Your learning history</h2></div><Link className="subtle-link" href="/learn/history">See all <ArrowRight size={12} /></Link></div>
            {overview.recentSessions.length ? <div className="history-list">{overview.recentSessions.slice(0, 4).map((session) => <div className="history-row" key={session.id}>
              <div className="history-symbol">{session.kind === "diagnostic" ? <Compass size={15} /> : session.kind === "practice" ? <BookOpenCheck size={15} /> : <RotateCcw size={15} />}</div>
              <div className="history-copy"><strong>{sessionTitle(session.kind)}</strong><span>{session.status === "completed" && session.completedAt ? new Date(session.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "In progress"} · {session.totalQuestions} questions</span></div>
              <span className="history-score">{session.scorePercent === null ? "—" : `${session.scorePercent}%`}</span>
            </div>)}</div> : <div className="empty-state"><div className="empty-symbol"><Clock3 size={17} /></div><h3>Your first check-in starts here.</h3><p>No learning sessions have been completed yet. Your history will appear after you finish a diagnostic or practice set.</p><Link className="subtle-link" href="/learn/diagnostic">Start a diagnostic <ArrowRight size={13} /></Link></div>}
          </section>
        </div>
        <div className="dashboard-column">
          <section className="card card-pad" aria-labelledby="actions-heading">
            <div className="card-head"><div><span className="section-kicker">A CLEAR NEXT STEP</span><h2 className="card-title" id="actions-heading" style={{ marginTop: 4 }}>Continue your loop</h2></div></div>
            <div className="action-list">
              <Link className="action-card" href="/learn/diagnostic"><div className="action-icon"><Target size={16} /></div><div className="action-copy"><strong>Check your understanding</strong><span>Six concept-mapped Python questions</span></div><ArrowRight className="action-arrow" size={14} /></Link>
              <Link className="action-card" href="/learn/practice"><div className="action-icon action-icon-lavender"><BookOpenCheck size={16} /></div><div className="action-copy"><strong>Practice a concept</strong><span>{hasDiagnostic && overview.recommendedConcepts.length ? `${overview.recommendedConcepts.length} concept${overview.recommendedConcepts.length === 1 ? "" : "s"} from your latest check-in` : "Questions adapt after a diagnostic"}</span></div><ArrowRight className="action-arrow" size={14} /></Link>
              <Link className="action-card" href="/learn/reassess"><div className="action-icon action-icon-green"><RotateCcw size={16} /></div><div className="action-copy"><strong>Reassess with fresh questions</strong><span>Compare actual saved attempts</span></div><ArrowRight className="action-arrow" size={14} /></Link>
            </div>
          </section>
          <section className="card card-pad">
            <span className="section-kicker">YOUR LEARNING CYCLE</span><h2 className="card-title" style={{ marginTop: 4 }}>Small loops add up.</h2>
            <div className="action-list" style={{ gap: 7 }}>
              {["Diagnose", "Understand", "Practice", "Reassess", "Track improvement"].map((step, index) => <div className="history-row" style={{ padding: "6px 0", borderTop: index ? undefined : "none" }} key={step}><div className={`action-icon ${index > 2 ? "action-icon-green" : ""}`} style={{ width: 25, height: 25, flexBasis: 25, borderRadius: 8 }}><span style={{ fontSize: 9, fontWeight: 800 }}>{index + 1}</span></div><div className="history-copy"><strong>{step}</strong><span>{index === 0 && hasDiagnostic ? "Completed" : index === 2 && overview.recommendedConcepts.length ? `${overview.recommendedConcepts.length} recommended concepts` : index === 4 && delta !== null ? `${delta > 0 ? "+" : ""}${delta}% from baseline` : index === 0 && !hasDiagnostic ? "Ready when you are" : "Part of your learning loop"}</span></div>{index === 0 && hasDiagnostic && <Check size={13} color="#4c987c" />}{index === 2 && overview.recommendedConcepts.length > 0 && <Flame size={13} color="#c69355" />}</div>)}
            </div>
          </section>
        </div>
      </div>
      <div style={{ marginTop: 15 }} className="disclaimer"><CircleHelp size={14} aria-hidden="true" />Your data is stored only in this local demo workspace. Cloud synchronization and production sign-in are not enabled.</div>
    </>
  );
}

export function LearningHistoryList({ sessions }: { sessions: ProgressOverview["recentSessions"] }) {
  if (!sessions.length) return <div className="empty-state"><div className="empty-symbol"><Clock3 size={17} /></div><h3>No saved sessions yet</h3><p>Completed diagnostic, practice and reassessment sessions will appear here.</p><Link className="subtle-link" href="/learn/diagnostic">Start a diagnostic <ArrowRight size={13} /></Link></div>;
  return <div className="history-list">{sessions.map((session) => <div className="history-row" key={session.id}>
    <div className="history-symbol">{session.kind === "diagnostic" ? <Compass size={15} /> : session.kind === "practice" ? <BookOpenCheck size={15} /> : <RotateCcw size={15} />}</div>
    <div className="history-copy"><strong>{sessionTitle(session.kind)}</strong><span>{session.status === "completed" && session.completedAt ? new Date(session.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "In progress"} · {session.totalQuestions} questions</span></div>
    <span className="history-score">{session.scorePercent === null ? "In progress" : `${session.scorePercent}%`}</span>
  </div>)}</div>;
}
