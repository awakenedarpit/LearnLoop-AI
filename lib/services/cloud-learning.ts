import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONCEPTS, QUESTION_BANK, conceptLabel, type ConfidenceLevel, type LearningKind } from "@/lib/learning/catalog";
import { calculateLearningScore } from "@/lib/learning/scoring";
import { LearningServiceError, type LearningResult, type LearningSessionView, type ProgressOverview } from "@/lib/services/learning";

type SessionRow = {
  session_id: string;
  student_id: string;
  kind: LearningKind;
  status: "in_progress" | "completed";
  question_ids: string[];
  comparison_session_id: string | null;
  score_percent: number | null;
  correct_count: number | null;
  answered_count: number | null;
  total_questions: number;
  gaps: string[] | null;
  started_at: string;
  completed_at: string | null;
};

type ResponseRow = {
  session_id: string;
  question_id: string;
  selected_option_id: string;
  confidence: ConfidenceLevel | null;
  answered_at: string;
};

const questionById = new Map(QUESTION_BANK.map((question) => [question.id, question]));

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new LearningServiceError("Sign in to save your learning progress.", 401, "AUTH_REQUIRED");
  return { supabase, user };
}

function normalizeSession(row: Record<string, unknown>): SessionRow {
  return {
    session_id: String(row.session_id),
    student_id: String(row.student_id),
    kind: row.kind as LearningKind,
    status: row.status as "in_progress" | "completed",
    question_ids: Array.isArray(row.question_ids) ? row.question_ids.filter((id): id is string => typeof id === "string") : [],
    comparison_session_id: typeof row.comparison_session_id === "string" ? row.comparison_session_id : null,
    score_percent: typeof row.score_percent === "number" ? row.score_percent : null,
    correct_count: typeof row.correct_count === "number" ? row.correct_count : null,
    answered_count: typeof row.answered_count === "number" ? row.answered_count : null,
    total_questions: Number(row.total_questions ?? 0),
    gaps: Array.isArray(row.gaps) ? row.gaps.filter((gap): gap is string => typeof gap === "string") : null,
    started_at: String(row.started_at),
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function normalizeResponse(row: Record<string, unknown>): ResponseRow {
  return {
    session_id: String(row.session_id),
    question_id: String(row.question_id),
    selected_option_id: String(row.selected_option_id),
    confidence: row.confidence === "guessing" || row.confidence === "somewhat" || row.confidence === "confident" ? row.confidence : null,
    answered_at: String(row.answered_at),
  };
}

async function loadResponses(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, sessionId: string): Promise<ResponseRow[]> {
  const { data, error } = await supabase.from("learning_responses")
    .select("session_id,question_id,selected_option_id,confidence,answered_at")
    .eq("session_id", sessionId);
  if (error) throw new LearningServiceError("Could not load saved answers.", 502, "LEARNING_STORAGE_FAILED");
  return (data ?? []).map((row) => normalizeResponse(row as Record<string, unknown>));
}

function resultFor(row: SessionRow, responses: ResponseRow[]): LearningResult {
  return calculateLearningScore(
    row.question_ids.map((id) => questionById.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) => ({ id: q.id, concept: q.concept, correctOptionId: q.correctOptionId })),
    responses.map((response) => ({ questionId: response.question_id, selectedOptionId: response.selected_option_id })),
    row.completed_at ?? new Date().toISOString(),
  );
}

async function sessionView(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  row: SessionRow,
): Promise<LearningSessionView> {
  const responses = await loadResponses(supabase, row.session_id);
  const responseById = new Map(responses.map((response) => [response.question_id, response]));
  const completed = row.status === "completed";
  const questions = row.question_ids.map((id) => {
    const question = questionById.get(id);
    if (!question) return null;
    const response = responseById.get(id);
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
      ...(completed ? {
        correctOptionId: question.correctOptionId,
        isCorrect: response?.selected_option_id === question.correctOptionId,
        explanation: question.explanation,
      } : {}),
    };
  }).filter((question) => question !== null);
  return {
    id: row.session_id,
    kind: row.kind,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    comparisonSessionId: row.comparison_session_id,
    questions,
    answeredCount: responses.length,
    result: completed ? resultFor(row, responses) : null,
  };
}

async function findSession(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, sessionId: string): Promise<SessionRow> {
  const { data, error } = await supabase.from("learning_sessions")
    .select("session_id,student_id,kind,status,question_ids,comparison_session_id,score_percent,correct_count,answered_count,total_questions,gaps,started_at,completed_at")
    .eq("session_id", sessionId).maybeSingle();
  if (error) throw new LearningServiceError("Could not load your learning session.", 502, "LEARNING_STORAGE_FAILED");
  if (!data) throw new LearningServiceError("Learning session not found.", 404, "SESSION_NOT_FOUND");
  return normalizeSession(data as Record<string, unknown>);
}

export async function findActiveCloudLearningSession(kind: LearningKind): Promise<LearningSessionView | null> {
  const { supabase, user } = await getContext();
  const { data, error } = await supabase.from("learning_sessions")
    .select("session_id,student_id,kind,status,question_ids,comparison_session_id,score_percent,correct_count,answered_count,total_questions,gaps,started_at,completed_at")
    .eq("student_id", user.id).eq("kind", kind).eq("status", "in_progress")
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new LearningServiceError("Could not load your active learning session.", 502, "LEARNING_STORAGE_FAILED");
  return data ? sessionView(supabase, normalizeSession(data as Record<string, unknown>)) : null;
}

export async function createCloudLearningSession(kind: LearningKind): Promise<LearningSessionView> {
  const { supabase, user } = await getContext();
  const { data: sessionData, error: sessionError } = await supabase.from("learning_sessions")
    .select("session_id,student_id,kind,status,question_ids,comparison_session_id,score_percent,correct_count,answered_count,total_questions,gaps,started_at,completed_at")
    .eq("student_id", user.id).order("started_at", { ascending: false }).limit(100);
  if (sessionError) throw new LearningServiceError("Could not prepare a learning session.", 502, "LEARNING_STORAGE_FAILED");
  const sessions = (sessionData ?? []).map((row) => normalizeSession(row as Record<string, unknown>));
  const completed = sessions.filter((row) => row.status === "completed");
  const latestDiagnostic = completed.find((row) => row.kind === "diagnostic");
  const diagnosticView = latestDiagnostic ? await sessionView(supabase, latestDiagnostic) : null;
  const gaps = diagnosticView?.result?.gaps ?? [];
  const targetConcepts = kind === "diagnostic"
    ? CONCEPTS.map((concept) => concept.id)
    : kind === "practice"
      ? (gaps.length ? gaps : latestDiagnostic ? [] : CONCEPTS.map((concept) => concept.id))
      : (gaps.length ? gaps : CONCEPTS.map((concept) => concept.id));

  const sessionIds = sessions.map((row) => row.session_id);
  let used = new Set<string>();
  if (sessionIds.length) {
    const { data: responses, error } = await supabase.from("learning_responses").select("question_id").in("session_id", sessionIds);
    if (error) throw new LearningServiceError("Could not prepare fresh practice questions.", 502, "LEARNING_STORAGE_FAILED");
    used = new Set((responses ?? []).map((response) => response.question_id));
  }
  const selected = targetConcepts.map((concept) => {
    const candidates = QUESTION_BANK.filter((question) => question.concept === concept).sort((a, b) => a.order - b.order);
    const fresh = candidates.find((question) => !used.has(question.id));
    return kind === "diagnostic" ? (fresh ?? candidates[0]) : fresh;
  }).filter((question) => question !== undefined);

  if (!selected.length) {
    throw new LearningServiceError(
      kind === "practice" ? "No unattempted practice questions are available for the current concept gaps." : "There are no fresh questions available for this session yet.",
      409,
      "NO_FRESH_QUESTIONS",
    );
  }
  const comparison = kind === "reassessment" ? latestDiagnostic?.session_id ?? null : null;
  const { data, error } = await supabase.from("learning_sessions").insert({
    student_id: user.id,
    kind,
    status: "in_progress",
    question_ids: selected.map((question) => question.id),
    comparison_session_id: comparison,
    total_questions: selected.length,
  }).select("session_id,student_id,kind,status,question_ids,comparison_session_id,score_percent,correct_count,answered_count,total_questions,gaps,started_at,completed_at").single();
  if (error || !data) throw new LearningServiceError("Could not create your learning session.", 502, "LEARNING_STORAGE_FAILED");
  return sessionView(supabase, normalizeSession(data as Record<string, unknown>));
}

export async function getCloudLearningSession(sessionId: string): Promise<LearningSessionView> {
  const { supabase } = await getContext();
  return sessionView(supabase, await findSession(supabase, sessionId));
}

export async function saveCloudLearningAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionId: string,
  confidence: ConfidenceLevel | null,
): Promise<{ savedAt: string; questionId: string }> {
  const { supabase } = await getContext();
  const session = await findSession(supabase, sessionId);
  if (session.status !== "in_progress") throw new LearningServiceError("This learning session is already complete.", 409, "SESSION_COMPLETED");
  if (!session.question_ids.includes(questionId)) throw new LearningServiceError("This question is not part of the session.", 403, "QUESTION_NOT_ASSIGNED");
  const question = questionById.get(questionId);
  if (!question) throw new LearningServiceError("Question not found.", 404, "QUESTION_NOT_FOUND");
  if (!question.options.some((option) => option.id === selectedOptionId)) {
    throw new LearningServiceError("Choose one of the available answer options.", 422, "OPTION_INVALID");
  }
  const { data, error } = await supabase.from("learning_responses").upsert({
    session_id: sessionId,
    question_id: questionId,
    selected_option_id: selectedOptionId,
    confidence,
    answered_at: new Date().toISOString(),
  }, { onConflict: "session_id,question_id" }).select("answered_at").single();
  if (error || !data) throw new LearningServiceError("Could not save your answer.", 502, "LEARNING_STORAGE_FAILED");
  return { savedAt: data.answered_at, questionId };
}

export async function completeCloudLearningSession(sessionId: string): Promise<LearningSessionView> {
  const { supabase } = await getContext();
  const session = await findSession(supabase, sessionId);
  if (session.status === "completed") return sessionView(supabase, session);
  const { data, error } = await supabase.from("learning_sessions").update({ status: "completed" })
    .eq("session_id", sessionId).eq("status", "in_progress")
    .select("session_id,student_id,kind,status,question_ids,comparison_session_id,score_percent,correct_count,answered_count,total_questions,gaps,started_at,completed_at").maybeSingle();
  if (error) {
    const latest = await findSession(supabase, sessionId);
    if (latest.status === "completed") return sessionView(supabase, latest);
    throw new LearningServiceError("Could not complete your learning session.", 502, "LEARNING_STORAGE_FAILED");
  }
  if (!data) {
    const latest = await findSession(supabase, sessionId);
    if (latest.status === "completed") return sessionView(supabase, latest);
    throw new LearningServiceError("Learning session not found.", 404, "SESSION_NOT_FOUND");
  }
  return sessionView(supabase, normalizeSession(data as Record<string, unknown>));
}

export async function getCloudProgressOverview(): Promise<Omit<ProgressOverview, "mode"> & { mode: "cloud" }> {
  const { supabase, user } = await getContext();
  const { data, error } = await supabase.from("learning_sessions")
    .select("session_id,student_id,kind,status,question_ids,comparison_session_id,score_percent,correct_count,answered_count,total_questions,gaps,started_at,completed_at")
    .eq("student_id", user.id).order("started_at", { ascending: false }).limit(50);
  if (error) throw new LearningServiceError("Could not load your learning progress.", 502, "LEARNING_STORAGE_FAILED");
  const rows = (data ?? []).map((row) => normalizeSession(row as Record<string, unknown>));
  const completed = rows.filter((row) => row.status === "completed");
  const views = new Map<string, LearningSessionView>();
  for (const row of completed) views.set(row.session_id, await sessionView(supabase, row));
  const diagnostic = completed.find((row) => row.kind === "diagnostic");
  const reassessment = completed.find((row) => row.kind === "reassessment");
  const diagnosticResult = diagnostic ? views.get(diagnostic.session_id)?.result ?? null : null;
  const reassessmentResult = reassessment ? views.get(reassessment.session_id)?.result ?? null : null;
  const comparison = reassessment?.comparison_session_id ? views.get(reassessment.comparison_session_id)?.result ?? null : null;
  const conceptById = new Map((diagnosticResult?.concepts ?? []).map((item) => [item.concept, item]));
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return {
    mode: "cloud",
    studentLabel: profile?.display_name || user.user_metadata?.display_name || "Learner",
    completedSessions: completed.length,
    latestDiagnostic: diagnostic && diagnosticResult ? {
      id: diagnostic.session_id, scorePercent: diagnosticResult.scorePercent, correctCount: diagnosticResult.correctCount,
      totalQuestions: diagnosticResult.totalQuestions, completedAt: diagnosticResult.completedAt,
    } : null,
    latestReassessment: reassessment && reassessmentResult ? {
      id: reassessment.session_id, scorePercent: reassessmentResult.scorePercent, correctCount: reassessmentResult.correctCount,
      totalQuestions: reassessmentResult.totalQuestions, completedAt: reassessmentResult.completedAt,
      comparisonSessionId: reassessment.comparison_session_id,
    } : null,
    scoreChange: comparison && reassessmentResult ? reassessmentResult.scorePercent - comparison.scorePercent : null,
    concepts: CONCEPTS.map((concept) => {
      const result = conceptById.get(concept.id);
      return { concept: concept.id, label: concept.label, accuracy: result?.accuracy ?? null, isGap: result?.isGap ?? null };
    }),
    recommendedConcepts: diagnosticResult?.gaps ?? [],
    recentSessions: rows.slice(0, 8).map((row) => ({
      id: row.session_id, kind: row.kind, status: row.status,
      scorePercent: row.score_percent, totalQuestions: row.total_questions,
      completedAt: row.completed_at, startedAt: row.started_at,
    })),
  };
}

export async function listCloudLearningHistory() {
  const { supabase, user } = await getContext();
  const { data, error } = await supabase.from("learning_sessions")
    .select("session_id,kind,status,score_percent,correct_count,total_questions,started_at,completed_at")
    .eq("student_id", user.id).order("started_at", { ascending: false }).limit(50);
  if (error) throw new LearningServiceError("Could not load your learning history.", 502, "LEARNING_STORAGE_FAILED");
  return (data ?? []).map((row) => ({
    id: row.session_id,
    kind: row.kind as LearningKind,
    status: row.status,
    scorePercent: row.score_percent,
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }));
}
