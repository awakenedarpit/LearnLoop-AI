import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirects";

describe("safe auth redirects", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("/learn/history?from=auth")).toBe("/learn/history?from=auth");
  });

  it("rejects external and ambiguous paths", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });
});
