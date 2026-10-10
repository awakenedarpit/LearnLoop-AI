import "server-only";

import { randomUUID } from "node:crypto";
import { DEMO_STUDENT_ID, getDemoDatabase } from "@/lib/db/demo-store";
import { getStudentQuiz, listStudentQuizzes, submitStudentQuizAttempt, type StudentQuizResult } from "@/lib/services/student-quizzes";

export type ActiveQuizAttempt = {
  attemptId: string;
  quizId: string;
  startedAt: string;
  expiresAt: string;
  answers: Record<string, number>;
  status: "in_progress" | "submitted" | "expired";
};

function ensureTable(): void {
  getDemoDatabase().exec(`
    CREATE TABLE IF NOT EXISTS student_quiz_active_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('in_progress','submitted','expired')),
      result_json TEXT,
      submitted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_active_attempts_student_quiz
      ON student_quiz_active_attempts(student_id, quiz_id, started_at DESC);
  `);
}

function decode(row: {
  id: string; quiz_id: string; started_at: string; expires_at: string;
  answers_json: string; status: ActiveQuizAttempt["status"];
}): ActiveQuizAttempt {
  return {
    attemptId: row.id, quizId: row.quiz_id, startedAt: row.started_at,
    expiresAt: row.expires_at, answers: JSON.parse(row.answers_json) as Record<string, number>,
    status: row.status,
  };
}

function validateAnswers(quizId: string, answers: Record<string, number>): void {
  const quiz = getStudentQuiz(quizId);
  if (!quiz) throw new Error("QUIZ_NOT_AVAILABLE");
  const questions = new Map(quiz.questions.map((question) => [question.id, question]));
  for (const [questionId, index] of Object.entries(answers)) {
    const question = questions.get(questionId);
    if (!question || !Number.isInteger(index) || index < 0 || index >= question.options.length) {
      throw new Error("INVALID_ANSWERS");
    }
  }
}

export function startOrResumeStudentQuizAttempt(quizId: string): ActiveQuizAttempt {
  ensureTable();
  const quiz = getStudentQuiz(quizId);
  if (!quiz) throw new Error("QUIZ_NOT_AVAILABLE");
  const db = getDemoDatabase();
  const existing = db.prepare(`
    SELECT id, quiz_id, started_at, expires_at, answers_json, status
    FROM student_quiz_active_attempts
    WHERE quiz_id = ? AND student_id = ? AND status = 'in_progress'
    ORDER BY started_at DESC LIMIT 1
  `).get(quizId, DEMO_STUDENT_ID) as {
    id: string; quiz_id: string; started_at: string; expires_at: string;
    answers_json: string; status: "in_progress";
  } | undefined;
  if (existing) {
    if (Date.parse(existing.expires_at) <= Date.now()) {
      finalizeStudentQuizAttempt(existing.id, quizId, {}, true);
      throw new Error("ATTEMPT_EXPIRED");
    }
    return decode(existing);
  }
  const summary = listStudentQuizzes().find((item) => item.id === quizId);
  if (!summary || summary.attemptsUsed >= summary.attemptLimit) throw new Error("ATTEMPT_LIMIT_REACHED");
  const startedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + quiz.durationMinutes * 60_000).toISOString();
  const attemptId = randomUUID();
  db.prepare(`INSERT INTO student_quiz_active_attempts
    (id, quiz_id, student_id, answers_json, started_at, expires_at, status)
    VALUES (?, ?, ?, '{}', ?, ?, 'in_progress')`).run(attemptId, quizId, DEMO_STUDENT_ID, startedAt, expiresAt);
  return { attemptId, quizId, startedAt, expiresAt, answers: {}, status: "in_progress" };
}

export function saveStudentQuizAttemptAnswers(
  attemptId: string, quizId: string, answers: Record<string, number>,
): ActiveQuizAttempt {
  ensureTable();
  validateAnswers(quizId, answers);
  const db = getDemoDatabase();
  const row = db.prepare(`SELECT id, quiz_id, started_at, expires_at, answers_json, status
    FROM student_quiz_active_attempts WHERE id = ? AND quiz_id = ? AND student_id = ?`)
    .get(attemptId, quizId, DEMO_STUDENT_ID) as {
      id: string; quiz_id: string; started_at: string; expires_at: string;
      answers_json: string; status: ActiveQuizAttempt["status"];
    } | undefined;
  if (!row) throw new Error("ATTEMPT_NOT_FOUND");
  if (row.status !== "in_progress") throw new Error("ATTEMPT_NOT_ACTIVE");
  if (Date.parse(row.expires_at) <= Date.now()) {
    finalizeStudentQuizAttempt(attemptId, quizId, {}, true);
    throw new Error("ATTEMPT_EXPIRED");
  }
  const merged = { ...JSON.parse(row.answers_json) as Record<string, number>, ...answers };
  db.prepare("UPDATE student_quiz_active_attempts SET answers_json = ? WHERE id = ?")
    .run(JSON.stringify(merged), attemptId);
  return { ...decode({ ...row, answers_json: JSON.stringify(merged) }), answers: merged };
}

export function finalizeStudentQuizAttempt(
  attemptId: string, quizId: string, answers: Record<string, number>, forceExpired = false,
): StudentQuizResult {
  ensureTable();
  const db = getDemoDatabase();
  const row = db.prepare(`SELECT id, quiz_id, started_at, expires_at, answers_json, status, result_json
    FROM student_quiz_active_attempts WHERE id = ? AND quiz_id = ? AND student_id = ?`)
    .get(attemptId, quizId, DEMO_STUDENT_ID) as {
      id: string; quiz_id: string; started_at: string; expires_at: string;
      answers_json: string; status: ActiveQuizAttempt["status"]; result_json: string | null;
    } | undefined;
  if (!row) throw new Error("ATTEMPT_NOT_FOUND");
  if (row.status !== "in_progress") {
    if (row.result_json) return JSON.parse(row.result_json) as StudentQuizResult;
    throw new Error("ATTEMPT_NOT_ACTIVE");
  }
  const expired = forceExpired || Date.parse(row.expires_at) <= Date.now();
  const merged = { ...JSON.parse(row.answers_json) as Record<string, number>, ...answers };
  validateAnswers(quizId, merged);
  const result = submitStudentQuizAttempt(quizId, merged);
  if (!result) throw new Error("QUIZ_NOT_AVAILABLE");
  db.prepare(`UPDATE student_quiz_active_attempts SET answers_json = ?, status = ?, result_json = ?, submitted_at = ? WHERE id = ?`)
    .run(JSON.stringify(merged), expired ? "expired" : "submitted", JSON.stringify(result), result.submittedAt, attemptId);
  return result;
}
