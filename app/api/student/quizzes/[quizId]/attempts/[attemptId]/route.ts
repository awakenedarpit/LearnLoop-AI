import { authorizeRoute } from "@/lib/auth/route-guard";
import { z } from "zod";
import { DemoModeUnavailableError, isLocalDemoMode } from "@/lib/db/demo-store";
import { saveStudentQuizAttemptAnswers } from "@/lib/services/student-quiz-attempts";
import { CloudAssessmentError, saveCloudStudentQuizAttemptAnswers } from "@/lib/services/cloud-student-assessments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ answers: z.record(z.string(), z.number().int().min(0).max(3)) }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ quizId: string; attemptId: string }> }): Promise<Response> {
  const denied = await authorizeRoute(["student"]);
  if (denied) return denied;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: { code: "ANSWERS_INVALID", message: "Submit valid question answers." } }, { status: 422 });
    const { quizId, attemptId } = await context.params;
    const data = isLocalDemoMode()
      ? saveStudentQuizAttemptAnswers(attemptId, quizId, parsed.data.answers)
      : await saveCloudStudentQuizAttemptAnswers(attemptId, parsed.data.answers);
    return Response.json({ data, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) return Response.json({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Student quiz demo mode is not enabled." } }, { status: 503 });
    if (error instanceof CloudAssessmentError) {
      const code = error.message;
      const status = code === "AUTH_REQUIRED" ? 401 : code === "ATTEMPT_NOT_FOUND" ? 404 : ["INVALID_ANSWERS"].includes(code) ? 422 : ["ATTEMPT_EXPIRED", "ATTEMPT_NOT_ACTIVE"].includes(code) ? 409 : 502;
      return Response.json({ error: { code, message: code === "ATTEMPT_EXPIRED" ? "Time is up. Submit your saved answers." : "Could not save your answers." } }, { status });
    }
    if (error instanceof Error && error.message === "INVALID_ANSWERS") return Response.json({ error: { code: "ANSWERS_INVALID", message: "One or more answers do not belong to this quiz." } }, { status: 422 });
    if (error instanceof Error && error.message === "ATTEMPT_EXPIRED") return Response.json({ error: { code: "ATTEMPT_EXPIRED", message: "Time is up. Submit your saved answers." } }, { status: 409 });
    if (error instanceof Error && ["ATTEMPT_NOT_FOUND", "ATTEMPT_NOT_ACTIVE"].includes(error.message)) return Response.json({ error: { code: error.message, message: "This attempt is no longer editable." } }, { status: 409 });
    console.error("Could not save quiz answers", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not save your answers." } }, { status: 500 });
  }
}
