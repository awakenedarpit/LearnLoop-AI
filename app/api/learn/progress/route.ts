import { jsonResponse, errorResponse } from "@/lib/http";
import { getProgressOverview } from "@/lib/services/learning";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return jsonResponse({ data: getProgressOverview() });
  } catch (error) {
    return errorResponse(error);
  }
}
