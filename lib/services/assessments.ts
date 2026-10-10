import "server-only";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { DEMO_STUDENT_ID, getDemoDatabase } from "@/lib/db/demo-store";
import { getTeacherQuiz, type TeacherQuiz } from "@/lib/services/teacher-quizzes";

export class AssessmentServiceError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "ASSESSMENT_REQUEST_INVALID") {
    super(message);
    this.name = "AssessmentServiceError";
  }
}

type AttemptRow = {
  id: string; quiz_id: string; student_id: string; status: "in_progress" | "submitted" | "expired";
  started_at: string; deadline_at: string; submitted_at: string | null; score_percent: number | null;
  correct_count: number | null; answered_count: number | null; total_questions: number; finalization_reason: string | null;
};
type ResponseRow = { question_id: string; selected_option_index: number; answered_at: string };

export type AssessmentQuestionView = {
  id: string; prompt: string; options: string[]; concept: string; selectedOptionIndex: number | null;
  correctOptionIndex?: number; explanation?: string;
};
export type AssessmentAttemptView = {
  id: string; quizId: string; quizTitle: string; instructions: string; durationMinutes: number;
  status: AttemptRow["status"]; startedAt: string; deadlineAt: string; submittedAt: string | null;
  scorePercent: number | null; correctCount: number | null; answeredCount: number; totalQuestions: number;
  finalizationReason: string | null; questions: AssessmentQuestionView[];
};

function database(): DatabaseSync {
  const db = getDemoDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessment_attempts (
      id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL, student_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('in_progress','submitted','expired')),
      started_at TEXT NOT NULL, deadline_at TEXT NOT NULL, submitted_at TEXT,
      score_percent INTEGER, correct_count INTEGER, answered_count INTEGER,
      total_questions INTEGER NOT NULL, finalization_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS assessment_responses (
      attempt_id TEXT NOT NULL, question_id TEXT NOT NULL, selected_option_index INTEGER NOT NULL CHECK(selected_option_index BETWEEN 0 AND 3),
      answered_at TEXT NOT NULL, PRIMARY KEY(attempt_id, question_id),
      FOREIGN KEY(attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student_quiz ON assessment_attempts(student_id, quiz_id, started_at DESC);
  `);
  return db;
}
function quizOrThrow(quizId: string): TeacherQuiz {
  const quiz = getTeacherQuiz(quizId);
  if (!quiz) throw new AssessmentServiceError("That assessment could not be found.", 404, "QUIZ_NOT_FOUND");
  return quiz;
}
function availability(quiz: TeacherQuiz, now: Date): "not_started" | "closed" | null {
  if (quiz.availableFrom && now < new Date(quiz.availableFrom)) return "not_started";
  if (quiz.availableUntil && now >= new Date(quiz.availableUntil)) return "closed";
  return null;
}
function rowsForQuiz(): Array<AttemptRow> {
  return database().prepare("SELECT * FROM assessment_attempts WHERE student_id = ? ORDER BY started_at DESC").all(DEMO_STUDENT_ID) as AttemptRow[];
}
export function listAvailableAssessments(now = new Date()): Array<TeacherQuiz & { activeAttemptId: string | null }> {
  return assessmentList(now);
}

function assessmentList(now: Date): Array<TeacherQuiz & { activeAttemptId: string | null }> {
  const db = database();
  const quizzes = (db.prepare("SELECT * FROM teacher_quizzes WHERE status = 'published' ORDER BY updated_at DESC").all() as Array<Record<string, unknown>>)
    .map((row) => getTeacherQuiz(String(row.id))).filter((quiz): quiz is TeacherQuiz => Boolean(quiz));
  const attempts = rowsForQuiz();
  return quizzes.filter((quiz) => availability(quiz, now) === null || attempts.some((attempt) => attempt.quiz_id === quiz.id && attempt.status === "in_progress"))
    .map((quiz) => ({ ...quiz, activeAttemptId: attempts.find((attempt) => attempt.quiz_id === quiz.id && attempt.status === "in_progress")?.id ?? null }));
}
export function listAvailableAssessmentsForStudent(now = new Date()) {
  return assessmentList(now);
}
function attemptRow(id: string): AttemptRow {
  const row = database().prepare("SELECT * FROM assessment_attempts WHERE id = ? AND student_id = ?").get(id, DEMO_STUDENT_ID) as AttemptRow | undefined;
  if (!row) throw new AssessmentServiceError("Assessment attempt not found.", 404, "ATTEMPT_NOT_FOUND");
  return row;
}
function responses(attemptId: string): ResponseRow[] {
  return database().prepare("SELECT question_id, selected_option_index, answered_at FROM assessment_responses WHERE attempt_id = ?").all(attemptId) as ResponseRow[];
}
function view(row: AttemptRow): AssessmentAttemptView {
  const quiz = quizOrThrow(row.quiz_id);
  const responseById = new Map(responses(row.id).map((response) => [response.question_id, response]));
  const completed = row.status !== "in_progress";
  return {
    id: row.id, quizId: quiz.id, quizTitle: quiz.title, instructions: quiz.instructions, durationMinutes: quiz.durationMinutes,
    status: row.status, startedAt: row.started_at, deadlineAt: row.deadline_at, submittedAt: row.submitted_at,
    scorePercent: row.score_percent, correctCount: row.correct_count, answeredCount: responseById.size, totalQuestions: row.total_questions,
    finalizationReason: row.finalization_reason,
    questions: quiz.questions.map((question) => ({
      id: question.id, prompt: question.prompt, options: question.options, concept: question.concept,
      selectedOptionIndex: responseById.get(question.id)?.selected_option_index ?? null,
      ...(completed ? { correctOptionIndex: question.correctOptionIndex, explanation: question.explanation } : {}),
    })),
  };
}
export function createAssessmentAttempt(quizId: string, now = new Date()): AssessmentAttemptView {
  const quiz = quizOrThrow(quizId);
  if (quiz.status !== "published") throw new AssessmentServiceError("Only published assessments can be started.", 409, "QUIZ_NOT_PUBLISHED");
  const blocked = availability(quiz, now);
  if (blocked) throw new AssessmentServiceError(blocked === "not_started" ? "This assessment is not available yet." : "This assessment is closed.", 403, `ASSESSMENT_${blocked.toUpperCase()}`);
  const db = database();
  const active = db.prepare("SELECT * FROM assessment_attempts WHERE quiz_id = ? AND student_id = ? AND status = 'in_progress' LIMIT 1").get(quizId, DEMO_STUDENT_ID) as AttemptRow | undefined;
  if (active) return view(active);
  const used = (db.prepare("SELECT COUNT(*) AS count FROM assessment_attempts WHERE quiz_id = ? AND student_id = ? AND status != 'in_progress'").get(quizId, DEMO_STUDENT_ID) as { count: number }).count;
  if (used >= quiz.attemptLimit) throw new AssessmentServiceError("You have used all attempts for this assessment.", 409, "ATTEMPT_LIMIT_REACHED");
  const startedAt = now.toISOString();
  const configuredDeadline = new Date(now.getTime() + quiz.durationMinutes * 60_000);
  const deadline = quiz.availableUntil && new Date(quiz.availableUntil) < configuredDeadline ? new Date(quiz.availableUntil) : configuredDeadline;
  const id = randomUUID();
  db.prepare("INSERT INTO assessment_attempts (id,quiz_id,student_id,status,started_at,deadline_at,total_questions) VALUES (?,?,?,'in_progress',?,?,?)")
    .run(id, quizId, DEMO_STUDENT_ID, startedAt, deadline.toISOString(), quiz.questions.length);
  return view(attemptRow(id));
}
export function getAssessmentAttempt(id: string, now = new Date()): AssessmentAttemptView {
  const row = attemptRow(id);
  if (row.status === "in_progress" && now >= new Date(row.deadline_at)) return finalizeAssessmentAttempt(id, now, "deadline");
  return view(row);
}
export function saveAssessmentAnswer(attemptId: string, questionId: string, selectedOptionIndex: number, now = new Date()): { attemptId: string; questionId: string; savedAt: string } {
  const row = attemptRow(attemptId);
  if (row.status !== "in_progress") throw new AssessmentServiceError("This assessment is already finalized.", 409, "ATTEMPT_FINALIZED");
  if (now >= new Date(row.deadline_at)) { finalizeAssessmentAttempt(attemptId, now, "deadline"); throw new AssessmentServiceError("The deadline has passed; the attempt was finalized.", 409, "DEADLINE_PASSED"); }
  const quiz = quizOrThrow(row.quiz_id);
  const question = quiz.questions.find((item) => item.id === questionId);
  if (!question) throw new AssessmentServiceError("That question is not part of this attempt.", 403, "QUESTION_NOT_ASSIGNED");
  if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) throw new AssessmentServiceError("Choose a valid answer option.", 422, "OPTION_INVALID");
  const savedAt = now.toISOString();
  database().prepare("INSERT INTO assessment_responses (attempt_id,question_id,selected_option_index,answered_at) VALUES (?,?,?,?) ON CONFLICT(attempt_id,question_id) DO UPDATE SET selected_option_index=excluded.selected_option_index, answered_at=excluded.answered_at")
    .run(attemptId, questionId, selectedOptionIndex, savedAt);
  return { attemptId, questionId, savedAt };
}
export function finalizeAssessmentAttempt(id: string, now = new Date(), reason: "manual" | "deadline" = "manual"): AssessmentAttemptView {
  const db = database();
  const row = attemptRow(id);
  if (row.status !== "in_progress") return view(row);
  const quiz = quizOrThrow(row.quiz_id);
  const answerRows = responses(id);
  const answerById = new Map(answerRows.map((answer) => [answer.question_id, answer.selected_option_index]));
  const correctCount = quiz.questions.filter((question) => answerById.get(question.id) === question.correctOptionIndex).length;
  const status = reason === "deadline" || now >= new Date(row.deadline_at) ? "expired" : "submitted";
  const submittedAt = now.toISOString();
  db.prepare("UPDATE assessment_attempts SET status=?, submitted_at=?, score_percent=?, correct_count=?, answered_count=?, finalization_reason=? WHERE id=? AND status='in_progress'")
    .run(status, submittedAt, Math.round((correctCount / quiz.questions.length) * 100), correctCount, answerRows.length, status === "expired" ? "deadline" : "manual", id);
  return view(attemptRow(id));
}
