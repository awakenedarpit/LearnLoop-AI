import type { AppRole } from "@/lib/auth/guards";

export type MembershipCandidate = {
  organization_id: string;
  role: string;
};

/**
 * Until an explicit organization switcher exists, only accept a single trusted
 * membership. Silently choosing the oldest membership can authorize a request
 * against the wrong tenant for users who belong to more than one organization.
 */
export function resolveSingleMembership(
  memberships: MembershipCandidate[] | null | undefined,
): { organizationId: string; role: AppRole } | null {
  if (!memberships || memberships.length !== 1) return null;
  const membership = memberships[0];
  if (!membership?.organization_id) return null;
  if (membership.role !== "student" && membership.role !== "teacher" && membership.role !== "org_admin") {
    return null;
  }
  return { organizationId: membership.organization_id, role: membership.role };
}
