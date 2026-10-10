import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/http";
import { createLearningSession, findActiveSession, LearningServiceError } from "@/lib/services/learning";
import type { LearningKind } from "@/lib/learning/catalog";

export const dynamic = "force-dynamic";
const kindSchema = z.enum(["diagnostic", "practice", "reassessment"]);

export async function GET(request: Request): Promise<Response> {
  try {
    const kind = kindSchema.safeParse(new URL(request.url).searchParams.get("kind"));
    if (!kind.success) throw new LearningServiceError("Choose diagnostic, practice, or reassessment.", 422, "SESSION_KIND_INVALID");
    return jsonResponse({ data: findActiveSession(kind.data) });
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
    const existing = findActiveSession(kind);
    return jsonResponse({ data: existing ?? createLearningSession(kind) }, existing ? 200 : 201);
  } catch (error) {
    return errorResponse(error);
  }
}
