import { z } from "zod";
import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { finalizeStudentQuizAttempt } from "@/lib/services/student-quiz-attempts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const submissionSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  try {
    const parsed = submissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "ANSWERS_INVALID", message: "Submit a valid answer for each question." } }, { status: 422 });
    }
    const { quizId } = await context.params;
    const result = finalizeStudentQuizAttempt(parsed.data.attemptId, quizId, parsed.data.answers);
    if (!result) return Response.json({ error: { code: "QUIZ_NOT_AVAILABLE", message: "This quiz is not currently available." } }, { status: 404 });
    return Response.json({ data: result, mode: "fictional_demo" }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    }
    if (error instanceof Error && ["ATTEMPT_LIMIT_REACHED", "ATTEMPT_EXPIRED", "ATTEMPT_NOT_ACTIVE", "ATTEMPT_NOT_FOUND"].includes(error.message)) {
      const status = error.message === "ATTEMPT_LIMIT_REACHED" ? 409 : error.message === "ATTEMPT_NOT_FOUND" ? 404 : 409;
      return Response.json({ error: { code: error.message, message: error.message === "ATTEMPT_EXPIRED" ? "Time is up. Your saved answers were submitted or the attempt expired." : "This attempt cannot be submitted." } }, { status });
    }
    if (error instanceof Error && error.message === "QUIZ_NOT_AVAILABLE") return Response.json({ error: { code: "QUIZ_NOT_AVAILABLE", message: "This quiz is not currently available." } }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_ANSWERS") {
      return Response.json({ error: { code: "ANSWERS_INVALID", message: "One or more answers do not belong to this quiz." } }, { status: 422 });
    }
    console.error("Student quiz submission failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not submit this quiz." } }, { status: 500 });
  }
}
