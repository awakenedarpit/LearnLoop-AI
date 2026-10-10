import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/http";
import { AssessmentServiceError, createAssessmentAttempt, listAvailableAssessments } from "@/lib/services/assessments";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(): Promise<Response> {
  try { return jsonResponse({ data: listAvailableAssessments(), mode: "fictional_demo" }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = z.object({ quizId: z.string().uuid() }).strict().safeParse(await request.json());
    if (!parsed.success) throw new AssessmentServiceError("Choose a valid published assessment.", 422, "QUIZ_ID_INVALID");
    return jsonResponse({ data: createAssessmentAttempt(parsed.data.quizId), mode: "fictional_demo" }, 201);
  } catch (error) { return errorResponse(error); }
}
