import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { startOrResumeStudentQuizAttempt } from "@/lib/services/student-quiz-attempts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  try {
    const { quizId } = await context.params;
    const attempt = startOrResumeStudentQuizAttempt(quizId);
    return Response.json({ data: attempt, mode: "fictional_demo" }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    if (error instanceof Error && error.message === "ATTEMPT_LIMIT_REACHED") return Response.json({ error: { code: "ATTEMPT_LIMIT_REACHED", message: "You have used all available attempts for this quiz." } }, { status: 409 });
    if (error instanceof Error && ["QUIZ_NOT_AVAILABLE", "ATTEMPT_EXPIRED"].includes(error.message)) return Response.json({ error: { code: error.message, message: error.message === "ATTEMPT_EXPIRED" ? "Your previous attempt expired and has been submitted." : "This quiz is not currently available." } }, { status: 409 });
    console.error("Could not start quiz attempt", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not start this quiz." } }, { status: 500 });
  }
}
