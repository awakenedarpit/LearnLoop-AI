import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "student" | "teacher" | "org_admin";

export type AuthenticatedProfile = {
  id: string;
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;
  if (!["student", "teacher", "org_admin"].includes(profile.role)) return null;

  return { id: profile.id, role: profile.role as AppRole, displayName: profile.display_name };
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
