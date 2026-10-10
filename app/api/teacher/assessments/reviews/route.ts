import { jsonResponse, errorResponse } from "@/lib/http";
import { listAssessmentReviews } from "@/lib/services/assessments";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(): Promise<Response> {
  try { return jsonResponse({ data: listAssessmentReviews(), mode: "fictional_demo" }); }
  catch (error) { return errorResponse(error); }
}
