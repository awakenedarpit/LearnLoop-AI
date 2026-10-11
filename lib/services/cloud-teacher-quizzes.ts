import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import type { QuizInput, TeacherQuiz, TeacherQuestion } from "@/lib/services/teacher-quizzes";

type QuizRow = {
  id: string;
  title: string;
  instructions: string;
  duration_minutes: number;
  available_from: string | null;
  available_until: string | null;
  attempt_limit: number;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};
type QuestionRow = {
  id: string;
  quiz_id: string;
  position: number;
  prompt: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  concept: string;
};

function mapQuiz(row: QuizRow, questions: QuestionRow[]): TeacherQuiz {
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    durationMinutes: row.duration_minutes,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    attemptLimit: row.attempt_limit,
    status: row.status === "published" ? "published" : "draft",
    questions: questions.sort((a, b) => a.position - b.position).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: Array.isArray(question.options) ? question.options : [],
      correctOptionIndex: question.correct_option_index,
      explanation: question.explanation,
      concept: question.concept,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function questionRows(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, quizIds: string[]) {
  if (!quizIds.length) return [] as QuestionRow[];
  const { data, error } = await supabase.from("quiz_questions").select("*").in("quiz_id", quizIds).order("position");
  if (error) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  return (data ?? []) as QuestionRow[];
}

async function getOwnedQuiz(id: string) {
  const profile = await requireRole(["teacher"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("teacher_quizzes")
    .select("id,title,instructions,duration_minutes,available_from,available_until,attempt_limit,status,created_at,updated_at")
    .eq("id", id).eq("owner_id", profile.id).eq("organization_id", profile.organizationId)
    .maybeSingle();
  if (error) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  if (!data || data.status === "archived") return { profile, supabase, row: null as QuizRow | null };
  return { profile, supabase, row: data as QuizRow };
}

function questionPayload(quizId: string, questions: QuizInput["questions"]) {
  return questions.map((question, position) => ({
    quiz_id: quizId,
    position,
    prompt: question.prompt.trim(),
    options: question.options,
    correct_option_index: question.correctOptionIndex,
    explanation: question.explanation.trim(),
    concept: question.concept.trim(),
  }));
}

export async function listCloudTeacherQuizzes(): Promise<TeacherQuiz[]> {
  const profile = await requireRole(["teacher"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("teacher_quizzes")
    .select("id,title,instructions,duration_minutes,available_from,available_until,attempt_limit,status,created_at,updated_at")
    .eq("owner_id", profile.id).eq("organization_id", profile.organizationId)
    .neq("status", "archived").order("updated_at", { ascending: false });
  if (error) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  const rows = (data ?? []) as QuizRow[];
  const questions = await questionRows(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapQuiz(row, questions.filter((question) => question.quiz_id === row.id)));
}

export async function getCloudTeacherQuiz(id: string): Promise<TeacherQuiz | null> {
  const { supabase, row } = await getOwnedQuiz(id);
  if (!row) return null;
  const questions = await questionRows(supabase, [id]);
  return mapQuiz(row, questions);
}

export async function createCloudTeacherQuiz(input: QuizInput): Promise<TeacherQuiz> {
  const profile = await requireRole(["teacher"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("teacher_quizzes").insert({
    organization_id: profile.organizationId,
    owner_id: profile.id,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    duration_minutes: input.durationMinutes,
    available_from: input.availableFrom,
    available_until: input.availableUntil,
    attempt_limit: input.attemptLimit,
    status: "draft",
  }).select("id").single();
  if (error || !data) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  const { error: questionError } = await supabase.from("quiz_questions").insert(questionPayload(data.id, input.questions));
  if (questionError) {
    await supabase.from("teacher_quizzes").delete().eq("id", data.id).eq("owner_id", profile.id);
    throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  }
  const quiz = await getCloudTeacherQuiz(data.id);
  if (!quiz) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  return quiz;
}

export async function updateCloudTeacherQuiz(id: string, input: QuizInput): Promise<TeacherQuiz | null> {
  const { profile, supabase, row } = await getOwnedQuiz(id);
  if (!row) return null;
  if (row.status !== "draft") throw new Error("PUBLISHED_QUIZ_LOCKED");

  const currentQuestions = await questionRows(supabase, [id]);
  const { error: updateError } = await supabase.from("teacher_quizzes").update({
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    duration_minutes: input.durationMinutes,
    available_from: input.availableFrom,
    available_until: input.availableUntil,
    attempt_limit: input.attemptLimit,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_id", profile.id).eq("status", "draft");
  if (updateError) {
    if (updateError.message.includes("PUBLISHED_QUIZ_LOCKED")) throw new Error("PUBLISHED_QUIZ_LOCKED");
    throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  }

  const { error: deleteError } = await supabase.from("quiz_questions").delete().eq("quiz_id", id);
  if (deleteError) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  const { error: insertError } = await supabase.from("quiz_questions").insert(questionPayload(id, input.questions));
  if (insertError) {
    // Best-effort compensation keeps the old draft usable if a replacement fails.
    await supabase.from("quiz_questions").insert(currentQuestions.map((question) => ({
      id: question.id,
      quiz_id: question.quiz_id,
      position: question.position,
      prompt: question.prompt,
      options: question.options,
      correct_option_index: question.correct_option_index,
      explanation: question.explanation,
      concept: question.concept,
    })));
    throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  }
  return getCloudTeacherQuiz(id);
}

export async function publishCloudTeacherQuiz(id: string): Promise<TeacherQuiz | null> {
  const { profile, supabase, row } = await getOwnedQuiz(id);
  if (!row) return null;
  if (row.status === "published") return getCloudTeacherQuiz(id);
  const { count, error: countError } = await supabase.from("quiz_questions")
    .select("id", { count: "exact", head: true }).eq("quiz_id", id);
  if (countError) throw new Error("CLOUD_TEACHER_STORAGE_FAILED");
  if (!count) throw new Error("QUIZ_NEEDS_QUESTIONS");
  const { error } = await supabase.from("teacher_quizzes").update({
    status: "published",
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_id", profile.id).eq("status", "draft");
  if (error) throw new Error(error.message.includes("PUBLISHED_QUIZ_LOCKED") ? "PUBLISHED_QUIZ_LOCKED" : "CLOUD_TEACHER_STORAGE_FAILED");
  return getCloudTeacherQuiz(id);
}
