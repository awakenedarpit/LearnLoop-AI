"use client";

import { useCallback, useEffect, useState } from "react";

type QuizSummary = {
  id: string; title: string; instructions: string; durationMinutes: number;
  attemptLimit: number; questionCount: number; attemptsUsed: number;
};
type Quiz = Omit<QuizSummary, "questionCount" | "attemptsUsed"> & {
  questions: Array<{ id: string; prompt: string; options: string[]; concept: string }>;
};
type ActiveAttempt = { attemptId: string; quizId: string; startedAt: string; expiresAt: string; answers: Record<string, number>; status: "in_progress" | "submitted" | "expired" };
type Result = {
  attemptId: string; quizTitle: string; scorePercent: number; correctCount: number;
  totalQuestions: number; answers: Array<{
    questionId: string; prompt: string; selectedOptionIndex: number | null; selectedAnswer: string | null;
    correctOptionIndex: number; correctAnswer: string; isCorrect: boolean; explanation: string; concept: string;
  }>;
};

export function StudentQuizExperience() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  // eslint-disable-next-line react-hooks/purity -- This clock only drives display; the server remains authoritative for deadlines.
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/quizzes", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not load quizzes.");
      setQuizzes(payload.data as QuizSummary[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load quizzes.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional initial fetch synchronizes this client view with server data.
  useEffect(() => { void loadQuizzes(); }, [loadQuizzes]);

  async function beginQuiz(id: string) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/student/quizzes/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not open quiz.");
      const attemptResponse = await fetch(`/api/student/quizzes/${encodeURIComponent(id)}/attempts/start`, { method: "POST" });
      const attemptPayload = await attemptResponse.json();
      if (!attemptResponse.ok) throw new Error(attemptPayload.error?.message ?? "Could not start quiz.");
      setSelectedQuiz(payload.data as Quiz);
      setActiveAttempt(attemptPayload.data as ActiveAttempt);
      setAnswers(attemptPayload.data.answers as Record<string, number>);
      setSaveState("saved");
      // eslint-disable-next-line react-hooks/purity -- Refresh the display clock after the user starts/resumes an attempt.
      setNow(Date.now());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz() {
    if (!selectedQuiz || !activeAttempt) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/student/quizzes/${encodeURIComponent(selectedQuiz.id)}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: activeAttempt.attemptId, answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not submit quiz.");
      setResult(payload.data as Result);
      setSelectedQuiz(null);
      setActiveAttempt(null);
      await loadQuizzes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit quiz.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!activeAttempt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeAttempt]);

  useEffect(() => {
    if (!selectedQuiz || !activeAttempt || result || busy) return;
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/student/quizzes/${encodeURIComponent(selectedQuiz.id)}/attempts/${encodeURIComponent(activeAttempt.attemptId)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message ?? "Could not save answers.");
        setSaveState("saved");
      } catch (caught) {
        setSaveState("unsaved");
        setError(caught instanceof Error ? caught.message : "Answers are not saved yet.");
      }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [answers, selectedQuiz, activeAttempt, result, busy]);



  useEffect(() => {
    if (!activeAttempt || !selectedQuiz || busy || Date.parse(activeAttempt.expiresAt) > now) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Deadline expiry is an external timer event that must trigger submission.
    void submitQuiz();
    // The API checks its own deadline and grades only acknowledged saved answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, activeAttempt, selectedQuiz, busy]);

  if (loading) return <div className="student-quiz-state" role="status">Loading available quizzes…</div>;

  return (
    <section className="student-quiz-workspace" aria-label="Available quizzes">
      {error && <p className="student-quiz-error" role="alert">{error}</p>}
      {result ? (
        <div className="student-result-panel">
          <p className="student-quiz-kicker">QUIZ COMPLETE</p>
          <h2>{result.scorePercent}%</h2>
          <p className="student-result-summary">{result.correctCount} of {result.totalQuestions} correct in {result.quizTitle}</p>
          <div className="student-result-list">
            {result.answers.map((answer, index) => (
              <article className={answer.isCorrect ? "student-result-item is-correct" : "student-result-item is-incorrect"} key={answer.questionId}>
                <p className="student-result-index">QUESTION {index + 1} · {answer.concept}</p>
                <h3>{answer.prompt}</h3>
                <p><strong>Your answer:</strong> {answer.selectedOptionIndex === null ? "Not answered" : `${["A", "B", "C", "D"][answer.selectedOptionIndex]}. ${answer.selectedAnswer ?? ""}`}</p>
                <p><strong>Correct answer:</strong> {`${["A", "B", "C", "D"][answer.correctOptionIndex]}. ${answer.correctAnswer}`}</p>
                <p>{answer.explanation}</p>
              </article>
            ))}
          </div>
          <button className="student-primary-button" onClick={() => setResult(null)}>Back to quizzes</button>
        </div>
      ) : selectedQuiz ? (
        <div className="student-active-quiz">
          <div className="student-active-heading">
            <button className="student-text-button" onClick={() => { setSelectedQuiz(null); setActiveAttempt(null); setAnswers({}); }}>← All quizzes</button>
            <span className={activeAttempt && Date.parse(activeAttempt.expiresAt) - now < 60000 ? "student-quiz-timer is-urgent" : "student-quiz-timer"}>Time left {activeAttempt ? `${String(Math.floor(Math.max(0, Date.parse(activeAttempt.expiresAt) - now) / 60000)).padStart(2, "0")}:${String(Math.floor((Math.max(0, Date.parse(activeAttempt.expiresAt) - now) % 60000) / 1000)).padStart(2, "0")}` : "--:--"}</span>
          </div>
          <h2>{selectedQuiz.title}</h2>
          <p className="student-save-status" role="status">{saveState === "saved" ? "✓ All answers saved" : saveState === "saving" ? "Saving answers…" : "Unsaved changes"} · {selectedQuiz.durationMinutes} min · {selectedQuiz.questions.length} questions</p>
          {selectedQuiz.instructions && <p className="student-quiz-instructions">{selectedQuiz.instructions}</p>}
          {selectedQuiz.questions.map((question, index) => (
            <fieldset className="student-question-card" key={question.id}>
              <legend><span>Question {index + 1}</span>{question.prompt}</legend>
              <p className="student-question-concept">{question.concept}</p>
              <div className="student-option-list">
                {question.options.map((option, optionIndex) => (
                  <label className={answers[question.id] === optionIndex ? "student-option is-selected" : "student-option"} key={optionIndex}>
                    <input type="radio" name={question.id} value={optionIndex} checked={answers[question.id] === optionIndex}
                      disabled={busy || (activeAttempt !== null && Date.parse(activeAttempt.expiresAt) <= now)}
                      onChange={() => { setSaveState("unsaved"); setAnswers((current) => ({ ...current, [question.id]: optionIndex })); }} />
                    <span className="student-option-letter">{["A", "B", "C", "D"][optionIndex]}</span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="student-submit-row">
            <span>{Object.keys(answers).length} of {selectedQuiz.questions.length} answered · {saveState === "saved" ? "saved on server" : "save pending"}</span>
            <button className="student-primary-button" disabled={busy} onClick={() => void submitQuiz()}>
              {busy ? "Submitting…" : "Submit answers"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="student-quiz-list-heading">
            <div><h2>Ready when you are</h2><p>Pick a quiz to begin. Answers autosave and active attempts can be resumed after refresh.</p></div>
            <button className="student-text-button" onClick={() => void loadQuizzes()}>Refresh</button>
          </div>
          {quizzes.length === 0 ? (
            <div className="student-quiz-empty"><span>✦</span><h3>No published quizzes yet</h3><p>When your teacher publishes a quiz, it will show up here.</p></div>
          ) : (
            <div className="student-quiz-grid">
              {quizzes.map((quiz) => {
                const remaining = Math.max(quiz.attemptLimit - quiz.attemptsUsed, 0);
                return <article className="student-quiz-card" key={quiz.id}>
                  <div className="student-quiz-card-icon">✦</div>
                  <div className="student-quiz-card-meta"><span>{quiz.questionCount} questions</span><span>{quiz.durationMinutes} min</span></div>
                  <h3>{quiz.title}</h3>
                  <p>{quiz.instructions || "Check your understanding and review the explanations after submitting."}</p>
                  <div className="student-quiz-card-footer">
                    <span>{remaining} {remaining === 1 ? "attempt" : "attempts"} left</span>
                    <button disabled={busy || remaining === 0} onClick={() => void beginQuiz(quiz.id)}>{remaining === 0 ? "Limit reached" : "Start / resume"} <span aria-hidden="true">→</span></button>
                  </div>
                </article>;
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
