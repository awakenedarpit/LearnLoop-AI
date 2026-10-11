import { jsonResponse, errorResponse } from "@/lib/http";
import { getLearningSession } from "@/lib/services/learning";
import { getCloudLearningSession } from "@/lib/services/cloud-learning";
import { isLocalDemoMode } from "@/lib/db/demo-store";

type RouteContext = { params: Promise<{ sessionId: string }> };
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { sessionId } = await context.params;
    const data = isLocalDemoMode()
      ? getLearningSession(sessionId)
      : await getCloudLearningSession(sessionId);
    return jsonResponse({ data, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" });
  } catch (error) {
    return errorResponse(error);
  }
}
