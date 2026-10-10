import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { getTeacherAnalytics } from "@/lib/services/teacher-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: getTeacherAnalytics() }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Teacher analytics demo mode is not enabled." } }, { status: 503 });
    }
    console.error("Teacher analytics request failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load assessment analytics." } }, { status: 500 });
  }
}
