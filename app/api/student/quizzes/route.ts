import { authorizeRoute } from "@/lib/auth/route-guard";
import { DemoModeUnavailableError, isLocalDemoMode } from "@/lib/db/demo-store";
import { listStudentQuizzes } from "@/lib/services/student-quizzes";
import { CloudAssessmentError, listCloudStudentQuizzes } from "@/lib/services/cloud-student-assessments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const denied = await authorizeRoute(["student"]);
  if (denied) return denied;
  try {
    if (isLocalDemoMode()) {
      return Response.json({ data: listStudentQuizzes(), mode: "fictional_demo" }, {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }
    return Response.json({ data: await listCloudStudentQuizzes(), mode: "cloud" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    }
    if (error instanceof CloudAssessmentError) {
      const status = error.message === "AUTH_REQUIRED" ? 401 : error.message === "QUIZ_NOT_AVAILABLE" ? 404 : 502;
      return Response.json({ error: { code: error.message, message: "Could not load available quizzes." } }, { status });
    }
    console.error("Student quiz listing failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load available quizzes." } }, { status: 500 });
  }
}
