import { describe, expect, it } from "vitest";
import { ActiveContextError, resolveActiveHouseholdContext } from "./identity-context";

const now = new Date("2026-08-18T12:00:00.000Z");
const subject = "subject-a";

describe("resolveActiveHouseholdContext", () => {
  it("derives a household only from the selected active member linked to the authenticated subject", () => {
    expect(resolveActiveHouseholdContext({
      authenticatedSubjectId: subject,
      requestedMemberId: "member-b",
      now,
      members: [
        { memberId: "member-a", householdId: "household-a", authenticatedSubjectId: subject, lifecycle: "active", expiresAt: null },
        { memberId: "member-b", householdId: "household-b", authenticatedSubjectId: subject, lifecycle: "active", expiresAt: null },
      ],
    })).toEqual({ authenticatedSubjectId: subject, memberId: "member-b", householdId: "household-b" });
  });

  it("denies a member selected by another subject, even if the caller knows its identifier", () => {
    expect(() => resolveActiveHouseholdContext({
      authenticatedSubjectId: subject,
      requestedMemberId: "member-other",
      now,
      members: [{ memberId: "member-other", householdId: "household-other", authenticatedSubjectId: "subject-other", lifecycle: "active", expiresAt: null }],
    })).toThrow(ActiveContextError);
  });

  it("denies suspended and expired memberships", () => {
    for (const member of [
      { memberId: "suspended", householdId: "household-a", authenticatedSubjectId: subject, lifecycle: "suspended" as const, expiresAt: null },
      { memberId: "expired", householdId: "household-a", authenticatedSubjectId: subject, lifecycle: "active" as const, expiresAt: new Date("2026-08-18T11:59:59.000Z") },
    ]) {
      expect(() => resolveActiveHouseholdContext({ authenticatedSubjectId: subject, requestedMemberId: member.memberId, now, members: [member] })).toThrow(ActiveContextError);
    }
  });
});
