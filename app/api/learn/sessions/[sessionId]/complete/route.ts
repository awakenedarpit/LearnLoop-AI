import { jsonResponse, errorResponse } from "@/lib/http";
import { completeLearningSession } from "@/lib/services/learning";
import { completeCloudLearningSession } from "@/lib/services/cloud-learning";
import { isLocalDemoMode } from "@/lib/db/demo-store";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { sessionId } = await context.params;
    const data = isLocalDemoMode()
      ? completeLearningSession(sessionId)
      : await completeCloudLearningSession(sessionId);
    return jsonResponse({ data, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" });
  } catch (error) {
    return errorResponse(error);
  }
}
