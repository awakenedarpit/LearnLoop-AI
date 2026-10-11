import { z } from "zod";
import { jsonResponse } from "@/lib/http";
import { explainIncorrectAnswer } from "@/lib/ai/provider";
import { getLearningSession } from "@/lib/services/learning";
import { isLocalDemoMode } from "@/lib/db/demo-store";
import { authorizeRoute } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ sessionId: z.string().uuid(), questionId: z.string().min(1).max(120) }).strict();

export async function POST(request: Request): Promise<Response> {
  const denied = await authorizeRoute(["student"]);
  if (denied) return denied;
  if (!isLocalDemoMode()) return Response.json({ error: { code: "AI_CLOUD_NOT_READY", message: "AI explanations are not enabled for cloud sessions yet." } }, { status: 503 });
  try {
    const body = bodySchema.parse(await request.json());
    const session = getLearningSession(body.sessionId);
    if (session.status !== "completed") return Response.json({ error: { code: "SESSION_NOT_COMPLETE", message: "Complete the session before requesting feedback." } }, { status: 409 });
    const question = session.questions.find((item) => item.id === body.questionId);
    if (!question || !question.correctOptionId) return Response.json({ error: { code: "QUESTION_NOT_FOUND", message: "That completed question could not be found." } }, { status: 404 });
    const selected = question.options.find((option) => option.id === question.selectedOptionId)?.text || "No answer";
    const correct = question.options.find((option) => option.id === question.correctOptionId)?.text || "the verified answer";
    const result = await explainIncorrectAnswer({ concept: question.conceptLabel, prompt: question.prompt, selected, correct });
    return jsonResponse({ data: { ...result.data, source: result.source, warning: result.warning } });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: { code: "AI_INPUT_INVALID", message: "The explanation request was not valid." } }, { status: 422 });
    return Response.json({ error: { code: "AI_EXPLANATION_FAILED", message: "This explanation is temporarily unavailable." } }, { status: 503 });
  }
}
