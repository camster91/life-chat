export type DataPurpose = "core-household" | "provider-assistance" | "analytics" | "advertising" | "model-training";

export type DataProcessingRequest = Readonly<{
  containsChildData: boolean;
  purpose: DataPurpose;
  retentionClass: string | null;
  externalRecipient: boolean;
  adultApproved: boolean;
}>;

export type DataProcessingDecision =
  | { allowed: true }
  | { allowed: false; reason: "missing-retention-class" | "prohibited-purpose" | "adult-approval-required" | "external-disclosure-not-configured" };

export function assessDataProcessing(request: DataProcessingRequest): DataProcessingDecision {
  if (request.retentionClass === null || request.retentionClass.trim().length === 0) {
    return { allowed: false, reason: "missing-retention-class" };
  }
  if (request.purpose === "advertising" || request.purpose === "model-training") {
    return { allowed: false, reason: "prohibited-purpose" };
  }
  if (request.containsChildData && !request.adultApproved) {
    return { allowed: false, reason: "adult-approval-required" };
  }
  if (request.externalRecipient) {
    return { allowed: false, reason: "external-disclosure-not-configured" };
  }
  return { allowed: true };
}
