import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/http";
import { AssessmentServiceError, saveAssessmentAnswer } from "@/lib/services/assessments";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ attemptId: string; questionId: string }> };
export async function PUT(request: Request, context: Context): Promise<Response> {
  try {
    const { attemptId, questionId } = await context.params;
    const parsed = z.object({ selectedOptionIndex: z.number().int().min(0).max(3) }).strict().safeParse(await request.json());
    if (!parsed.success) throw new AssessmentServiceError("Choose a valid answer option.", 422, "OPTION_INVALID");
    return jsonResponse({ data: saveAssessmentAnswer(attemptId, questionId, parsed.data.selectedOptionIndex) });
  } catch (error) { return errorResponse(error); }
}
