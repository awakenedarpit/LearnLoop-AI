"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronRight, CirclePlus, Clock3, Eye, FilePlus2, LoaderCircle, PencilLine, Plus, Send, Trash2 } from "lucide-react";

type QuestionDraft = {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  concept: string;
};

type Quiz = {
  id: string;
  title: string;
  instructions: string;
  durationMinutes: number;
  availableFrom: string | null;
  availableUntil: string | null;
  attemptLimit: number;
  status: "draft" | "published";
  questions: QuestionDraft[];
  createdAt: string;
  updatedAt: string;
};

type QuizDraft = Omit<Quiz, "id" | "status" | "questions" | "createdAt" | "updatedAt"> & { questions: QuestionDraft[] };

const blankQuestion = (): QuestionDraft => ({
  id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  prompt: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  explanation: "",
  concept: "Python fundamentals",
});

const initialDraft = (): QuizDraft => ({
  title: "",
  instructions: "Choose the best answer for each question.",
  durationMinutes: 20,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 1,
  questions: [blankQuestion()],
});

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function readableDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TeacherQuizBuilder() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [draft, setDraft] = useState<QuizDraft>(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "editor" | "preview">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/quizzes", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to load quizzes.");
      setQuizzes(result.data as Quiz[]);
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to load quizzes." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuizzes(); }, [loadQuizzes]);

  function startNew() {
    setEditingId(null);
    setDraft(initialDraft());
    setNotice(null);
    setView("editor");
  }

  function editQuiz(quiz: Quiz) {
    setEditingId(quiz.id);
    setDraft({
      title: quiz.title,
      instructions: quiz.instructions,
      durationMinutes: quiz.durationMinutes,
      availableFrom: quiz.availableFrom,
      availableUntil: quiz.availableUntil,
      attemptLimit: quiz.attemptLimit,
      questions: quiz.questions.map((question) => ({ ...question, options: [...question.options] })),
    });
    setNotice(null);
    setView("editor");
  }

  function updateDraft<K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateQuestion(id: string, patch: Partial<QuestionDraft>) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question),
    }));
  }

  function updateOption(question: QuestionDraft, index: number, value: string) {
    updateQuestion(question.id, { options: question.options.map((option, optionIndex) => optionIndex === index ? value : option) });
  }

  function validate(): string | null {
    if (draft.title.trim().length < 3) return "Give the quiz a title of at least 3 characters.";
    if (!draft.questions.length) return "Add at least one question.";
    for (let index = 0; index < draft.questions.length; index += 1) {
      const question = draft.questions[index];
      if (question.prompt.trim().length < 5) return `Question ${index + 1}: add a complete question prompt.`;
      if (question.options.some((option) => !option.trim())) return `Question ${index + 1}: fill in all four answer options.`;
      if (!question.concept.trim()) return `Question ${index + 1}: add a concept tag.`;
    }
    if (draft.availableFrom && draft.availableUntil && draft.availableUntil <= draft.availableFrom) return "The availability end must be after the start.";
    return null;
  }

  async function saveDraft(publish = false) {
    const validation = validate();
    if (validation) {
      setNotice({ kind: "error", message: validation });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        ...draft,
        availableFrom: draft.availableFrom ? new Date(draft.availableFrom).toISOString() : null,
        availableUntil: draft.availableUntil ? new Date(draft.availableUntil).toISOString() : null,
        questions: draft.questions.map(({ id: _id, ...question }) => ({
          ...question,
          prompt: question.prompt.trim(),
          options: question.options.map((option) => option.trim()),
          explanation: question.explanation.trim(),
          concept: question.concept.trim(),
        })),
      };
      const response = await fetch(editingId ? `/api/teacher/quizzes/${editingId}` : "/api/teacher/quizzes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to save quiz.");
      let saved = result.data as Quiz;
      if (publish) {
        const publishResponse = await fetch(`/api/teacher/quizzes/${saved.id}/publish`, { method: "POST" });
        const publishResult = await publishResponse.json();
        if (!publishResponse.ok) throw new Error(publishResult.error?.message ?? "Unable to publish quiz.");
        saved = publishResult.data as Quiz;
      }
      setEditingId(saved.id);
      setNotice({ kind: "success", message: publish ? "Quiz published in this demo workspace." : "Draft saved. You can return to edit it any time." });
      await loadQuizzes();
      if (publish) setView("list");
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to save quiz." });
    } finally {
      setSaving(false);
    }
  }

  if (loading && view === "list") {
    return <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 10 }}><LoaderCircle size={18} className="animate-spin" /> Loading your quiz workspace…</div>;
  }

  return (
    <div className="teacher-builder">
      {view === "list" ? (
        <>
          <div className="builder-toolbar">
            <div><p className="eyebrow">ASSESSMENT LIBRARY</p><h2 className="card-title" style={{ fontSize: 20, marginTop: 5 }}>Your quizzes</h2><p className="card-description">Create a draft, review the student preview, then publish it.</p></div>
            <button className="button button-primary" onClick={startNew}><FilePlus2 size={15} /> Create quiz</button>
          </div>
          {notice && <div className={`builder-notice builder-notice-${notice.kind}`} role="status">{notice.message}</div>}
          {quizzes.length === 0 ? (
            <section className="card builder-empty">
              <div className="learning-card-icon"><FilePlus2 size={18} /></div>
              <h3 className="card-title" style={{ marginTop: 13 }}>Start with your first assessment</h3>
              <p className="card-description" style={{ maxWidth: 460 }}>Write your own multiple-choice questions, set a time limit, add explanations, and preview exactly what a learner will see.</p>
              <button className="button button-primary" onClick={startNew} style={{ marginTop: 18 }}><Plus size={15} /> Build a quiz</button>
            </section>
          ) : (
            <div className="builder-quiz-list">
              {quizzes.map((quiz) => (
                <article className="card builder-quiz-row" key={quiz.id}>
                  <div className="builder-quiz-icon"><FilePlus2 size={17} /></div>
                  <div className="builder-quiz-copy"><div className="builder-quiz-title-line"><h3>{quiz.title}</h3><span className={`state-chip ${quiz.status === "published" ? "state-chip-positive" : "state-chip-neutral"}`}>{quiz.status}</span></div><p>{quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"} · {quiz.durationMinutes} min · {quiz.attemptLimit} {quiz.attemptLimit === 1 ? "attempt" : "attempts"}</p><small>Updated {readableDate(quiz.updatedAt)}</small></div>
                  {quiz.status === "draft" ? <button className="button button-secondary" onClick={() => editQuiz(quiz)}><PencilLine size={14} /> Edit draft</button> : <span className="builder-published-label"><Check size={14} /> Published</span>}
                </article>
              ))}
            </div>
          )}
          <div className="disclaimer" style={{ marginTop: 18 }}>Demo-only authoring: this workspace has no authenticated teacher accounts, class assignments, or shared cloud storage. Publishing changes the demo quiz status only; it does not assign the quiz to students.</div>
        </>
      ) : view === "preview" ? (
        <section className="card card-pad">
          <button className="button button-quiet" onClick={() => setView("editor")}><ArrowLeft size={14} /> Back to editor</button>
          <div className="preview-heading"><span className="state-chip state-chip-neutral">STUDENT PREVIEW</span><h2 className="page-title" style={{ fontSize: 27, marginTop: 12 }}>{draft.title || "Untitled quiz"}</h2><p className="page-subtitle">{draft.instructions || "No instructions provided."}</p><div className="preview-meta"><span><Clock3 size={14} /> {draft.durationMinutes} minutes</span><span>{draft.questions.length} questions</span></div></div>
          {draft.questions.map((question, index) => <article className="preview-question" key={question.id}><p className="eyebrow">QUESTION {String(index + 1).padStart(2, "0")}</p><h3>{question.prompt || "Your question prompt will appear here."}</h3><div className="preview-options">{question.options.map((option, optionIndex) => <div className="preview-option" key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}</span>{option || `Option ${optionIndex + 1}`}</div>)}</div></article>)}
          <button className="button button-secondary" onClick={() => setView("editor")}><PencilLine size={14} /> Continue editing</button>
        </section>
      ) : (
        <>
          <div className="builder-toolbar"><div><button className="button button-quiet" onClick={() => { setView("list"); setNotice(null); }}><ArrowLeft size={14} /> All quizzes</button><h2 className="card-title" style={{ fontSize: 20, marginTop: 9 }}>{editingId ? "Edit quiz draft" : "Create a quiz"}</h2><p className="card-description">Start simple. You can review every question before publishing.</p></div><button className="button button-secondary" onClick={() => setView("preview")}><Eye size={14} /> Preview</button></div>
          {notice && <div className={`builder-notice builder-notice-${notice.kind}`} role="alert">{notice.message}</div>}
          <section className="card card-pad builder-form-section">
            <div className="builder-section-heading"><span>01</span><div><h3>Quiz details</h3><p>Give students the context they need.</p></div></div>
            <label className="builder-label">Quiz title <input value={draft.title} maxLength={120} onChange={(event) => updateDraft("title", event.target.value)} placeholder="e.g. Python fundamentals check-in" /></label>
            <label className="builder-label">Instructions <textarea value={draft.instructions} maxLength={2000} rows={3} onChange={(event) => updateDraft("instructions", event.target.value)} placeholder="Explain what students should do before they begin." /></label>
            <div className="builder-field-grid">
              <label className="builder-label">Time limit (minutes)<input type="number" min={1} max={240} value={draft.durationMinutes} onChange={(event) => updateDraft("durationMinutes", Math.max(1, Math.min(240, Number(event.target.value) || 1)))} /></label>
              <label className="builder-label">Attempt limit<input type="number" min={1} max={10} value={draft.attemptLimit} onChange={(event) => updateDraft("attemptLimit", Math.max(1, Math.min(10, Number(event.target.value) || 1)))} /></label>
            </div>
            <div className="builder-field-grid">
              <label className="builder-label">Available from (optional)<input type="datetime-local" value={localDateTime(draft.availableFrom)} onChange={(event) => updateDraft("availableFrom", event.target.value || null)} /></label>
              <label className="builder-label">Available until (optional)<input type="datetime-local" value={localDateTime(draft.availableUntil)} onChange={(event) => updateDraft("availableUntil", event.target.value || null)} /></label>
            </div>
          </section>
          <div className="builder-questions-heading"><div><p className="eyebrow">02 · QUESTION DESIGN</p><h3>Questions <span>{draft.questions.length}</span></h3><p className="card-description">Four options, one correct answer, and an explanation for review.</p></div><button className="button button-secondary" onClick={() => updateDraft("questions", [...draft.questions, blankQuestion()])}><CirclePlus size={15} /> Add question</button></div>
          <div className="builder-question-list">
            {draft.questions.map((question, questionIndex) => (
              <section className="card card-pad builder-question-card" key={question.id}>
                <div className="builder-question-top"><div className="builder-question-number">{String(questionIndex + 1).padStart(2, "0")}</div><div><h4>Question {questionIndex + 1}</h4><p>Multiple choice · Single answer</p></div>{draft.questions.length > 1 && <button className="builder-icon-button" aria-label={`Remove question ${questionIndex + 1}`} onClick={() => updateDraft("questions", draft.questions.filter((item) => item.id !== question.id))}><Trash2 size={15} /></button>}</div>
                <label className="builder-label">Question prompt<textarea rows={3} value={question.prompt} maxLength={1000} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} placeholder="Write a clear question…" /></label>
                <div className="builder-options-heading"><span>ANSWER OPTIONS</span><small>Select the radio button beside the correct answer</small></div>
                <div className="builder-option-fields">{question.options.map((option, optionIndex) => <label className={`builder-option-field ${question.correctOptionIndex === optionIndex ? "builder-option-correct" : ""}`} key={optionIndex}><input type="radio" name={`correct-${question.id}`} checked={question.correctOptionIndex === optionIndex} onChange={() => updateQuestion(question.id, { correctOptionIndex: optionIndex })} aria-label={`Mark option ${String.fromCharCode(65 + optionIndex)} correct`} /><span>{String.fromCharCode(65 + optionIndex)}</span><input aria-label={`Option ${String.fromCharCode(65 + optionIndex)} text`} value={option} maxLength={300} onChange={(event) => updateOption(question, optionIndex, event.target.value)} placeholder={`Answer option ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</div>
                <div className="builder-field-grid"><label className="builder-label">Concept tag<input value={question.concept} maxLength={80} onChange={(event) => updateQuestion(question.id, { concept: event.target.value })} placeholder="e.g. Loops" /></label><label className="builder-label">Explanation (optional)<input value={question.explanation} maxLength={1500} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} placeholder="Explain why the correct option works." /></label></div>
              </section>
            ))}
          </div>
          <div className="builder-submit-bar"><div><strong>{draft.questions.length} {draft.questions.length === 1 ? "question" : "questions"}</strong><span>{draft.durationMinutes} minute limit · {editingId ? "Draft changes" : "New draft"}</span></div><div><button className="button button-secondary" disabled={saving} onClick={() => void saveDraft(false)}>{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save draft</button><button className="button button-primary" disabled={saving} onClick={() => void saveDraft(true)}>{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} Publish quiz <ChevronRight size={14} /></button></div></div>
          <div className="disclaimer" style={{ marginTop: 16 }}>Publishing locks this quiz draft in the demo. Student delivery and class assignment are separate upcoming features.</div>
        </>
      )}
    </div>
  );
}
