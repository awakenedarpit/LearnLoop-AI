"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleHelp, Lightbulb, LoaderCircle, RotateCcw, Save, TriangleAlert, X } from "lucide-react";
import type { ConfidenceLevel, LearningKind } from "@/lib/learning/catalog";
import type { LearningQuestionView, LearningResult, LearningSessionView } from "@/lib/services/learning";

type ApiResponse<T> = { data?: T; error?: { message?: string } };
type SaveState = { questionId: string | null; status: "idle" | "saving" | "saved" | "error"; message?: string };
const kinds: Record<LearningKind, { label: string; next: string; nextLabel: string }> = {
  diagnostic: { label: "Python diagnostic", next: "/learn/practice", nextLabel: "Practice a concept" },
  practice: { label: "Focused practice", next: "/learn/reassess", nextLabel: "Reassess with fresh questions" },
  reassessment: { label: "Fresh reassessment", next: "/learn/history", nextLabel: "View learning history" },
};

function inlineText(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => part.startsWith("`") && part.endsWith("`")
    ? <code key={`${index}-${part}`}>{part.slice(1, -1)}</code>
    : <span key={`${index}-${part}`}>{part}</span>);
}

export function LearningSession({ sessionId, expectedKind, initialSession, initialError = "" }: { sessionId: string; expectedKind: LearningKind; initialSession: LearningSessionView | null; initialError?: string }) {
  const [session, setSession] = useState<LearningSessionView | null>(initialSession);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(initialError);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ questionId: null, status: "idle" });
  const [pendingSaves, setPendingSaves] = useState(0);
  const [failedSaveCount, setFailedSaveCount] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [comparisonBaseline, setComparisonBaseline] = useState<LearningResult | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const sequence = useRef(0);
  const latestSequence = useRef(new Map<string, number>());
  const failedQuestions = useRef(new Set<string>());

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/learn/sessions/${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const body = await response.json() as ApiResponse<LearningSessionView>;
      if (!response.ok || !body.data) throw new Error(body.error?.message || "This learning session could not be opened.");
      if (body.data.kind !== expectedKind) throw new Error("This session does not match the requested activity.");
      setSession(body.data);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "This learning session could not be opened.");
    } finally { setLoading(false); }
  }, [expectedKind, sessionId]);

  useEffect(() => {
    if (session?.kind !== "reassessment" || session.status !== "completed" || !session.comparisonSessionId) return;
    fetch(`/api/learn/sessions/${encodeURIComponent(session.comparisonSessionId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as ApiResponse<LearningSessionView>;
        if (response.ok && body.data?.result) setComparisonBaseline(body.data.result);
      })
      .catch(() => undefined);
  }, [session?.kind, session?.status, session?.comparisonSessionId]);

  const currentQuestion = session?.questions[activeIndex] ?? null;

  function saveAnswer(question: LearningQuestionView, selectedOptionId: string, confidence: ConfidenceLevel | null) {
    const currentSequence = ++sequence.current;
    latestSequence.current.set(question.id, currentSequence);
    failedQuestions.current.delete(question.id);
    setFailedSaveCount(failedQuestions.current.size);
    setSession((current) => current ? {
      ...current,
      questions: current.questions.map((item) => item.id === question.id ? { ...item, selectedOptionId, confidence } : item),
      answeredCount: current.answeredCount + (question.selectedOptionId ? 0 : 1),
    } : current);
    setSaveState({ questionId: question.id, status: "saving" });
    setPendingSaves((count) => count + 1);

    const task = saveQueue.current.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/learn/sessions/${encodeURIComponent(sessionId)}/answers/${encodeURIComponent(question.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOptionId, confidence }),
      });
      const body = await response.json() as ApiResponse<{ savedAt: string }>;
      if (!response.ok || !body.data) throw new Error(body.error?.message || "Answer did not save. Please retry.");
      setSession((current) => current ? {
        ...current,
        questions: current.questions.map((item) => item.id === question.id ? { ...item, savedAt: body.data?.savedAt } : item),
      } : current);
      if (latestSequence.current.get(question.id) === currentSequence) {
        setSaveState({ questionId: question.id, status: "saved" });
      }
    }).catch((reason: unknown) => {
      failedQuestions.current.add(question.id);
      setFailedSaveCount(failedQuestions.current.size);
      if (latestSequence.current.get(question.id) === currentSequence) {
        setSaveState({ questionId: question.id, status: "error", message: reason instanceof Error ? reason.message : "Answer did not save." });
      }
      throw reason;
    }).finally(() => setPendingSaves((count) => Math.max(0, count - 1)));
    saveQueue.current = task;
    void task.catch(() => undefined);
  }

  async function completeSession() {
    if (!session) return;
    const unanswered = session.questions.length - session.questions.filter((question) => question.selectedOptionId).length;
    if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Finish this session anyway? Unanswered questions count as incorrect.`)) return;
    if (failedQuestions.current.size > 0) {
      setPageError("At least one answer has not saved. Retry that answer before finishing so the result reflects saved work.");
      return;
    }
    setCompleting(true); setPageError("");
    try {
      await saveQueue.current.catch(() => undefined);
      if (failedQuestions.current.size > 0) throw new Error("An answer could not be saved. Retry it before finishing.");
      const response = await fetch(`/api/learn/sessions/${encodeURIComponent(sessionId)}/complete`, { method: "POST" });
      const body = await response.json() as ApiResponse<LearningSessionView>;
      if (!response.ok || !body.data) throw new Error(body.error?.message || "This session could not be completed.");
      setSession(body.data);
      setActiveIndex(0);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "This session could not be completed.");
    } finally { setCompleting(false); }
  }

  if (loading) return <div className="session-shell"><div className="skeleton" style={{ height: 45, marginBottom: 15 }} /><div className="skeleton" style={{ height: 390 }} /></div>;
  if (!session || pageError && !currentQuestion) return <section className="session-shell card card-pad" role="alert"><div className="empty-symbol"><TriangleAlert size={18} /></div><h1 className="card-title" style={{ marginTop: 13 }}>Session unavailable</h1><p className="card-description">{pageError || "This session could not be loaded."}</p><button className="button button-secondary" type="button" onClick={() => { setLoading(true); setPageError(""); void loadSession(); }} style={{ marginTop: 14 }}>Try again</button></section>;
  if (!currentQuestion) return null;

  const completed = session.status === "completed";
  const result = session.result;
  const answered = Boolean(currentQuestion.selectedOptionId);
  const progress = session.questions.length ? Math.round(((activeIndex + 1) / session.questions.length) * 100) : 0;
  const currentSave = saveState.questionId === currentQuestion.id ? saveState : { questionId: currentQuestion.id, status: "idle" as const };
  const comparisonDelta = result && comparisonBaseline ? result.scorePercent - comparisonBaseline.scorePercent : null;

  return (
    <div className="session-shell">
      <div className="session-topline">
        <div className="session-meta"><Link className="subtle-link" href={session.kind === "diagnostic" ? "/learn/diagnostic" : session.kind === "practice" ? "/learn/practice" : "/learn/reassess"}><ArrowLeft size={13} /> Exit to overview</Link><span style={{ margin: "0 7px", color: "#c0c2ca" }}>·</span>{kinds[session.kind].label}</div>
        <div className="session-progress"><span className="session-meta">Question {activeIndex + 1} of {session.questions.length}</span><div className="session-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div>
      </div>
      {completed && result && <>
        <div className="completion-banner"><div className="completion-banner-icon"><CheckCircle2 size={16} /></div><div><strong>Session saved. Here is what your answers show today.</strong><p>{result.answeredCount} answered · {result.unansweredCount} unanswered · the score uses all {result.totalQuestions} questions.</p></div></div>
        {session.kind === "reassessment" && comparisonBaseline && <div className="completion-banner" style={{ marginBottom: 15, borderColor: "#e3dcf6", background: "#fbf9ff" }}><div className="completion-banner-icon" style={{ background: "#f0ebff", color: "#7c68c5" }}><RotateCcw size={15} /></div><div><strong>Compared with your saved diagnostic</strong><p>Diagnostic {comparisonBaseline.scorePercent}% → reassessment {result.scorePercent}% ({comparisonDelta !== null && comparisonDelta > 0 ? "+" : ""}{comparisonDelta ?? "—"} percentage points). This comparison reflects the exact linked attempts; it is not a permanent mastery claim.</p></div></div>}
        <section className="card card-pad" style={{ marginBottom: 15 }} aria-labelledby="result-summary">
          <div className="card-head"><div><span className="section-kicker">YOUR CHECK-IN</span><h2 className="card-title" id="result-summary" style={{ marginTop: 4 }}>{session.kind === "diagnostic" ? "A clear starting point." : session.kind === "practice" ? "Practice complete." : "A fresh look at your progress."}</h2></div><span className="state-chip state-chip-done"><Check size={11} />Saved</span></div>
          <div className="result-score"><div className="score-circle">{result.scorePercent}%</div><div className="result-copy"><strong>{result.correctCount} of {result.totalQuestions} correct</strong><span>{result.unansweredCount ? `${result.unansweredCount} unanswered counted as incorrect.` : "Based on your saved answers."}</span></div></div>
          <div className="section-kicker">CONCEPT INDICATORS</div>
          <div className="result-concepts">{result.concepts.map((concept) => <div className="result-concept-row" key={concept.concept}>
            <span className="result-concept-name">{concept.label}</span><div className="progress-track"><div className="progress-fill" style={{ width: `${concept.accuracy}%` }} /></div><span className="result-concept-count">{concept.correct}/{concept.total}</span><span className={`state-chip result-concept-status ${concept.isGap ? "state-chip-gap" : "state-chip-done"}`}>{concept.isGap ? "Revisit" : "Looking solid"}</span>
          </div>)}</div>
          <div className="result-actions"><Link className="button button-primary" href={kinds[session.kind].next}>{kinds[session.kind].nextLabel}<ArrowRight size={13} /></Link><Link className="button button-secondary" href="/learn/history">Open history</Link></div>
        </section>
      </>}
      {pageError && <div className="launch-error" role="alert">{pageError}</div>}
      <section className="question-card card" aria-labelledby="question-title">
        <div className="question-labels"><span className="concept-tag">{currentQuestion.conceptLabel}</span><span className="difficulty-tag">{currentQuestion.difficulty === "gentle" ? "Warm-up" : currentQuestion.difficulty === "steady" ? "Practice" : "Stretch"}</span>{completed && <span className={`state-chip ${currentQuestion.isCorrect ? "state-chip-done" : "state-chip-gap"}`}>{currentQuestion.isCorrect ? "Correct" : "Review this one"}</span>}</div>
        <h2 id="question-title" className="question-prompt">{inlineText(currentQuestion.prompt)}</h2>
        <div className="answer-list" role="group" aria-label="Answer options">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentQuestion.selectedOptionId === option.id;
            const isCorrect = completed && currentQuestion.correctOptionId === option.id;
            const isWrongSelected = completed && isSelected && !currentQuestion.isCorrect;
            const classes = ["answer-option", isSelected && !completed ? "answer-option-selected" : "", isCorrect ? "answer-option-correct" : "", isWrongSelected ? "answer-option-incorrect" : ""].filter(Boolean).join(" ");
            return <button className={classes} key={option.id} type="button" disabled={completed || pendingSaves > 0} onClick={() => saveAnswer(currentQuestion, option.id, currentQuestion.confidence)} aria-pressed={isSelected}>
              <span className="option-letter">{String.fromCharCode(65 + index)}</span><span className="option-text">{inlineText(option.text)}</span>
              {isCorrect && <CheckCircle2 className="option-state" size={15} aria-label="Correct answer" />}
              {isWrongSelected && <X className="option-state" size={15} aria-label="Your saved answer" />}
              {!completed && isSelected && currentSave.status === "saving" && <LoaderCircle className="option-state spin" size={14} aria-label="Saving" />}
              {!completed && isSelected && currentSave.status === "saved" && <Check className="option-state" size={14} aria-label="Saved" />}
            </button>;
          })}
        </div>
        {!completed && <div className="confidence-row" aria-label="Optional confidence rating">
          <span className="confidence-label">How sure are you? <span style={{ color: "#aaa" }}>(optional)</span></span>
          {(["guessing", "somewhat", "confident"] as const).map((level) => <button type="button" key={level} className={`confidence-button${currentQuestion.confidence === level ? " confidence-button-selected" : ""}`} aria-pressed={currentQuestion.confidence === level} onClick={() => {
            setSession((current) => current ? { ...current, questions: current.questions.map((question) => question.id === currentQuestion.id ? { ...question, confidence: level } : question) } : current);
            if (currentQuestion.selectedOptionId) saveAnswer(currentQuestion, currentQuestion.selectedOptionId, level);
          }}>{level === "guessing" ? "Taking a guess" : level === "somewhat" ? "Somewhat sure" : "Confident"}</button>)}
          <span className={`save-status${currentSave.status === "error" ? " save-status-error" : ""}`} aria-live="polite">
            {currentSave.status === "saving" ? <><LoaderCircle size={12} className="spin" /> Saving answer…</> : currentSave.status === "saved" ? <><Save size={12} /> Saved to this demo</> : currentSave.status === "error" ? <><TriangleAlert size={12} /> Not saved — choose again to retry</> : <><CircleHelp size={12} /> {answered ? "Previously saved" : "Choose an answer to save"}</>}
          </span>
        </div>}
        {!completed && <div className="session-hint">
          {showHint ? <span><Lightbulb size={12} style={{ verticalAlign: "-2px", marginRight: 5, color: "#9c85d3" }} />{currentQuestion.hint ?? "Think through each step before choosing."}</span> : <button className="button button-quiet" type="button" onClick={() => setShowHint(true)}><Lightbulb size={13} />Show a hint</button>}
        </div>}
        {completed && <div className="feedback-panel"><strong>{currentQuestion.isCorrect ? "Why this works" : currentQuestion.selectedOptionId ? "A helpful explanation" : "Correct answer"}</strong><p>{currentQuestion.explanation ?? "Review this concept and try a new question in your next session."}</p></div>}
        <div className="question-nav" aria-label="Question navigation">{session.questions.map((question, index) => <button key={question.id} type="button" className={`question-nav-button${index === activeIndex ? " question-nav-current" : ""}${question.selectedOptionId && index !== activeIndex ? " question-nav-answered" : ""}`} onClick={() => { setActiveIndex(index); setShowHint(false); }} aria-label={`Go to question ${index + 1}${question.selectedOptionId ? ", answered" : ", unanswered"}`} aria-current={index === activeIndex ? "step" : undefined}>{index + 1}</button>)}</div>
        <div className="session-actions">
          <button className="button button-secondary" type="button" onClick={() => { setActiveIndex((index) => Math.max(0, index - 1)); setShowHint(false); }} disabled={activeIndex === 0}><ArrowLeft size={13} />Previous</button>
          <div className="session-actions-right">
            {activeIndex < session.questions.length - 1
              ? <button className="button button-primary" type="button" onClick={() => { setActiveIndex((index) => Math.min(session.questions.length - 1, index + 1)); setShowHint(false); }}>Next<ArrowRight size={13} /></button>
              : !completed && <button className="button button-primary" type="button" onClick={() => void completeSession()} disabled={completing || pendingSaves > 0 || failedSaveCount > 0}>{completing ? <LoaderCircle size={14} className="spin" /> : <CheckCircle2 size={14} />}{completing ? "Saving session…" : "Finish session"}</button>}
            {completed && <button className="button button-secondary" type="button" onClick={() => setActiveIndex((index) => Math.min(session.questions.length - 1, index + 1))} disabled={activeIndex === session.questions.length - 1}>Next review<ArrowRight size={13} /></button>}
          </div>
        </div>
      </section>
      <p className="session-meta" style={{ marginTop: 13, textAlign: "center" }}>{completed ? "This completed session is read-only." : `${session.answeredCount} of ${session.questions.length} answers saved · Refreshing the page restores the last successful server save.`}</p>
    </div>
  );
}
