import { describe, expect, it } from "vitest";
import { assessDataProcessing } from "./data-governance";

describe("data governance guard", () => {
  it("fails closed when a feature has no retention declaration", () => {
    expect(assessDataProcessing({ containsChildData: false, purpose: "core-household", retentionClass: null, externalRecipient: false, adultApproved: false })).toEqual({
      allowed: false,
      reason: "missing-retention-class",
    });
  });

  it("prohibits advertising and model-training uses of household data", () => {
    expect(assessDataProcessing({ containsChildData: true, purpose: "advertising", retentionClass: "private", externalRecipient: false, adultApproved: true })).toEqual({
      allowed: false,
      reason: "prohibited-purpose",
    });
    expect(assessDataProcessing({ containsChildData: false, purpose: "model-training", retentionClass: "private", externalRecipient: false, adultApproved: true })).toEqual({
      allowed: false,
      reason: "prohibited-purpose",
    });
  });

  it("requires adult approval for child data and blocks unconfigured external disclosure", () => {
    expect(assessDataProcessing({ containsChildData: true, purpose: "core-household", retentionClass: "private", externalRecipient: false, adultApproved: false })).toEqual({
      allowed: false,
      reason: "adult-approval-required",
    });
    expect(assessDataProcessing({ containsChildData: false, purpose: "provider-assistance", retentionClass: "private", externalRecipient: true, adultApproved: true })).toEqual({
      allowed: false,
      reason: "external-disclosure-not-configured",
    });
  });
});
