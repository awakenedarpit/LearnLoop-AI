import "server-only";

import { resolveSingleMembership } from "@/lib/auth/membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "student" | "teacher" | "org_admin";

export type AuthenticatedProfile = {
  id: string;
  organizationId: string;
  role: AppRole;
  displayName: string | null;
};

export class AuthRequiredError extends Error {
  constructor() {
    super("AUTH_REQUIRED");
    this.name = "AuthRequiredError";
  }
}

export class RoleForbiddenError extends Error {
  constructor() {
    super("ROLE_FORBIDDEN");
    this.name = "RoleForbiddenError";
  }
}

export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("id", user.id).maybeSingle(),
    // Fetch at most two rows: enough to detect ambiguity without loading every membership.
    // Until an organization selector is implemented, ambiguous tenant context must fail closed.
    supabase.from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(2),
  ]);

  if (profileError || membershipError || !profile) return null;
  const membership = resolveSingleMembership(memberships);
  if (!membership) return null;

  return {
    id: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    displayName: profile.display_name,
  };
}

export async function requireRole(allowedRoles: AppRole[]): Promise<AuthenticatedProfile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) throw new AuthRequiredError();
  if (!allowedRoles.includes(profile.role)) throw new RoleForbiddenError();
  return profile;
}

export function authErrorResponse(error: unknown): Response | null {
  if (error instanceof AuthRequiredError) {
    return Response.json({ error: { code: "AUTH_REQUIRED", message: "Sign in to continue." } }, { status: 401 });
  }
  if (error instanceof RoleForbiddenError) {
    return Response.json({ error: { code: "ROLE_FORBIDDEN", message: "Your account does not have permission for this action." } }, { status: 403 });
  }
  if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
    return Response.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Sign-in is unavailable until the LearnLoop Supabase project is configured." } }, { status: 503 });
  }
  return null;
}
