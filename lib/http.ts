import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { AssessmentServiceError } from "@/lib/services/assessments";
import { LearningServiceError } from "@/lib/services/learning";

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AssessmentServiceError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (error instanceof LearningServiceError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (error instanceof DemoModeUnavailableError) {
    return jsonResponse({ error: { code: "DEMO_MODE_UNAVAILABLE", message: "Cloud authentication is not configured for this route." } }, 503);
  }
  console.error("LearnLoop request failed", error instanceof Error ? error.message : "unknown error");
  return jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, 500);
}
