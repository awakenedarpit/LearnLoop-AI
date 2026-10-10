import { jsonResponse, errorResponse } from "@/lib/http";
import { getLearningSession } from "@/lib/services/learning";

type RouteContext = { params: Promise<{ sessionId: string }> };
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { sessionId } = await context.params;
    return jsonResponse({ data: getLearningSession(sessionId) });
  } catch (error) {
    return errorResponse(error);
  }
}
