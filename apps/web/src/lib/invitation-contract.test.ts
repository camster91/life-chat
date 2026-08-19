import { describe, expect, it } from "vitest";
import { acceptInvitation, createInvitation, InvitationStateError } from "./invitation-contract";

const now = new Date("2026-08-18T12:00:00.000Z");

describe("invitation contract", () => {
  it("stores only a token hash and creates an active member acceptance command", () => {
    const created = createInvitation({
      householdId: "household-a",
      issuerMemberId: "adult-a",
      intendedRole: "child",
      intendedDisplayName: "Sam",
      expiresAt: new Date("2026-08-19T12:00:00.000Z"),
      now,
    });

    expect(created.invitation.tokenHash).not.toContain(created.token);
    expect(JSON.stringify(created.invitation)).not.toContain(created.token);
    expect(acceptInvitation({ invitation: created.invitation, token: created.token, subjectId: "subject-sam", now })).toMatchObject({
      householdId: "household-a",
      subjectId: "subject-sam",
      member: { displayName: "Sam", role: "child", lifecycle: "active" },
    });
  });

  it("fails closed for a replayed, expired, or mismatched invitation", () => {
    const created = createInvitation({
      householdId: "household-a",
      issuerMemberId: "adult-a",
      intendedRole: "guest",
      intendedDisplayName: "Guest",
      expiresAt: new Date("2026-08-19T12:00:00.000Z"),
      now,
    });

    expect(() => acceptInvitation({ invitation: created.invitation, token: "wrong-token", subjectId: "subject-guest", now })).toThrow(InvitationStateError);
    expect(() => acceptInvitation({ invitation: { ...created.invitation, acceptedAt: now }, token: created.token, subjectId: "subject-guest", now })).toThrow(InvitationStateError);
    expect(() => acceptInvitation({ invitation: created.invitation, token: created.token, subjectId: "subject-guest", now: new Date("2026-08-20T12:00:00.000Z") })).toThrow(InvitationStateError);
  });
});
