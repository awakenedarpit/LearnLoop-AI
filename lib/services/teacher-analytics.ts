import "server-only";

import { DEMO_STUDENT_ID, getDemoDatabase } from "@/lib/db/demo-store";
import { listTeacherQuizzes, type TeacherQuiz } from "@/lib/services/teacher-quizzes";

type AttemptRow = {
  id: string;
  quiz_id: string;
  answers_json: string;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  submitted_at: string;
};

export type QuestionAnalytics = {
  questionId: string;
  prompt: string;
  concept: string;
  submissions: number;
  correctCount: number;
  accuracyPercent: number;
};

export type QuizAnalytics = {
  id: string;
  title: string;
  status: "draft" | "published";
  questionCount: number;
  durationMinutes: number;
  attemptLimit: number;
  submissionCount: number;
  averageScore: number | null;
  highestScore: number | null;
  passRate: number | null;
  lastSubmittedAt: string | null;
  questionStats: QuestionAnalytics[];
};

export type TeacherAnalytics = {
  mode: "fictional_demo";
  totalQuizzes: number;
  publishedQuizzes: number;
  totalSubmissions: number;
  overallAverageScore: number | null;
  quizzes: QuizAnalytics[];
  recentSubmissions: Array<{
    attemptId: string;
    quizId: string;
    quizTitle: string;
    scorePercent: number;
    correctCount: number;
    totalQuestions: number;
    submittedAt: string;
  }>;
};

function ensureTables(): void {
  const db = getDemoDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      score_percent INTEGER NOT NULL CHECK(score_percent BETWEEN 0 AND 100),
      correct_count INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      submitted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_student_quiz_attempts_student_quiz
      ON student_quiz_attempts(student_id, quiz_id, submitted_at DESC);
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
  `);
}

function safeAnswers(raw: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isInteger(entry[1]),
    ));
  } catch {
    return {};
  }
}

function analyticsForQuiz(quiz: TeacherQuiz, attempts: AttemptRow[]): QuizAnalytics {
  const questionStats = quiz.questions.map((question) => {
    let correctCount = 0;
    for (const attempt of attempts) {
      const selected = safeAnswers(attempt.answers_json)[question.id];
      if (selected === question.correctOptionIndex) correctCount += 1;
    }
    return {
      questionId: question.id,
      prompt: question.prompt,
      concept: question.concept,
      submissions: attempts.length,
      correctCount,
      accuracyPercent: attempts.length ? Math.round((correctCount / attempts.length) * 100) : 0,
    };
  });
  const scores = attempts.map((attempt) => attempt.score_percent);
  return {
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    questionCount: quiz.questions.length,
    durationMinutes: quiz.durationMinutes,
    attemptLimit: quiz.attemptLimit,
    submissionCount: attempts.length,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    highestScore: scores.length ? Math.max(...scores) : null,
    passRate: scores.length ? Math.round((scores.filter((score) => score >= 60).length / scores.length) * 100) : null,
    lastSubmittedAt: attempts[0]?.submitted_at ?? null,
    questionStats,
  };
}

/** Aggregate demo-only assessment results. The current prototype has one fictional learner identity. */
export function getTeacherAnalytics(): TeacherAnalytics {
  ensureTables();
  const db = getDemoDatabase();
  const quizzes = listTeacherQuizzes();
  const rows = db.prepare(`
    SELECT id, quiz_id, answers_json, score_percent, correct_count, total_questions, submitted_at
    FROM student_quiz_attempts
    WHERE student_id = ?
    ORDER BY submitted_at DESC
  `).all(DEMO_STUDENT_ID) as AttemptRow[];
  const attemptsByQuiz = new Map<string, AttemptRow[]>();
  for (const row of rows) {
    const list = attemptsByQuiz.get(row.quiz_id) ?? [];
    list.push(row);
    attemptsByQuiz.set(row.quiz_id, list);
  }
  const quizAnalytics = quizzes.map((quiz) => analyticsForQuiz(quiz, attemptsByQuiz.get(quiz.id) ?? []));
  const scoreValues = rows.map((row) => row.score_percent);
  const recentSubmissions = rows.slice(0, 10).flatMap((row) => {
    const quiz = quizzes.find((item) => item.id === row.quiz_id);
    if (!quiz) return [];
    return [{
      attemptId: row.id,
      quizId: row.quiz_id,
      quizTitle: quiz.title,
      scorePercent: row.score_percent,
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
      submittedAt: row.submitted_at,
    }];
  });
  return {
    mode: "fictional_demo",
    totalQuizzes: quizzes.length,
    publishedQuizzes: quizzes.filter((quiz) => quiz.status === "published").length,
    totalSubmissions: rows.length,
    overallAverageScore: scoreValues.length
      ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
      : null,
    quizzes: quizAnalytics,
    recentSubmissions,
  };
}
