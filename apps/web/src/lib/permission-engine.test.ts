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

  it("allows adults and children to complete only an assignment already scoped to themselves", () => {
    for (const role of ["adult", "child"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "chores.complete-assigned" } })).toEqual({ allowed: true, source: "baseline" });
    }
    expect(authorize({ context, role: "guest", grants: [], now, request: { householdId: context.householdId, permission: "chores.complete-assigned" } })).toEqual({ allowed: false, reason: "missing-permission" });
  });

  it("reserves chore assignment management for adults", () => {
    expect(authorize({ context, role: "adult", grants: [], now, request: { householdId: context.householdId, permission: "chores.manage", appId: "chores" } })).toEqual({ allowed: true, source: "baseline" });
    for (const role of ["child", "guest"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "chores.manage", appId: "chores" } })).toEqual({ allowed: false, reason: "missing-permission" });
    }
  });

  it("lets children read shared lists without granting list management", () => {
    expect(authorize({ context, role: "child", grants: [], now, request: { householdId: context.householdId, permission: "lists.read", appId: "shared-lists" } })).toEqual({ allowed: true, source: "baseline" });
    expect(authorize({ context, role: "child", grants: [], now, request: { householdId: context.householdId, permission: "lists.complete", appId: "shared-lists" } })).toEqual({ allowed: true, source: "baseline" });
    expect(authorize({ context, role: "child", grants: [], now, request: { householdId: context.householdId, permission: "lists.manage", appId: "shared-lists" } })).toEqual({ allowed: false, reason: "missing-permission" });
    expect(authorize({ context, role: "guest", grants: [], now, request: { householdId: context.householdId, permission: "lists.read", appId: "shared-lists" } })).toEqual({ allowed: false, reason: "missing-permission" });
    expect(authorize({ context, role: "guest", grants: [], now, request: { householdId: context.householdId, permission: "lists.complete", appId: "shared-lists" } })).toEqual({ allowed: false, reason: "missing-permission" });
  });

  it("lets adults and children read the household calendar while guests remain denied", () => {
    for (const role of ["adult", "child"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "calendar.read" } })).toEqual({ allowed: true, source: "baseline" });
    }
    expect(authorize({ context, role: "guest", grants: [], now, request: { householdId: context.householdId, permission: "calendar.read" } })).toEqual({ allowed: false, reason: "missing-permission" });
  });

  it("reserves household calendar changes for adults", () => {
    expect(authorize({ context, role: "adult", grants: [], now, request: { householdId: context.householdId, permission: "calendar.manage" } })).toEqual({ allowed: true, source: "baseline" });
    for (const role of ["child", "guest"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "calendar.manage" } })).toEqual({ allowed: false, reason: "missing-permission" });
    }
  });

  it("keeps habit recording personal while adult routine setup stays separate", () => {
    for (const role of ["adult", "child"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "habits.read", appId: "habits" } })).toEqual({ allowed: true, source: "baseline" });
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "habits.record", appId: "habits" } })).toEqual({ allowed: true, source: "baseline" });
    }
    expect(authorize({ context, role: "adult", grants: [], now, request: { householdId: context.householdId, permission: "habits.manage", appId: "habits" } })).toEqual({ allowed: true, source: "baseline" });
    for (const role of ["child", "guest"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "habits.manage", appId: "habits" } })).toEqual({ allowed: false, reason: "missing-permission" });
    }
  });

  it("allows household reward requests while reserving catalogue and decisions for adults", () => {
    for (const role of ["adult", "child"] as const) {
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "rewards.read", appId: "rewards" } })).toEqual({ allowed: true, source: "baseline" });
      expect(authorize({ context, role, grants: [], now, request: { householdId: context.householdId, permission: "rewards.request", appId: "rewards" } })).toEqual({ allowed: true, source: "baseline" });
    }
    for (const permission of ["rewards.manage", "rewards.approve"] as const) {
      expect(authorize({ context, role: "adult", grants: [], now, request: { householdId: context.householdId, permission, appId: "rewards" } })).toEqual({ allowed: true, source: "baseline" });
      expect(authorize({ context, role: "child", grants: [], now, request: { householdId: context.householdId, permission, appId: "rewards" } })).toEqual({ allowed: false, reason: "missing-permission" });
    }
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
