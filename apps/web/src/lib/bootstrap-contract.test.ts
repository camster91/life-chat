import { describe, expect, it } from "vitest";
import { BootstrapStateError, planFirstOwnerBootstrap } from "./bootstrap-contract";

const input = {
  existingHouseholdCount: 0,
  localOperatorConfirmed: true,
  subjectId: "subject-owner",
  householdName: "Home",
  displayName: "Owner",
  now: new Date("2026-08-18T12:00:00.000Z"),
};

describe("first owner bootstrap contract", () => {
  it("creates exactly one active adult plan with an auditable setup action", () => {
    const plan = planFirstOwnerBootstrap(input);
    expect(plan.owner).toMatchObject({ subjectId: "subject-owner", role: "adult", lifecycle: "active" });
    expect(plan.auditEvent).toMatchObject({ action: "household.bootstrap-first-owner", outcome: "succeeded" });
  });

  it("fails closed without local confirmation or after a household exists", () => {
    expect(() => planFirstOwnerBootstrap({ ...input, localOperatorConfirmed: false })).toThrow(BootstrapStateError);
    expect(() => planFirstOwnerBootstrap({ ...input, existingHouseholdCount: 1 })).toThrow(BootstrapStateError);
  });
});
