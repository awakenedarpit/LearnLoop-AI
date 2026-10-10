import "server-only";

import { mkdirSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { QUESTION_BANK } from "@/lib/learning/catalog";

export const DEMO_STUDENT_ID = "demo-student-maya";

declare global {
  // Keep one SQLite connection across Next.js development hot reloads.
  var __learnLoopDemoDb: DatabaseSync | undefined;
}

export class DemoModeUnavailableError extends Error {
  constructor() {
    super("The local demo adapter is unavailable in this environment.");
    this.name = "DemoModeUnavailableError";
  }
}

export function isLocalDemoMode(): boolean {
  if (process.env.DEMO_MODE === "false") return false;
  if (process.env.NODE_ENV === "production") return false;
  const hasCloudCredentials = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return process.env.DEMO_MODE === "true" || !hasCloudCredentials;
}

export function assertLocalDemoMode(): void {
  if (!isLocalDemoMode()) throw new DemoModeUnavailableError();
}

function initializeSchema(db: DatabaseSync): void {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_bank (
      question_id TEXT PRIMARY KEY,
      concept TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('gentle','steady','stretch')),
      prompt TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option_id TEXT NOT NULL,
      explanation TEXT NOT NULL,
      hint TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(concept, question_order)
    );

    CREATE TABLE IF NOT EXISTS learning_sessions (
      session_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('diagnostic','practice','reassessment')),
      status TEXT NOT NULL CHECK (status IN ('in_progress','completed')),
      question_ids_json TEXT NOT NULL,
      comparison_session_id TEXT,
      score_percent INTEGER,
      correct_count INTEGER,
      answered_count INTEGER,
      total_questions INTEGER NOT NULL,
      gaps_json TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (comparison_session_id) REFERENCES learning_sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS learning_responses (
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option_id TEXT NOT NULL,
      confidence TEXT CHECK (confidence IN ('guessing','somewhat','confident')),
      is_correct INTEGER NOT NULL CHECK (is_correct IN (0,1)),
      answered_at TEXT NOT NULL,
      PRIMARY KEY (session_id, question_id),
      FOREIGN KEY (session_id) REFERENCES learning_sessions(session_id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES question_bank(question_id)
    );

    CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_kind_started
      ON learning_sessions(student_id, kind, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_status
      ON learning_sessions(student_id, status, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_learning_responses_session
      ON learning_responses(session_id);
  `);

  const insertQuestion = db.prepare(`
    INSERT OR IGNORE INTO question_bank
      (question_id, concept, question_order, difficulty, prompt, options_json,
       correct_option_id, explanation, hint, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const question of QUESTION_BANK) {
      insertQuestion.run(
        question.id,
        question.concept,
        question.order,
        question.difficulty,
        question.prompt,
        JSON.stringify(question.options),
        question.correctOptionId,
        question.explanation,
        question.hint,
        now,
      );
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function createDemoDatabase(databasePath: string): DatabaseSync {
  const filePath = databasePath === ":memory:"
    ? databasePath
      : isAbsolute(databasePath)
      ? databasePath
      : join(process.cwd(), "data", basename(databasePath));
  if (filePath !== ":memory:") mkdirSync(dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL;");
  initializeSchema(db);
  return db;
}

export function getDemoDatabase(): DatabaseSync {
  assertLocalDemoMode();
  if (!globalThis.__learnLoopDemoDb) {
    const configuredPath = process.env.DEMO_DB_PATH || "./data/learnloop-demo.sqlite";
    globalThis.__learnLoopDemoDb = createDemoDatabase(configuredPath);
  }
  return globalThis.__learnLoopDemoDb;
}

export function closeDemoDatabase(): void {
  globalThis.__learnLoopDemoDb?.close();
  globalThis.__learnLoopDemoDb = undefined;
}
