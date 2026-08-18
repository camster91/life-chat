import { describe, expect, it } from "vitest";
import { evaluateReleasePlan } from "./release-plan";

const base = {
  environment: "staging" as const,
  revision: "commit_1",
  localChecksPassed: true,
  ciChecksPassed: true,
  verificationOwner: "release-owner",
  rollbackRevision: "commit_0",
  approvalReference: null,
  migration: { required: false, backupRestoreVerified: false, rehearsalPassed: false },
};

describe("release plan guard", () => {
  it("allows a fully evidenced non-production release plan", () => {
    expect(evaluateReleasePlan(base)).toEqual({ ready: true });
  });

  it("requires action-time approval for production", () => {
    expect(evaluateReleasePlan({ ...base, environment: "production" })).toEqual({ ready: false, missing: ["production approval"] });
  });

  it("requires backup/restore and rehearsal evidence for migrations", () => {
    expect(evaluateReleasePlan({ ...base, migration: { required: true, backupRestoreVerified: false, rehearsalPassed: false } })).toEqual({
      ready: false,
      missing: ["backup/restore verification", "migration rehearsal"],
    });
  });
});
