"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleHelp, FileSearch, LoaderCircle, Printer, RefreshCw, XCircle } from "lucide-react";

type ReviewSummary = {
  attemptId: string; quizId: string; quizTitle: string; learnerLabel: string; scorePercent: number;
  correctCount: number; totalQuestions: number; submittedAt: string; unansweredCount: number;
};
type ReviewAnswer = {
  questionId: string; prompt: string; concept: string; options: string[]; selectedOptionIndex: number | null;
  selectedAnswer: string | null; correctOptionIndex: number; correctAnswer: string; isCorrect: boolean; explanation: string;
};
type ReviewDetail = ReviewSummary & { answers: ReviewAnswer[] };
type QuizOption = { id: string; title: string };

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TeacherSubmissionReview() {
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [quizId, setQuizId] = useState("all");
  const [submissions, setSubmissions] = useState<ReviewSummary[]>([]);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reviewUrl = "/api/teacher/review" + (quizId === "all" ? "" : "?quizId=" + encodeURIComponent(quizId));
      const results = await Promise.all([
        fetch("/api/teacher/quizzes", { cache: "no-store" }),
        fetch(reviewUrl, { cache: "no-store" }),
      ]);
      const quizBody = await results[0]!.json();
      const reviewBody = await results[1]!.json();
      if (!results[0]!.ok) throw new Error(quizBody.error?.message ?? "Unable to load assessments.");
      if (!results[1]!.ok) throw new Error(reviewBody.error?.message ?? "Unable to load submissions.");
      const rows = reviewBody.data as ReviewSummary[];
      setQuizzes((quizBody.data as QuizOption[]).map(({ id, title }) => ({ id, title })));
      setSubmissions(rows);
      if (detail && !rows.some((item) => item.attemptId === detail.attemptId)) setDetail(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [quizId, detail]);

  useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

  const openReview = async (attemptId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/teacher/review?attemptId=" + encodeURIComponent(attemptId), { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to open this submission.");
      setDetail(body.data as ReviewDetail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open this submission.");
    } finally {
      setDetailLoading(false);
    }
  };

  return <div className="teacher-review">
    <div className="review-toolbar">
      <Link href="/teacher/analytics" className="button button-secondary"><ArrowLeft size={14} /> Results & analytics</Link>
      <div className="review-toolbar-actions">
        <button className="button button-secondary" onClick={() => void loadSubmissions()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
        {detail && <button className="button button-primary" onClick={() => window.print()}><Printer size={14} /> Print review</button>}
      </div>
    </div>
    <div className="review-demo-note"><FileSearch size={15} /><span>Fictional demo records only · one demo learner · no authenticated class access is configured</span></div>
    {error && <div className="builder-notice builder-notice-error" role="alert">{error}</div>}

    <section className="card review-list-panel">
      <div className="review-list-heading">
        <div><p className="section-kicker">FINALIZED ATTEMPTS</p><h2 className="card-title">Submission inbox</h2><p className="card-description">Open a submission to inspect every response, the answer key, and feedback.</p></div>
        <label className="analytics-filter">Assessment<select value={quizId} onChange={(event) => { setQuizId(event.target.value); setDetail(null); }}><option value="all">All assessments</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select></label>
      </div>
      {loading && <div className="review-state"><LoaderCircle size={17} className="animate-spin" /> Loading submissions…</div>}
      {!loading && submissions.length === 0 && <div className="analytics-empty"><CircleHelp size={24} /><h3>No finalized submissions yet</h3><p>Publish an assessment and complete a student demo attempt to see the question-by-question review here.</p><Link className="button button-primary" href="/teacher">Open quiz builder</Link></div>}
      {!loading && submissions.length > 0 && <div className="review-submission-list">{submissions.map((item) =>
        <button className={"review-submission-row" + (detail?.attemptId === item.attemptId ? " review-submission-selected" : "")} key={item.attemptId} onClick={() => void openReview(item.attemptId)}>
          <span className="review-submission-icon"><FileSearch size={16} /></span>
          <span className="review-submission-copy"><strong>{item.quizTitle}</strong><span>{item.learnerLabel} · {dateLabel(item.submittedAt)}</span><small>{item.correctCount}/{item.totalQuestions} correct · {item.unansweredCount} unanswered</small></span>
          <strong className={"review-score" + (item.scorePercent >= 60 ? " review-score-pass" : "")}>{item.scorePercent}%</strong>
        </button>
      )}</div>}
    </section>

    {detailLoading && <div className="card review-state"><LoaderCircle size={17} className="animate-spin" /> Opening response details…</div>}
    {detail && !detailLoading && <section className="card review-detail-panel" aria-live="polite">
      <div className="review-detail-heading"><div><p className="section-kicker">INDIVIDUAL REVIEW · FICTIONAL DEMO</p><h2 className="card-title">{detail.quizTitle}</h2><p className="card-description">{detail.learnerLabel} · Submitted {dateLabel(detail.submittedAt)}</p></div><div className="review-result-score"><strong>{detail.scorePercent}%</strong><span>{detail.correctCount} of {detail.totalQuestions} correct</span></div></div>
      <div className="review-result-stats"><span><CheckCircle2 size={14} /> {detail.correctCount} correct</span><span><XCircle size={14} /> {detail.totalQuestions - detail.correctCount} incorrect or unanswered</span><span><CircleHelp size={14} /> {detail.unansweredCount} unanswered</span></div>
      <div className="review-answer-list">{detail.answers.map((answer, index) =>
        <article className="review-answer" key={answer.questionId}>
          <div className="review-answer-title"><span className="review-question-number">{index + 1}</span><div><h3>{answer.prompt}</h3><p>{answer.concept}</p></div><span className={"review-answer-status" + (answer.isCorrect ? " review-answer-correct" : " review-answer-incorrect")}>{answer.isCorrect ? <><CheckCircle2 size={13} /> Correct</> : <><XCircle size={13} /> {answer.selectedOptionIndex === null ? "Unanswered" : "Incorrect"}</>}</span></div>
          <div className="review-answer-options">{answer.options.map((option, optionIndex) => <div key={optionIndex} className={"review-option" + (optionIndex === answer.correctOptionIndex ? " review-option-correct" : "") + (optionIndex === answer.selectedOptionIndex && !answer.isCorrect ? " review-option-selected-wrong" : "")}><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p>{optionIndex === answer.correctOptionIndex && <strong>Correct answer</strong>}{optionIndex === answer.selectedOptionIndex && <small>Your answer</small>}</div>)}</div>
          {answer.explanation && <p className="review-explanation"><strong>Explanation:</strong> {answer.explanation}</p>}
        </article>
      )}</div>
      <p className="review-footer-note">This review uses fictional local demo data. Production teacher authentication, class authorization, and shared cloud persistence are not configured.</p>
    </section>}
  </div>;
}
