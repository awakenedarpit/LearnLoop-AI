import { z } from "zod";
import { jsonResponse } from "@/lib/http";
import { recommendNextSteps } from "@/lib/ai/provider";
import { authorizeRoute } from "@/lib/auth/route-guard";
import { isLocalDemoMode } from "@/lib/db/demo-store";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ concepts: z.array(z.string().min(1).max(80)).max(6) }).strict();

export async function POST(request: Request): Promise<Response> {
  const denied = await authorizeRoute(["student"]);
  if (denied) return denied;
  if (!isLocalDemoMode()) return Response.json({ error: { code: "AI_CLOUD_NOT_READY", message: "AI recommendations are not enabled for cloud sessions yet." } }, { status: 503 });
  try {
    const body = bodySchema.parse(await request.json());
    const result = await recommendNextSteps(body.concepts);
    return jsonResponse({ data: { ...result.data, source: result.source, warning: result.warning } });
  } catch {
    return Response.json({ error: { code: "AI_RECOMMENDATION_FAILED", message: "Recommendations are temporarily unavailable." } }, { status: 503 });
  }
}
