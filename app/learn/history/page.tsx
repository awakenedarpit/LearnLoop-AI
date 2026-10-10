import type { Metadata } from "next";
import { ArrowRight, CircleHelp, History, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { LearningHistoryList } from "@/components/progress-dashboard";
import { getProgressOverview, type ProgressOverview } from "@/lib/services/learning";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Learning History" };

export default function LearningHistoryPage() {
  let data: ProgressOverview | null = null;
  let errorMessage = "";
  try { data = getProgressOverview(); }
  catch (error) { errorMessage = error instanceof Error ? error.message : "Learning history is temporarily unavailable."; }
  if (!data) return <section className="card card-pad" role="alert"><div className="empty-symbol"><TriangleAlert size={18} /></div><h1 className="card-title" style={{ marginTop: 13 }}>Learning history is unavailable</h1><p className="card-description">{errorMessage || "Try again in a moment."}</p><Link className="button button-secondary" href="/learn/history" style={{ marginTop: 14 }}>Try again</Link></section>;

  return <>
    <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark" />YOUR LEARNING</p><h1 className="page-title">Small steps, saved.</h1><p className="page-subtitle">Review completed sessions and compare actual results. Unfinished attempts remain in progress until you complete them.</p></div><Link className="subtle-link" href="/learn"><ArrowRight size={13} /> Back to learning</Link></div>
    <section className="card card-pad"><div className="card-head"><div><span className="section-kicker">SESSION RECORD</span><h2 className="card-title" style={{ marginTop: 4 }}>Your saved learning sessions</h2><p className="card-description">Fictional demo records stored on the server-side local SQLite database.</p></div><div className="history-symbol"><History size={15} /></div></div>
      <LearningHistoryList sessions={data.recentSessions} />
    </section>
    <div style={{ marginTop: 15 }} className="disclaimer"><CircleHelp size={14} />This is local demo history, not cloud-synced student data. Do not enter real student records.</div>
  </>;
}
