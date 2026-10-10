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

export type TeacherReviewAnswer = {
  questionId: string;
  prompt: string;
  concept: string;
  options: string[];
  selectedOptionIndex: number | null;
  selectedAnswer: string | null;
  correctOptionIndex: number;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
};

export type TeacherReviewDetail = {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  learnerLabel: "Maya (fictional demo learner)";
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  unansweredCount: number;
  answers: TeacherReviewAnswer[];
};

export type TeacherReviewSummary = Omit<TeacherReviewDetail, "answers">;

function ensureTables(): void {
  getDemoDatabase().exec(`
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
  `);
}

function parseAnswers(raw: string): Record<string, number> {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isInteger(entry[1]),
    ));
  } catch {
    return {};
  }
}

function toDetail(row: AttemptRow, quiz: TeacherQuiz): TeacherReviewDetail {
  const selected = parseAnswers(row.answers_json);
  const answers = quiz.questions.map((question) => {
    const selectedOptionIndex = selected[question.id] ?? null;
    return {
      questionId: question.id,
      prompt: question.prompt,
      concept: question.concept,
      options: question.options,
      selectedOptionIndex,
      selectedAnswer: selectedOptionIndex === null ? null : question.options[selectedOptionIndex] ?? null,
      correctOptionIndex: question.correctOptionIndex,
      correctAnswer: question.options[question.correctOptionIndex] ?? "",
      isCorrect: selectedOptionIndex === question.correctOptionIndex,
      explanation: question.explanation,
    };
  });
  return {
    attemptId: row.id,
    quizId: quiz.id,
    quizTitle: quiz.title,
    learnerLabel: "Maya (fictional demo learner)",
    scorePercent: row.score_percent,
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    submittedAt: row.submitted_at,
    unansweredCount: answers.filter((answer) => answer.selectedOptionIndex === null).length,
    answers,
  };
}

/** Returns only finalized attempts for the single fictional local-demo learner. */
export function listTeacherReviewSummaries(quizId?: string): TeacherReviewSummary[] {
  ensureTables();
  const quizzes = listTeacherQuizzes();
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const statement = quizId
    ? getDemoDatabase().prepare(`
        SELECT id, quiz_id, answers_json, score_percent, correct_count, total_questions, submitted_at
        FROM student_quiz_attempts WHERE student_id = ? AND quiz_id = ?
        ORDER BY submitted_at DESC
      `)
    : getDemoDatabase().prepare(`
        SELECT id, quiz_id, answers_json, score_percent, correct_count, total_questions, submitted_at
        FROM student_quiz_attempts WHERE student_id = ?
        ORDER BY submitted_at DESC
      `);
  const rows = (quizId ? statement.all(DEMO_STUDENT_ID, quizId) : statement.all(DEMO_STUDENT_ID)) as AttemptRow[];
  return rows.flatMap((row) => {
    const quiz = quizById.get(row.quiz_id);
    if (!quiz) return [];
    const { answers: _answers, ...summary } = toDetail(row, quiz);
    return [summary];
  });
}

export function getTeacherReviewDetail(attemptId: string): TeacherReviewDetail | null {
  ensureTables();
  const row = getDemoDatabase().prepare(`
    SELECT id, quiz_id, answers_json, score_percent, correct_count, total_questions, submitted_at
    FROM student_quiz_attempts WHERE id = ? AND student_id = ?
  `).get(attemptId, DEMO_STUDENT_ID) as AttemptRow | undefined;
  if (!row) return null;
  const quiz = listTeacherQuizzes().find((item) => item.id === row.quiz_id);
  return quiz ? toDetail(row, quiz) : null;
}
