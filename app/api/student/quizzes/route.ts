import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { listStudentQuizzes } from "@/lib/services/student-quizzes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: listStudentQuizzes(), mode: "fictional_demo" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    }
    console.error("Student quiz listing failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load available quizzes." } }, { status: 500 });
  }
}
