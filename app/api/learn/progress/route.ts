import { jsonResponse, errorResponse } from "@/lib/http";
import { getProgressOverview } from "@/lib/services/learning";
import { getCloudProgressOverview } from "@/lib/services/cloud-learning";
import { isLocalDemoMode } from "@/lib/db/demo-store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = isLocalDemoMode() ? getProgressOverview() : await getCloudProgressOverview();
    return jsonResponse({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
