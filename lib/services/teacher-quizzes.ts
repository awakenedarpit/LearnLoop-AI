import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDemoDatabase } from "@/lib/db/demo-store";

export type TeacherQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  concept: string;
};

export type TeacherQuiz = {
  id: string;
  title: string;
  instructions: string;
  durationMinutes: number;
  availableFrom: string | null;
  availableUntil: string | null;
  attemptLimit: number;
  status: "draft" | "published";
  questions: TeacherQuestion[];
  createdAt: string;
  updatedAt: string;
};

type QuizRow = {
  id: string; title: string; instructions: string; duration_minutes: number;
  available_from: string | null; available_until: string | null; attempt_limit: number;
  status: "draft" | "published"; questions_json: string; created_at: string; updated_at: string;
};

function db(): DatabaseSync {
  const database = getDemoDatabase();
  database.exec(`
    CREATE TABLE IF NOT EXISTS teacher_quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 120),
      instructions TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 1 AND 240),
      available_from TEXT,
      available_until TEXT,
      attempt_limit INTEGER NOT NULL CHECK(attempt_limit BETWEEN 1 AND 10),
      status TEXT NOT NULL CHECK(status IN ('draft','published')),
      questions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(available_until IS NULL OR available_from IS NULL OR available_until > available_from)
    );
    CREATE INDEX IF NOT EXISTS idx_teacher_quizzes_status_updated
      ON teacher_quizzes(status, updated_at DESC);
  `);
  return database;
}

function mapRow(row: QuizRow): TeacherQuiz {
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    durationMinutes: row.duration_minutes,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    attemptLimit: row.attempt_limit,
    status: row.status,
    questions: JSON.parse(row.questions_json) as TeacherQuestion[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTeacherQuizzes(): TeacherQuiz[] {
  return (db().prepare("SELECT * FROM teacher_quizzes ORDER BY updated_at DESC").all() as QuizRow[]).map(mapRow);
}

export function getTeacherQuiz(id: string): TeacherQuiz | null {
  const row = db().prepare("SELECT * FROM teacher_quizzes WHERE id = ?").get(id) as QuizRow | undefined;
  return row ? mapRow(row) : null;
}

export type QuizInput = Omit<TeacherQuiz, "id" | "status" | "questions" | "createdAt" | "updatedAt"> & {
  questions: Omit<TeacherQuestion, "id">[];
};

function cleanQuestions(questions: QuizInput["questions"]): TeacherQuestion[] {
  return questions.map((question) => ({ ...question, id: randomUUID() }));
}

export function createTeacherQuiz(input: QuizInput): TeacherQuiz {
  const database = db();
  const now = new Date().toISOString();
  const id = randomUUID();
  const questions = cleanQuestions(input.questions);
  database.prepare(`
    INSERT INTO teacher_quizzes
      (id,title,instructions,duration_minutes,available_from,available_until,attempt_limit,status,questions_json,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,'draft',?,?,?)
  `).run(id, input.title.trim(), input.instructions.trim(), input.durationMinutes,
    input.availableFrom, input.availableUntil, input.attemptLimit, JSON.stringify(questions), now, now);
  return getTeacherQuiz(id)!;
}

export function updateTeacherQuiz(id: string, input: QuizInput): TeacherQuiz | null {
  const database = db();
  const current = getTeacherQuiz(id);
  if (!current) return null;
  if (current.status !== "draft") throw new Error("PUBLISHED_QUIZ_LOCKED");
  const questions = input.questions.map((question, index) => ({
    ...question,
    id: current.questions[index]?.id ?? randomUUID(),
  }));
  database.prepare(`
    UPDATE teacher_quizzes SET title=?, instructions=?, duration_minutes=?, available_from=?,
      available_until=?, attempt_limit=?, questions_json=?, updated_at=? WHERE id=? AND status='draft'
  `).run(input.title.trim(), input.instructions.trim(), input.durationMinutes, input.availableFrom,
    input.availableUntil, input.attemptLimit, JSON.stringify(questions), new Date().toISOString(), id);
  return getTeacherQuiz(id);
}

export function publishTeacherQuiz(id: string): TeacherQuiz | null {
  const database = db();
  const current = getTeacherQuiz(id);
  if (!current) return null;
  if (current.status === "published") return current;
  if (!current.questions.length) throw new Error("QUIZ_NEEDS_QUESTIONS");
  const now = new Date().toISOString();
  database.prepare("UPDATE teacher_quizzes SET status='published', updated_at=? WHERE id=? AND status='draft'")
    .run(now, id);
  return getTeacherQuiz(id);
}
