import { authorizeRoute } from "@/lib/auth/route-guard";
import { DemoModeUnavailableError, isLocalDemoMode } from "@/lib/db/demo-store";
import { publishTeacherQuiz } from "@/lib/services/teacher-quizzes";
import { publishCloudTeacherQuiz } from "@/lib/services/cloud-teacher-quizzes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ quizId: string }> }): Promise<Response> {
  const denied = await authorizeRoute(["teacher"]);
  if (denied) return denied;
  try {
    const { quizId } = await context.params;
    const quiz = isLocalDemoMode()
      ? publishTeacherQuiz(quizId)
      : await publishCloudTeacherQuiz(quizId);
    if (!quiz) return Response.json({ error: { code: "QUIZ_NOT_FOUND", message: "That quiz could not be found." } }, { status: 404 });
    return Response.json({ data: quiz, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Teacher quiz demo mode is not enabled." } }, { status: 503 });
    }
    if (error instanceof Error && error.message === "QUIZ_NEEDS_QUESTIONS") {
      return Response.json({ error: { code: "QUIZ_NEEDS_QUESTIONS", message: "Add at least one question before publishing." } }, { status: 422 });
    }
    if (error instanceof Error && error.message === "PUBLISHED_QUIZ_LOCKED") {
      return Response.json({ error: { code: "PUBLISHED_QUIZ_LOCKED", message: "Published quizzes are locked in this version." } }, { status: 409 });
    }
    console.error("Teacher quiz publish failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not publish that quiz." } }, { status: 500 });
  }
}
