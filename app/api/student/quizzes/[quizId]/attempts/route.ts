import { z } from "zod";
import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { submitStudentQuizAttempt } from "@/lib/services/student-quizzes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const submissionSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  try {
    const parsed = submissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "ANSWERS_INVALID", message: "Submit a valid answer for each question." } }, { status: 422 });
    }
    const { quizId } = await context.params;
    const result = submitStudentQuizAttempt(quizId, parsed.data.answers);
    if (!result) return Response.json({ error: { code: "QUIZ_NOT_AVAILABLE", message: "This quiz is not currently available." } }, { status: 404 });
    return Response.json({ data: result, mode: "fictional_demo" }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    }
    if (error instanceof Error && error.message === "ATTEMPT_LIMIT_REACHED") {
      return Response.json({ error: { code: "ATTEMPT_LIMIT_REACHED", message: "You have used all available attempts for this quiz." } }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_ANSWERS") {
      return Response.json({ error: { code: "ANSWERS_INVALID", message: "One or more answers do not belong to this quiz." } }, { status: 422 });
    }
    console.error("Student quiz submission failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not submit this quiz." } }, { status: 500 });
  }
}
