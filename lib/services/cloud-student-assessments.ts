import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActiveQuizAttempt } from "@/lib/services/student-quiz-attempts";
import type { StudentQuiz, StudentQuizQuestion, StudentQuizResult, StudentQuizSummary } from "@/lib/services/student-quizzes";

/** Cloud student assessment adapter. All reads and mutations are delegated to the
 * authenticated user's Supabase session and security-definer RPCs that enforce
 * assignment, attempt ownership, deadlines, and server-side scoring. */

export class CloudAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudAssessmentError";
  }
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CloudAssessmentError("INVALID_CLOUD_RESPONSE");
  return value as JsonRecord;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function throwRpcError(error: { message?: string; code?: string } | null, data?: unknown): void {
  const payload = data && typeof data === "object" && !Array.isArray(data) ? data as JsonRecord : null;
  const errorCode = payload && typeof payload.errorCode === "string" ? payload.errorCode : null;
  if (errorCode) throw new CloudAssessmentError(errorCode);
  if (!error) return;
  const message = error.message ?? "";
  const known = [
    "AUTH_REQUIRED", "ATTEMPT_NOT_FOUND", "ATTEMPT_NOT_ACTIVE", "ATTEMPT_EXPIRED",
    "ATTEMPT_LIMIT_REACHED", "QUIZ_NOT_AVAILABLE", "INVALID_ANSWERS",
  ].find((code) => message.includes(code));
  throw new CloudAssessmentError(known ?? "CLOUD_ASSESSMENT_REQUEST_FAILED");
}

function mapSummary(value: unknown): StudentQuizSummary {
  const row = asRecord(value);
  return {
    id: asString(row.id),
    title: asString(row.title),
    instructions: asString(row.instructions),
    durationMinutes: asNumber(row.durationMinutes),
    availableFrom: asStringOrNull(row.availableFrom),
    availableUntil: asStringOrNull(row.availableUntil),
    attemptLimit: asNumber(row.attemptLimit),
    questionCount: asNumber(row.questionCount),
    attemptsUsed: asNumber(row.attemptsUsed),
  };
}

function mapQuestion(value: unknown): StudentQuizQuestion {
  const row = asRecord(value);
  const options = Array.isArray(row.options) ? row.options.filter((option): option is string => typeof option === "string") : [];
  return {
    id: asString(row.id),
    prompt: asString(row.prompt),
    options,
    concept: asString(row.concept, "General"),
  };
}

function mapQuiz(value: unknown): StudentQuiz {
  const row = asRecord(value);
  return {
    id: asString(row.id),
    title: asString(row.title),
    instructions: asString(row.instructions),
    durationMinutes: asNumber(row.durationMinutes),
    availableFrom: asStringOrNull(row.availableFrom),
    availableUntil: asStringOrNull(row.availableUntil),
    attemptLimit: asNumber(row.attemptLimit),
    questions: Array.isArray(row.questions) ? row.questions.map(mapQuestion) : [],
  };
}

function mapAttempt(value: unknown): ActiveQuizAttempt {
  const row = asRecord(value);
  const rawAnswers = row.answers && typeof row.answers === "object" && !Array.isArray(row.answers) ? row.answers as Record<string, unknown> : {};
  const answers: Record<string, number> = {};
  for (const [key, answer] of Object.entries(rawAnswers)) {
    if (typeof answer === "number" && Number.isInteger(answer)) answers[key] = answer;
  }
  const status = row.status;
  if (status !== "in_progress" && status !== "submitted" && status !== "expired") throw new CloudAssessmentError("INVALID_CLOUD_RESPONSE");
  return {
    attemptId: asString(row.attemptId),
    quizId: asString(row.quizId),
    startedAt: asString(row.startedAt),
    expiresAt: asString(row.expiresAt),
    answers,
    status,
  };
}

function mapResult(value: unknown): StudentQuizResult {
  const row = asRecord(value);
  const rawAnswers = Array.isArray(row.answers) ? row.answers : [];
  return {
    attemptId: asString(row.attemptId),
    quizId: asString(row.quizId),
    quizTitle: asString(row.quizTitle),
    scorePercent: asNumber(row.scorePercent),
    correctCount: asNumber(row.correctCount),
    totalQuestions: asNumber(row.totalQuestions),
    submittedAt: asString(row.submittedAt),
    answers: rawAnswers.map((value) => {
      const answer = asRecord(value);
      const selectedOptionIndex = typeof answer.selectedOptionIndex === "number" ? answer.selectedOptionIndex : null;
      return {
        questionId: asString(answer.questionId),
        prompt: asString(answer.prompt),
        selectedOptionIndex,
        selectedAnswer: asStringOrNull(answer.selectedAnswer),
        correctOptionIndex: asNumber(answer.correctOptionIndex),
        correctAnswer: asString(answer.correctAnswer),
        isCorrect: answer.isCorrect === true,
        explanation: asString(answer.explanation),
        concept: asString(answer.concept, "General"),
      };
    }),
  };
}

export async function listCloudStudentQuizzes(): Promise<StudentQuizSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_assigned_quizzes");
  throwRpcError(error, data);
  if (!Array.isArray(data)) throw new CloudAssessmentError("INVALID_CLOUD_RESPONSE");
  return data.map(mapSummary);
}

export async function getCloudStudentQuiz(quizId: string): Promise<StudentQuiz | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_assigned_quiz", { p_quiz_id: quizId });
  if (error) {
    if ((error.message ?? "").includes("invalid input syntax for type uuid")) return null;
    throwRpcError(error, data);
  }
  if (!data) return null;
  return mapQuiz(data);
}

export async function startCloudStudentQuizAttempt(quizId: string): Promise<ActiveQuizAttempt> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_assessment_attempt", { p_quiz_id: quizId });
  throwRpcError(error, data);
  const row = asRecord(data);
  if (typeof row.errorCode === "string") throw new CloudAssessmentError(row.errorCode);
  return mapAttempt(row);
}

export async function saveCloudStudentQuizAttemptAnswers(
  attemptId: string,
  answers: Record<string, number>,
): Promise<ActiveQuizAttempt> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_assessment_answers", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });
  throwRpcError(error, data);
  const row = asRecord(data);
  if (typeof row.errorCode === "string") throw new CloudAssessmentError(row.errorCode);
  return mapAttempt(row);
}

export async function finalizeCloudStudentQuizAttempt(
  attemptId: string,
  answers: Record<string, number>,
): Promise<StudentQuizResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("finalize_assessment_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });
  throwRpcError(error, data);
  const row = asRecord(data);
  if (typeof row.errorCode === "string") throw new CloudAssessmentError(row.errorCode);
  return mapResult(row);
}
