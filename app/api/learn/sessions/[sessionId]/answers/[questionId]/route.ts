import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/http";
import { LearningServiceError, saveLearningAnswer } from "@/lib/services/learning";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ sessionId: string; questionId: string }> };
const answerSchema = z.object({
  selectedOptionId: z.string().min(1).max(8),
  confidence: z.enum(["guessing", "somewhat", "confident"]).nullable().optional(),
}).strict();

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { sessionId, questionId } = await context.params;
    const parsed = answerSchema.safeParse(await request.json());
    if (!parsed.success) throw new LearningServiceError("Choose a valid answer option.", 422, "ANSWER_INVALID");
    const data = saveLearningAnswer(sessionId, questionId, parsed.data.selectedOptionId, parsed.data.confidence ?? null);
    return jsonResponse({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
