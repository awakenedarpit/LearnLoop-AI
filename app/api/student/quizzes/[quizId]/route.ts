import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { getStudentQuiz } from "@/lib/services/student-quizzes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  try {
    const { quizId } = await context.params;
    const quiz = getStudentQuiz(quizId);
    if (!quiz) return Response.json({ error: { code: "QUIZ_NOT_AVAILABLE", message: "This quiz is not currently available." } }, { status: 404 });
    return Response.json({ data: quiz, mode: "fictional_demo" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    }
    console.error("Student quiz fetch failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load this quiz." } }, { status: 500 });
  }
}
