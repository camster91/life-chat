import { describe, expect, it } from "vitest";
import { createFamilyManagementState, proposeMembershipChange, type FamilyMemberSummary } from "./family-management";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const member: FamilyMemberSummary = { memberId: "member_2", householdId: "household_1", displayName: "Alex", role: "child", lifecycle: "active", expiresAt: null, hasAccount: true, authorized: true };
const state = (role: "adult" | "child", members = [member]) => createFamilyManagementState({ context, role, grants: [], now: new Date("2026-08-18T12:00:00Z"), members });

describe("family management", () => {
  it("shows authorized adult member summaries and creates confirmation-required proposals", () => {
    const view = state("adult");
    expect(view.members).toEqual([member]);
    expect(proposeMembershipChange({ state: view, targetMemberId: "member_2", operation: "suspend" })).toEqual({ targetMemberId: "member_2", operation: "suspend", requiresConfirmation: true });
  });

  it("keeps child directory access and membership changes denied", () => {
    const view = state("child");
    expect(view.members).toEqual([]);
    expect(() => proposeMembershipChange({ state: view, targetMemberId: "member_2", operation: "remove" })).toThrow("authorized");
  });

  it("rejects a cross-household or unsafe display summary", () => {
    expect(() => state("adult", [{ ...member, householdId: "household_2" }])).toThrow("household");
    expect(() => state("adult", [{ ...member, displayName: "" }])).toThrow("bounded");
    expect(() => state("adult", [{ ...member, expiresAt: "not-an-instant" }])).toThrow("expiry");
  });
});
