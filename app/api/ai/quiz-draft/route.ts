import { z } from "zod";
import { generateQuizDraft } from "@/lib/ai/provider";
import { authorizeRoute } from "@/lib/auth/route-guard";
import { jsonResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ topic: z.string().trim().min(2).max(120), count: z.number().int().min(1).max(10) }).strict();

export async function POST(request: Request): Promise<Response> {
  const denied = await authorizeRoute(["teacher", "org_admin"]);
  if (denied) return denied;
  try {
    const body = bodySchema.parse(await request.json());
    const result = await generateQuizDraft(body.topic, body.count);
    return jsonResponse({ data: { ...result.data, source: result.source, warning: result.warning, requiresTeacherReview: true } });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: { code: "AI_INPUT_INVALID", message: "Provide a topic and between 1 and 10 questions." } }, { status: 422 });
    return Response.json({ error: { code: "AI_DRAFT_FAILED", message: "A quiz draft could not be generated." } }, { status: 503 });
  }
}
