"use client";

import { useCallback, useEffect, useState } from "react";

type QuizSummary = {
  id: string; title: string; instructions: string; durationMinutes: number;
  attemptLimit: number; questionCount: number; attemptsUsed: number;
};
type Quiz = Omit<QuizSummary, "questionCount" | "attemptsUsed"> & {
  questions: Array<{ id: string; prompt: string; options: string[]; concept: string }>;
};
type Result = {
  attemptId: string; quizTitle: string; scorePercent: number; correctCount: number;
  totalQuestions: number; answers: Array<{
    questionId: string; prompt: string; selectedOptionIndex: number | null;
    correctOptionIndex: number; isCorrect: boolean; explanation: string; concept: string;
  }>;
};

export function StudentQuizExperience() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
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

  useEffect(() => { void loadQuizzes(); }, [loadQuizzes]);

  async function beginQuiz(id: string) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/student/quizzes/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not open quiz.");
      setSelectedQuiz(payload.data as Quiz);
      setAnswers({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz() {
    if (!selectedQuiz) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/student/quizzes/${encodeURIComponent(selectedQuiz.id)}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not submit quiz.");
      setResult(payload.data as Result);
      setSelectedQuiz(null);
      await loadQuizzes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit quiz.");
    } finally {
      setBusy(false);
    }
  }

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
                <p><strong>Your answer:</strong> {answer.selectedOptionIndex === null ? "Not answered" : answer.selectedOptionIndex + 1 + ". " + ["A", "B", "C", "D"][answer.selectedOptionIndex] + " — " + (answer.selectedOptionIndex === null ? "" : answer.selectedOptionIndex >= 0 ? "" : "")}</p>
                <p><strong>Correct answer:</strong> {["A", "B", "C", "D"][answer.correctOptionIndex]}</p>
                <p>{answer.explanation}</p>
              </article>
            ))}
          </div>
          <button className="student-primary-button" onClick={() => setResult(null)}>Back to quizzes</button>
        </div>
      ) : selectedQuiz ? (
        <div className="student-active-quiz">
          <div className="student-active-heading">
            <button className="student-text-button" onClick={() => { setSelectedQuiz(null); setAnswers({}); }}>← All quizzes</button>
            <span>{selectedQuiz.durationMinutes} min · {selectedQuiz.questions.length} questions</span>
          </div>
          <h2>{selectedQuiz.title}</h2>
          {selectedQuiz.instructions && <p className="student-quiz-instructions">{selectedQuiz.instructions}</p>}
          {selectedQuiz.questions.map((question, index) => (
            <fieldset className="student-question-card" key={question.id}>
              <legend><span>Question {index + 1}</span>{question.prompt}</legend>
              <p className="student-question-concept">{question.concept}</p>
              <div className="student-option-list">
                {question.options.map((option, optionIndex) => (
                  <label className={answers[question.id] === optionIndex ? "student-option is-selected" : "student-option"} key={optionIndex}>
                    <input type="radio" name={question.id} value={optionIndex} checked={answers[question.id] === optionIndex}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} />
                    <span className="student-option-letter">{["A", "B", "C", "D"][optionIndex]}</span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="student-submit-row">
            <span>{Object.keys(answers).length} of {selectedQuiz.questions.length} answered</span>
            <button className="student-primary-button" disabled={busy} onClick={() => void submitQuiz()}>
              {busy ? "Submitting…" : "Submit answers"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="student-quiz-list-heading">
            <div><h2>Ready when you are</h2><p>Pick a quiz to begin. Your score appears as soon as you submit.</p></div>
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
                    <button disabled={busy || remaining === 0} onClick={() => void beginQuiz(quiz.id)}>{remaining === 0 ? "Limit reached" : "Start quiz"} <span aria-hidden="true">→</span></button>
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
