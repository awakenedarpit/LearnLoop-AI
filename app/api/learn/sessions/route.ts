import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/http";
import { createLearningSession, findActiveSession, LearningServiceError } from "@/lib/services/learning";
import { createCloudLearningSession, findActiveCloudLearningSession } from "@/lib/services/cloud-learning";
import { isLocalDemoMode } from "@/lib/db/demo-store";
import type { LearningKind } from "@/lib/learning/catalog";

export const dynamic = "force-dynamic";
const kindSchema = z.enum(["diagnostic", "practice", "reassessment"]);

export async function GET(request: Request): Promise<Response> {
  try {
    const kind = kindSchema.safeParse(new URL(request.url).searchParams.get("kind"));
    if (!kind.success) throw new LearningServiceError("Choose diagnostic, practice, or reassessment.", 422, "SESSION_KIND_INVALID");
    const data = isLocalDemoMode()
      ? findActiveSession(kind.data)
      : await findActiveCloudLearningSession(kind.data);
    return jsonResponse({ data, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = z.object({ kind: kindSchema }).strict().safeParse(body);
    if (!parsed.success) throw new LearningServiceError("Choose a valid learning session type.", 422, "SESSION_KIND_INVALID");
    const kind: LearningKind = parsed.data.kind;
    const existing = isLocalDemoMode()
      ? findActiveSession(kind)
      : await findActiveCloudLearningSession(kind);
    const data = existing ?? (isLocalDemoMode()
      ? createLearningSession(kind)
      : await createCloudLearningSession(kind));
    return jsonResponse({ data, mode: isLocalDemoMode() ? "fictional_demo" : "cloud" }, existing ? 200 : 201);
  } catch (error) {
    return errorResponse(error);
  }
}
