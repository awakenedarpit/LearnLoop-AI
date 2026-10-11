import { describe, expect, it } from "vitest";
import { resolveSingleMembership } from "@/lib/auth/membership";

describe("trusted organization membership resolution", () => {
  it("accepts one membership with a known application role", () => {
    expect(resolveSingleMembership([{ organization_id: "org-a", role: "student" }])).toEqual({
      organizationId: "org-a",
      role: "student",
    });
  });

  it("fails closed when membership is missing or ambiguous", () => {
    expect(resolveSingleMembership(null)).toBeNull();
    expect(resolveSingleMembership([])).toBeNull();
    expect(resolveSingleMembership([
      { organization_id: "org-a", role: "student" },
      { organization_id: "org-b", role: "teacher" },
    ])).toBeNull();
  });

  it("rejects unknown roles and missing organization IDs", () => {
    expect(resolveSingleMembership([{ organization_id: "org-a", role: "owner" }])).toBeNull();
    expect(resolveSingleMembership([{ organization_id: "", role: "student" }])).toBeNull();
  });
});
