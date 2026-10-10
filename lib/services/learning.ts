import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { CONCEPTS, conceptLabel, type ConfidenceLevel, type LearningKind, type QuestionOption } from "@/lib/learning/catalog";
import { calculateLearningScore } from "@/lib/learning/scoring";
import { DEMO_STUDENT_ID, getDemoDatabase } from "@/lib/db/demo-store";

export class LearningServiceError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "LEARNING_REQUEST_INVALID") {
    super(message);
    this.name = "LearningServiceError";
  }
}

type QuestionRow = {
  question_id: string;
  concept: string;
  question_order: number;
  difficulty: "gentle" | "steady" | "stretch";
  prompt: string;
  options_json: string;
  correct_option_id: string;
  explanation: string;
  hint: string;
};

type SessionRow = {
  session_id: string;
  student_id: string;
  kind: LearningKind;
  status: "in_progress" | "completed";
  question_ids_json: string;
  comparison_session_id: string | null;
  score_percent: number | null;
  correct_count: number | null;
  answered_count: number | null;
  total_questions: number;
  gaps_json: string | null;
  started_at: string;
  completed_at: string | null;
};

type ResponseRow = {
  question_id: string;
  selected_option_id: string;
  confidence: ConfidenceLevel | null;
  is_correct: number;
  answered_at: string;
};

export type ConceptResult = {
  concept: string;
  label: string;
  correct: number;
  total: number;
  accuracy: number;
  isGap: boolean;
};

export type LearningResult = {
  scorePercent: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  unansweredCount: number;
  concepts: ConceptResult[];
  gaps: string[];
  completedAt: string;
};

export type LearningQuestionView = {
  id: string;
  concept: string;
  conceptLabel: string;
  order: number;
  difficulty: "gentle" | "steady" | "stretch";
  prompt: string;
  options: QuestionOption[];
  selectedOptionId: string | null;
  confidence: ConfidenceLevel | null;
  correctOptionId?: string;
  isCorrect?: boolean;
  explanation?: string;
  hint?: string;
  savedAt?: string;
};

export type LearningSessionView = {
  id: string;
  kind: LearningKind;
  status: "in_progress" | "completed";
  startedAt: string;
  completedAt: string | null;
  comparisonSessionId: string | null;
  questions: LearningQuestionView[];
  answeredCount: number;
  result: LearningResult | null;
};

const parseQuestion = (row: QuestionRow) => ({
  id: row.question_id,
  concept: row.concept,
  order: row.question_order,
  difficulty: row.difficulty,
  prompt: row.prompt,
  options: JSON.parse(row.options_json) as QuestionOption[],
  correctOptionId: row.correct_option_id,
  explanation: row.explanation,
  hint: row.hint,
});

const getQuestion = (db: DatabaseSync, questionId: string) => db
  .prepare("SELECT * FROM question_bank WHERE question_id = ?")
  .get(questionId) as QuestionRow | undefined;

function latestDiagnostic(db: DatabaseSync): SessionRow | undefined {
  return db.prepare(`
    SELECT * FROM learning_sessions
    WHERE student_id = ? AND kind = 'diagnostic' AND status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `).get(DEMO_STUDENT_ID) as SessionRow | undefined;
}

function previousDiagnosticGaps(db: DatabaseSync): string[] {
  const session = latestDiagnostic(db);
  if (!session) return [];
  return JSON.parse(session.gaps_json || "[]") as string[];
}

function selectQuestionRows(db: DatabaseSync, kind: LearningKind): QuestionRow[] {
  const usedRows = db.prepare(`
    SELECT DISTINCT r.question_id
    FROM learning_responses r
    JOIN learning_sessions s ON s.session_id = r.session_id
    WHERE s.student_id = ?
  `).all(DEMO_STUDENT_ID) as Array<{ question_id: string }>;
  const used = new Set(usedRows.map((row) => row.question_id));
  const gaps = previousDiagnosticGaps(db);
  const targetConcepts = kind === "diagnostic"
    ? CONCEPTS.map((concept) => concept.id)
    : kind === "practice"
      ? (gaps.length ? gaps : latestDiagnostic(db) ? [] : CONCEPTS.map((concept) => concept.id))
      : (gaps.length ? gaps : CONCEPTS.map((concept) => concept.id));

  const allQuestions = db.prepare("SELECT * FROM question_bank ORDER BY concept, question_order")
    .all() as QuestionRow[];
  const chosen: QuestionRow[] = [];
  for (const concept of targetConcepts) {
    const candidates = allQuestions.filter((question) => question.concept === concept);
    if (kind === "diagnostic") {
      // The first diagnostic is balanced across all six concepts. Later attempts prefer unseen variants.
      const fresh = candidates.find((question) => !used.has(question.question_id));
      const first = candidates.find((question) => question.question_order === 1);
      if (fresh ?? first) chosen.push((fresh ?? first)!);
    } else {
      const fresh = candidates.find((question) => !used.has(question.question_id));
      if (fresh) chosen.push(fresh);
    }
  }
  return chosen;
}

function resultForSession(db: DatabaseSync, session: SessionRow): LearningResult {
  const questionIds = JSON.parse(session.question_ids_json) as string[];
  const responses = db.prepare("SELECT * FROM learning_responses WHERE session_id = ?")
    .all(session.session_id) as ResponseRow[];
  const questions = questionIds.map((id) => getQuestion(db, id)).filter(Boolean) as QuestionRow[];
  return calculateLearningScore(
    questions.map((question) => ({ id: question.question_id, concept: question.concept, correctOptionId: question.correct_option_id })),
    responses.map((response) => ({ questionId: response.question_id, selectedOptionId: response.selected_option_id })),
    session.completed_at || new Date().toISOString(),
  );
}

function sessionView(db: DatabaseSync, session: SessionRow): LearningSessionView {
  const questionIds = JSON.parse(session.question_ids_json) as string[];
  const responseRows = db.prepare("SELECT * FROM learning_responses WHERE session_id = ?")
    .all(session.session_id) as ResponseRow[];
  const responseById = new Map(responseRows.map((row) => [row.question_id, row]));
  const includeKeys = session.status === "completed";
  const questions = questionIds.map((questionId) => {
    const row = getQuestion(db, questionId);
    if (!row) return null;
    const question = parseQuestion(row);
    const response = responseById.get(questionId);
    return {
      id: question.id,
      concept: question.concept,
      conceptLabel: conceptLabel(question.concept),
      order: question.order,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: question.options,
      selectedOptionId: response?.selected_option_id ?? null,
      confidence: response?.confidence ?? null,
      savedAt: response?.answered_at,
      hint: question.hint,
      ...(includeKeys ? {
        correctOptionId: question.correctOptionId,
        isCorrect: response?.is_correct === 1,
        explanation: question.explanation,
      } : {}),
    } satisfies LearningQuestionView;
  }).filter((question) => question !== null);
  return {
    id: session.session_id,
    kind: session.kind,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    comparisonSessionId: session.comparison_session_id,
    questions,
    answeredCount: responseRows.length,
    result: session.status === "completed" ? resultForSession(db, session) : null,
  };
}

export function findActiveSession(kind: LearningKind): LearningSessionView | null {
  const db = getDemoDatabase();
  const session = db.prepare(`
    SELECT * FROM learning_sessions
    WHERE student_id = ? AND kind = ? AND status = 'in_progress'
    ORDER BY started_at DESC LIMIT 1
  `).get(DEMO_STUDENT_ID, kind) as SessionRow | undefined;
  return session ? sessionView(db, session) : null;
}

export function createLearningSession(kind: LearningKind): LearningSessionView {
  const db = getDemoDatabase();
  const questions = selectQuestionRows(db, kind);
  if (!questions.length) {
    throw new LearningServiceError(
      kind === "practice" ? "No unattempted practice questions are available for the current concept gaps." : "There are no fresh questions available for this session yet.",
      409,
      "NO_FRESH_QUESTIONS",
    );
  }
  const latest = latestDiagnostic(db);
  const comparisonId = kind === "reassessment" ? latest?.session_id ?? null : null;
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO learning_sessions
      (session_id, student_id, kind, status, question_ids_json, comparison_session_id,
       total_questions, started_at, created_at)
    VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?, ?)
  `).run(id, DEMO_STUDENT_ID, kind, JSON.stringify(questions.map((question) => question.question_id)), comparisonId, questions.length, startedAt, startedAt);
  const created = db.prepare("SELECT * FROM learning_sessions WHERE session_id = ?").get(id) as SessionRow;
  return sessionView(db, created);
}

export function getLearningSession(sessionId: string): LearningSessionView {
  const db = getDemoDatabase();
  const row = db.prepare("SELECT * FROM learning_sessions WHERE session_id = ? AND student_id = ?")
    .get(sessionId, DEMO_STUDENT_ID) as SessionRow | undefined;
  if (!row) throw new LearningServiceError("Learning session not found.", 404, "SESSION_NOT_FOUND");
  return sessionView(db, row);
}

export function saveLearningAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionId: string,
  confidence: ConfidenceLevel | null,
): { savedAt: string; questionId: string } {
  const db = getDemoDatabase();
  const session = db.prepare("SELECT * FROM learning_sessions WHERE session_id = ? AND student_id = ?")
    .get(sessionId, DEMO_STUDENT_ID) as SessionRow | undefined;
  if (!session) throw new LearningServiceError("Learning session not found.", 404, "SESSION_NOT_FOUND");
  if (session.status !== "in_progress") throw new LearningServiceError("This learning session is already complete.", 409, "SESSION_COMPLETED");
  const questionIds = JSON.parse(session.question_ids_json) as string[];
  if (!questionIds.includes(questionId)) throw new LearningServiceError("This question is not part of the session.", 403, "QUESTION_NOT_ASSIGNED");
  const question = getQuestion(db, questionId);
  if (!question) throw new LearningServiceError("Question not found.", 404, "QUESTION_NOT_FOUND");
  const optionExists = (JSON.parse(question.options_json) as QuestionOption[]).some((option) => option.id === selectedOptionId);
  if (!optionExists) throw new LearningServiceError("Choose one of the available answer options.", 422, "OPTION_INVALID");
  const savedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO learning_responses
      (session_id, question_id, selected_option_id, confidence, is_correct, answered_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, question_id) DO UPDATE SET
      selected_option_id = excluded.selected_option_id,
      confidence = excluded.confidence,
      is_correct = excluded.is_correct,
      answered_at = excluded.answered_at
  `).run(sessionId, questionId, selectedOptionId, confidence, Number(selectedOptionId === question.correct_option_id), savedAt);
  return { savedAt, questionId };
}

export function completeLearningSession(sessionId: string): LearningSessionView {
  const db = getDemoDatabase();
  const session = db.prepare("SELECT * FROM learning_sessions WHERE session_id = ? AND student_id = ?")
    .get(sessionId, DEMO_STUDENT_ID) as SessionRow | undefined;
  if (!session) throw new LearningServiceError("Learning session not found.", 404, "SESSION_NOT_FOUND");
  if (session.status === "completed") return sessionView(db, session);
  const completedAt = new Date().toISOString();
  const result = resultForSession(db, { ...session, completed_at: completedAt });
  const update = db.prepare(`
    UPDATE learning_sessions SET status = 'completed', score_percent = ?, correct_count = ?,
      answered_count = ?, gaps_json = ?, completed_at = ?
    WHERE session_id = ? AND student_id = ? AND status = 'in_progress'
  `).run(result.scorePercent, result.correctCount, result.answeredCount, JSON.stringify(result.gaps), completedAt, sessionId, DEMO_STUDENT_ID);
  if (update.changes === 0) {
    const refreshed = db.prepare("SELECT * FROM learning_sessions WHERE session_id = ?").get(sessionId) as SessionRow;
    return sessionView(db, refreshed);
  }
  const finalized = db.prepare("SELECT * FROM learning_sessions WHERE session_id = ?").get(sessionId) as SessionRow;
  return sessionView(db, finalized);
}

export type ProgressOverview = {
  mode: "local_demo";
  studentLabel: string;
  completedSessions: number;
  latestDiagnostic: { id: string; scorePercent: number; correctCount: number; totalQuestions: number; completedAt: string } | null;
  latestReassessment: { id: string; scorePercent: number; correctCount: number; totalQuestions: number; completedAt: string; comparisonSessionId: string | null } | null;
  scoreChange: number | null;
  concepts: Array<{ concept: string; label: string; accuracy: number | null; isGap: boolean | null }>;
  recommendedConcepts: string[];
  recentSessions: Array<{ id: string; kind: LearningKind; status: string; scorePercent: number | null; totalQuestions: number; completedAt: string | null; startedAt: string }>;
};

export function getProgressOverview(): ProgressOverview {
  const db = getDemoDatabase();
  const rows = db.prepare(`
    SELECT * FROM learning_sessions WHERE student_id = ?
    ORDER BY COALESCE(completed_at, started_at) DESC LIMIT 20
  `).all(DEMO_STUDENT_ID) as SessionRow[];
  const completed = rows.filter((row) => row.status === "completed");
  const diagnostic = completed.find((row) => row.kind === "diagnostic");
  const reassessment = completed.find((row) => row.kind === "reassessment");
  const diagnosticResult = diagnostic ? resultForSession(db, diagnostic) : null;
  const reassessmentResult = reassessment ? resultForSession(db, reassessment) : null;
  const comparisonDiagnostic = reassessment?.comparison_session_id
    ? db.prepare("SELECT * FROM learning_sessions WHERE session_id = ? AND student_id = ? AND kind = 'diagnostic' AND status = 'completed'")
      .get(reassessment.comparison_session_id, DEMO_STUDENT_ID) as SessionRow | undefined
    : undefined;
  const comparisonDiagnosticResult = comparisonDiagnostic ? resultForSession(db, comparisonDiagnostic) : null;
  const conceptResults = diagnosticResult?.concepts ?? [];
  const conceptById = new Map(conceptResults.map((item) => [item.concept, item]));
  return {
    mode: "local_demo",
    studentLabel: "Maya Chen",
    completedSessions: completed.length,
    latestDiagnostic: diagnostic && diagnosticResult ? {
      id: diagnostic.session_id,
      scorePercent: diagnosticResult.scorePercent,
      correctCount: diagnosticResult.correctCount,
      totalQuestions: diagnosticResult.totalQuestions,
      completedAt: diagnosticResult.completedAt,
    } : null,
    latestReassessment: reassessment && reassessmentResult ? {
      id: reassessment.session_id,
      scorePercent: reassessmentResult.scorePercent,
      correctCount: reassessmentResult.correctCount,
      totalQuestions: reassessmentResult.totalQuestions,
      completedAt: reassessmentResult.completedAt,
      comparisonSessionId: reassessment.comparison_session_id,
    } : null,
    scoreChange: comparisonDiagnosticResult && reassessmentResult ? reassessmentResult.scorePercent - comparisonDiagnosticResult.scorePercent : null,
    concepts: CONCEPTS.map((concept) => {
      const result = conceptById.get(concept.id);
      return { concept: concept.id, label: concept.label, accuracy: result?.accuracy ?? null, isGap: result?.isGap ?? null };
    }),
    recommendedConcepts: diagnosticResult?.gaps ?? [],
    recentSessions: rows.slice(0, 8).map((row) => ({
      id: row.session_id,
      kind: row.kind,
      status: row.status,
      scorePercent: row.score_percent,
      totalQuestions: row.total_questions,
      completedAt: row.completed_at,
      startedAt: row.started_at,
    })),
  };
}

export function listLearningHistory(): Array<{
  id: string; kind: LearningKind; status: string; scorePercent: number | null;
  correctCount: number | null; totalQuestions: number; startedAt: string; completedAt: string | null;
}> {
  const db = getDemoDatabase();
  const rows = db.prepare(`
    SELECT * FROM learning_sessions WHERE student_id = ?
    ORDER BY COALESCE(completed_at, started_at) DESC LIMIT 50
  `).all(DEMO_STUDENT_ID) as SessionRow[];
  return rows.map((row) => ({
    id: row.session_id,
    kind: row.kind,
    status: row.status,
    scorePercent: row.score_percent,
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }));
}
