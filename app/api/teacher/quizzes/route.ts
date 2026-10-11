import { authorizeRoute } from "@/lib/auth/route-guard";
import { z } from "zod";
import { DemoModeUnavailableError, isLocalDemoMode } from "@/lib/db/demo-store";
import { createTeacherQuiz, listTeacherQuizzes } from "@/lib/services/teacher-quizzes";
import { createCloudTeacherQuiz, listCloudTeacherQuizzes } from "@/lib/services/cloud-teacher-quizzes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const questionSchema = z.object({
  prompt: z.string().trim().min(5).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(1500).default(""),
  concept: z.string().trim().min(1).max(80).default("General"),
}).strict();

const quizSchema = z.object({
  title: z.string().trim().min(3).max(120),
  instructions: z.string().trim().max(2000).default(""),
  durationMinutes: z.number().int().min(1).max(240),
  availableFrom: z.string().datetime().nullable().default(null),
  availableUntil: z.string().datetime().nullable().default(null),
  attemptLimit: z.number().int().min(1).max(10),
  questions: z.array(questionSchema).min(1).max(100),
}).strict().superRefine((quiz, context) => {
  if (quiz.availableFrom && quiz.availableUntil && quiz.availableUntil <= quiz.availableFrom) {
    context.addIssue({ code: "custom", path: ["availableUntil"], message: "End time must be after start time." });
  }
});

function errorResponse(error: unknown): Response {
  if (error instanceof DemoModeUnavailableError) {
    return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Teacher quiz demo mode is not enabled." } }, { status: 503 });
  }
  console.error("Teacher quiz request failed", error instanceof Error ? error.message : "unknown error");
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not complete that quiz action." } }, { status: 500 });
}

export async function GET(): Promise<Response> {
  const denied = await authorizeRoute(["teacher"]);
  if (denied) return denied;
  try {
    const data = isLocalDemoMode() ? listTeacherQuizzes() : await listCloudTeacherQuizzes();
    return Response.json({ data, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = await authorizeRoute(["teacher"]);
  if (denied) return denied;
  try {
    const parsed = quizSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "QUIZ_INPUT_INVALID", message: parsed.error.issues[0]?.message ?? "Check the quiz fields." } }, { status: 422 });
    }
    const quiz = isLocalDemoMode()
      ? createTeacherQuiz(parsed.data)
      : await createCloudTeacherQuiz(parsed.data);
    return Response.json({ data: quiz, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return errorResponse(error);
  }
}
