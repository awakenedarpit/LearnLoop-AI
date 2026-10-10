import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { getTeacherReviewDetail, listTeacherReviewSummaries } from "@/lib/services/teacher-review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const attemptId = url.searchParams.get("attemptId");
    if (attemptId) {
      const data = getTeacherReviewDetail(attemptId);
      if (!data) {
        return Response.json({ error: { code: "ATTEMPT_NOT_FOUND", message: "That finalized submission could not be found." } }, { status: 404 });
      }
      return Response.json({ data, mode: "fictional_demo" }, {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }

    const quizId = url.searchParams.get("quizId") ?? undefined;
    return Response.json({ data: listTeacherReviewSummaries(quizId), mode: "fictional_demo" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Teacher submission review demo mode is not enabled." } }, { status: 503 });
    }
    console.error("Teacher submission review failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load submission review." } }, { status: 500 });
  }
}
