import { describe, expect, it } from "vitest";
import { authorize } from "./permission-engine";

const now = new Date("2026-08-18T12:00:00.000Z");
const context = { authenticatedSubjectId: "subject-a", memberId: "member-a", householdId: "household-a" };

describe("authorize", () => {
  it("denies another household even when an adult has the baseline permission", () => {
    expect(authorize({ context, role: "adult", grants: [], now, request: { householdId: "household-b", permission: "member.read" } })).toEqual({ allowed: false, reason: "household-mismatch" });
  });

  it("keeps child and guest personas deny-by-default", () => {
    expect(authorize({ context, role: "child", grants: [], now, request: { householdId: "household-a", permission: "data.export" } })).toEqual({ allowed: false, reason: "missing-permission" });
    expect(authorize({ context, role: "guest", grants: [], now, request: { householdId: "household-a", permission: "household.read" } })).toEqual({ allowed: false, reason: "missing-permission" });
  });

  it("allows only a matching, unexpired scoped grant", () => {
    const grant = { grantId: "grant-a", memberId: "member-a", householdId: "household-a", permission: "profile.read-self" as const, appId: "habits", resourceId: "habit-a", expiresAt: new Date("2026-08-18T12:01:00.000Z") };
    expect(authorize({ context, role: "guest", grants: [grant], now, request: { householdId: "household-a", permission: "profile.read-self", appId: "habits", resourceId: "habit-a" } })).toEqual({ allowed: true, source: "grant" });
    expect(authorize({ context, role: "guest", grants: [grant], now, request: { householdId: "household-a", permission: "profile.read-self", appId: "habits", resourceId: "habit-b" } })).toEqual({ allowed: false, reason: "missing-permission" });
  });

  it("denies an expired grant", () => {
    expect(authorize({
      context,
      role: "guest",
      now,
      request: { householdId: "household-a", permission: "profile.read-self" },
      grants: [{ grantId: "grant-expired", memberId: "member-a", householdId: "household-a", permission: "profile.read-self", appId: null, resourceId: null, expiresAt: new Date("2026-08-18T11:59:59.000Z") }],
    })).toEqual({ allowed: false, reason: "missing-permission" });
  });
});
