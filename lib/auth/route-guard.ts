import "server-only";
import { authErrorResponse, requireRole, type AppRole } from "@/lib/auth/guards";
import { isLocalDemoMode } from "@/lib/db/demo-store";

/** Demo routes remain fictional-only. Cloud mode requires a validated Supabase identity and trusted org membership. */
export async function authorizeRoute(roles: AppRole[]): Promise<Response | null> {
  if (isLocalDemoMode()) return null;
  try {
    await requireRole(roles);
    return null;
  } catch (error) {
    return authErrorResponse(error) ?? Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Sign in to continue." } },
      { status: 401, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
