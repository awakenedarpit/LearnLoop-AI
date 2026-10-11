import { authorizeRoute } from "@/lib/auth/route-guard";
import { DemoModeUnavailableError, isLocalDemoMode } from "@/lib/db/demo-store";
import { getStudentQuiz } from "@/lib/services/student-quizzes";
import { CloudAssessmentError, getCloudStudentQuiz } from "@/lib/services/cloud-student-assessments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  const denied = await authorizeRoute(["student"]);
  if (denied) return denied;
  try {
    const { quizId } = await context.params;
    const quiz = isLocalDemoMode() ? getStudentQuiz(quizId) : await getCloudStudentQuiz(quizId);
    if (!quiz) return Response.json({ error: { code: "QUIZ_NOT_AVAILABLE", message: "This quiz is not currently available." } }, { status: 404 });
    return Response.json({ data: quiz, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    }
    if (error instanceof CloudAssessmentError) {
      const status = error.message === "AUTH_REQUIRED" ? 401 : error.message === "QUIZ_NOT_AVAILABLE" ? 404 : 502;
      return Response.json({ error: { code: error.message, message: "Could not load this quiz." } }, { status });
    }
    console.error("Student quiz fetch failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load this quiz." } }, { status: 500 });
  }
}
