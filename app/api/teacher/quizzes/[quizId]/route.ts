import { z } from "zod";
import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { updateTeacherQuiz } from "@/lib/services/teacher-quizzes";

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

export async function PATCH(request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  try {
    const { quizId } = await context.params;
    const parsed = quizSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "QUIZ_INPUT_INVALID", message: parsed.error.issues[0]?.message ?? "Check the quiz fields." } }, { status: 422 });
    }
    const quiz = updateTeacherQuiz(quizId, parsed.data);
    if (!quiz) return Response.json({ error: { code: "QUIZ_NOT_FOUND", message: "That quiz could not be found." } }, { status: 404 });
    return Response.json({ data: quiz, mode: "fictional_demo" }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Teacher quiz demo mode is not enabled." } }, { status: 503 });
    }
    if (error instanceof Error && error.message === "PUBLISHED_QUIZ_LOCKED") {
      return Response.json({ error: { code: "PUBLISHED_QUIZ_LOCKED", message: "Published quizzes are locked in this version." } }, { status: 409 });
    }
    console.error("Teacher quiz update failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not update that quiz." } }, { status: 500 });
  }
}
