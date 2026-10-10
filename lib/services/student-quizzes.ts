import "server-only";

import { DEMO_STUDENT_ID, getDemoDatabase } from "@/lib/db/demo-store";
import { getTeacherQuiz, listTeacherQuizzes, type TeacherQuiz } from "@/lib/services/teacher-quizzes";

export type StudentQuizSummary = {
  id: string;
  title: string;
  instructions: string;
  durationMinutes: number;
  availableFrom: string | null;
  availableUntil: string | null;
  attemptLimit: number;
  questionCount: number;
  attemptsUsed: number;
};

export type StudentQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  concept: string;
};

export type StudentQuiz = Omit<StudentQuizSummary, "questionCount" | "attemptsUsed"> & {
  questions: StudentQuizQuestion[];
};

export type StudentQuizResult = {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    prompt: string;
    selectedOptionIndex: number | null;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
    concept: string;
  }>;
};

function ensureAttemptTable(): void {
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

function isAvailable(quiz: TeacherQuiz, now = Date.now()): boolean {
  if (quiz.status !== "published") return false;
  if (quiz.availableFrom && Date.parse(quiz.availableFrom) > now) return false;
  if (quiz.availableUntil && Date.parse(quiz.availableUntil) < now) return false;
  return true;
}

function attemptsUsed(quizId: string): number {
  ensureAttemptTable();
  const row = getDemoDatabase().prepare(
    "SELECT COUNT(*) AS count FROM student_quiz_attempts WHERE quiz_id = ? AND student_id = ?",
  ).get(quizId, DEMO_STUDENT_ID) as { count: number };
  return row.count;
}

export function listStudentQuizzes(): StudentQuizSummary[] {
  return listTeacherQuizzes()
    .filter((quiz) => isAvailable(quiz))
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      instructions: quiz.instructions,
      durationMinutes: quiz.durationMinutes,
      availableFrom: quiz.availableFrom,
      availableUntil: quiz.availableUntil,
      attemptLimit: quiz.attemptLimit,
      questionCount: quiz.questions.length,
      attemptsUsed: attemptsUsed(quiz.id),
    }));
}

export function getStudentQuiz(id: string): StudentQuiz | null {
  const quiz = getTeacherQuiz(id);
  if (!quiz || !isAvailable(quiz)) return null;
  return {
    id: quiz.id,
    title: quiz.title,
    instructions: quiz.instructions,
    durationMinutes: quiz.durationMinutes,
    availableFrom: quiz.availableFrom,
    availableUntil: quiz.availableUntil,
    attemptLimit: quiz.attemptLimit,
    questions: quiz.questions.map(({ id: questionId, prompt, options, concept }) => ({
      id: questionId,
      prompt,
      options,
      concept,
    })),
  };
}

export function submitStudentQuizAttempt(
  quizId: string,
  submittedAnswers: Record<string, number>,
): StudentQuizResult | null {
  const database = getDemoDatabase();
  ensureAttemptTable();
  const quiz = getTeacherQuiz(quizId);
  if (!quiz || !isAvailable(quiz)) return null;
  if (attemptsUsed(quizId) >= quiz.attemptLimit) throw new Error("ATTEMPT_LIMIT_REACHED");

  const validQuestionIds = new Set(quiz.questions.map((question) => question.id));
  for (const [questionId, optionIndex] of Object.entries(submittedAnswers)) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) {
      throw new Error("INVALID_ANSWERS");
    }
  }
  if (Object.keys(submittedAnswers).some((questionId) => !validQuestionIds.has(questionId))) {
    throw new Error("INVALID_ANSWERS");
  }

  const answers = quiz.questions.map((question) => {
    const selectedOptionIndex = submittedAnswers[question.id] ?? null;
    return {
      questionId: question.id,
      prompt: question.prompt,
      selectedOptionIndex,
      correctOptionIndex: question.correctOptionIndex,
      isCorrect: selectedOptionIndex === question.correctOptionIndex,
      explanation: question.explanation,
      concept: question.concept,
    };
  });
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const scorePercent = Math.round((correctCount / quiz.questions.length) * 100);
  const submittedAt = new Date().toISOString();
  const attemptId = crypto.randomUUID();

  database.prepare(`
    INSERT INTO student_quiz_attempts
      (id, quiz_id, student_id, answers_json, score_percent, correct_count, total_questions, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(attemptId, quizId, DEMO_STUDENT_ID, JSON.stringify(submittedAnswers), scorePercent,
    correctCount, quiz.questions.length, submittedAt);

  return {
    attemptId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    scorePercent,
    correctCount,
    totalQuestions: quiz.questions.length,
    submittedAt,
    answers,
  };
}
