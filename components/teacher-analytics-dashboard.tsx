"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, CheckCircle2, ClipboardList, FileQuestion, LoaderCircle, RefreshCw, TrendingUp, UsersRound } from "lucide-react";

type QuestionStat = { questionId: string; prompt: string; concept: string; submissions: number; correctCount: number; accuracyPercent: number };
type QuizAnalytics = {
  id: string; title: string; status: "draft" | "published"; questionCount: number; durationMinutes: number;
  attemptLimit: number; submissionCount: number; averageScore: number | null; highestScore: number | null;
  passRate: number | null; lastSubmittedAt: string | null; questionStats: QuestionStat[];
};
type Analytics = {
  mode: "fictional_demo"; totalQuizzes: number; publishedQuizzes: number; totalSubmissions: number;
  overallAverageScore: number | null; quizzes: QuizAnalytics[];
  recentSubmissions: Array<{ attemptId: string; quizId: string; quizTitle: string; scorePercent: number; correctCount: number; totalQuestions: number; submittedAt: string }>;
};

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function scoreLabel(value: number | null): string { return value === null ? "—" : `${value}%`; }

export function TeacherAnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [selectedId, setSelectedId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/teacher/analytics", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load assessment analytics.");
      setData(body.data as Analytics);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load assessment analytics.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => {
    if (!data || selectedId === "all") return null;
    return data.quizzes.find((quiz) => quiz.id === selectedId) ?? null;
  }, [data, selectedId]);

  if (loading && !data) return <div className="card card-pad analytics-loading"><LoaderCircle size={18} className="animate-spin" /> Loading assessment insights…</div>;

  return <div className="teacher-analytics">
    <div className="analytics-toolbar">
      <Link href="/teacher" className="button button-secondary"><ArrowLeft size={14} /> Quiz builder</Link>
      <button className="button button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh data</button>
    </div>
    {error && <div className="builder-notice builder-notice-error" role="alert">{error}</div>}
    {data && <>
      <div className="analytics-demo-note"><Activity size={15} /><span>Fictional demo data · one demo learner · not a multi-user class report</span></div>
      <div className="analytics-stat-grid">
        <article className="analytics-stat card"><span className="analytics-stat-icon"><ClipboardList size={17} /></span><span className="analytics-stat-label">Assessments</span><strong>{data.totalQuizzes}</strong><small>{data.publishedQuizzes} published</small></article>
        <article className="analytics-stat card"><span className="analytics-stat-icon analytics-stat-green"><CheckCircle2 size={17} /></span><span className="analytics-stat-label">Submissions</span><strong>{data.totalSubmissions}</strong><small>Finalized attempts</small></article>
        <article className="analytics-stat card"><span className="analytics-stat-icon analytics-stat-purple"><TrendingUp size={17} /></span><span className="analytics-stat-label">Average score</span><strong>{scoreLabel(data.overallAverageScore)}</strong><small>Across submitted attempts</small></article>
        <article className="analytics-stat card"><span className="analytics-stat-icon analytics-stat-amber"><UsersRound size={17} /></span><span className="analytics-stat-label">Learners represented</span><strong>{data.totalSubmissions ? "1" : "0"}</strong><small>Fixed fictional demo identity</small></article>
      </div>

      <section className="card analytics-panel">
        <div className="analytics-panel-head"><div><p className="section-kicker">ASSESSMENT PERFORMANCE</p><h2 className="card-title">Quiz results</h2><p className="card-description">Compare score, pass rate, and response accuracy for each assessment.</p></div>
          <label className="analytics-filter">Focus quiz<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="all">All quizzes</option>{data.quizzes.map((quiz) => <option value={quiz.id} key={quiz.id}>{quiz.title}</option>)}</select></label>
        </div>
        {data.quizzes.length === 0 ? <div className="analytics-empty"><FileQuestion size={24} /><h3>No assessments yet</h3><p>Create and publish a quiz to start collecting demo results.</p><Link className="button button-primary" href="/teacher">Open quiz builder</Link></div> : (
          <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Assessment</th><th>Status</th><th>Submissions</th><th>Avg. score</th><th>Pass rate</th><th>Highest</th></tr></thead><tbody>{data.quizzes.filter((quiz) => selectedId === "all" || quiz.id === selectedId).map((quiz) => <tr key={quiz.id}><td><strong>{quiz.title}</strong><small>{quiz.questionCount} questions · {quiz.durationMinutes} min</small></td><td><span className={quiz.status === "published" ? "analytics-status analytics-status-published" : "analytics-status"}>{quiz.status}</span></td><td>{quiz.submissionCount}</td><td>{scoreLabel(quiz.averageScore)}</td><td>{scoreLabel(quiz.passRate)}</td><td>{scoreLabel(quiz.highestScore)}</td></tr>)}</tbody></table></div>
        )}
      </section>

      {selected && <section className="card analytics-panel"><div className="analytics-panel-head"><div><p className="section-kicker">QUESTION BREAKDOWN</p><h2 className="card-title">{selected.title}</h2><p className="card-description">Correct responses divided by all finalized submissions; unanswered items count as incorrect.</p></div></div>
        {selected.submissionCount === 0 ? <div className="analytics-empty"><BarChart3 size={22} /><h3>No results to analyze yet</h3><p>Question accuracy appears after a student submits this quiz.</p></div> : <div className="analytics-question-list">{selected.questionStats.map((question, index) => <article className="analytics-question" key={question.questionId}><div className="analytics-question-copy"><span className="analytics-question-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{question.prompt}</h3><p>{question.concept} · {question.correctCount} of {question.submissions} correct</p></div></div><div className="analytics-accuracy"><div className="analytics-progress"><span style={{ width: `${question.accuracyPercent}%` }} /></div><strong>{question.accuracyPercent}%</strong></div></article>)}</div>}
      </section>}

      <section className="card analytics-panel"><div className="analytics-panel-head"><div><p className="section-kicker">LATEST ACTIVITY</p><h2 className="card-title">Recent submissions</h2><p className="card-description">Most recent finalized attempts from the demo learner.</p></div></div>
        {data.recentSubmissions.length === 0 ? <div className="analytics-empty"><Activity size={22} /><h3>Nothing submitted yet</h3><p>Once the student completes a published quiz, their result will show here.</p><Link className="button button-secondary" href="/student/quizzes">Open student quizzes</Link></div> : <div className="analytics-recent-list">{data.recentSubmissions.map((item) => <article className="analytics-recent-row" key={item.attemptId}><span className="analytics-recent-icon"><CheckCircle2 size={16} /></span><div className="analytics-recent-copy"><strong>{item.quizTitle}</strong><span>{dateLabel(item.submittedAt)} · {item.correctCount}/{item.totalQuestions} correct</span></div><strong className={item.scorePercent >= 60 ? "analytics-score analytics-score-pass" : "analytics-score"}>{item.scorePercent}%</strong></article>)}</div>}
      </section>
    </>}
  </div>;
}
