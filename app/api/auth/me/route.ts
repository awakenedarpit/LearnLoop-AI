import { authErrorResponse, getAuthenticatedProfile } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile) return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
    return Response.json({ data: profile }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    console.error("Auth profile lookup failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load account." } }, { status: 500 });
  }
}
