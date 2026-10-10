import { jsonResponse, errorResponse } from "@/lib/http";
import { completeLearningSession } from "@/lib/services/learning";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { sessionId } = await context.params;
    return jsonResponse({ data: completeLearningSession(sessionId) });
  } catch (error) {
    return errorResponse(error);
  }
}
