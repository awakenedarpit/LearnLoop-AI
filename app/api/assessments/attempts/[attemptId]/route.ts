import { jsonResponse, errorResponse } from "@/lib/http";
import { finalizeAssessmentAttempt, getAssessmentAttempt } from "@/lib/services/assessments";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ attemptId: string }> };
export async function GET(_request: Request, context: Context): Promise<Response> {
  try { const { attemptId } = await context.params; return jsonResponse({ data: getAssessmentAttempt(attemptId) }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(_request: Request, context: Context): Promise<Response> {
  try { const { attemptId } = await context.params; return jsonResponse({ data: finalizeAssessmentAttempt(attemptId) }); }
  catch (error) { return errorResponse(error); }
}
