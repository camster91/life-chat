export const aiCapabilities = ["text-generation", "structured-tools"] as const;
export type AiCapability = (typeof aiCapabilities)[number];

export type AiModelDescriptor = {
  id: string;
  capabilities: readonly AiCapability[];
  enabled: boolean;
};

export type AiProviderDescriptor = {
  id: string;
  models: readonly AiModelDescriptor[];
  enabled: boolean;
};

export type AiProviderAvailability =
  | { status: "available"; providerId: string; modelId: string }
  | { status: "unavailable"; reason: "ai-disabled" | "no-eligible-provider" };

export type AiUsageRecord = Readonly<{
  requestId: string;
  providerId: string;
  modelId: string;
  inputUnits: number;
  outputUnits: number;
  currency: string;
  costMinorUnits: number;
  outcome: "succeeded" | "failed" | "denied";
}>;

export type AiCredentialReference = Readonly<{
  providerId: string;
  secretReference: string;
}>;

function assertIdentifier(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) {
    throw new Error(`${name} must be a bounded identifier`);
  }
}

export function findEligibleAiModel(
  providers: readonly AiProviderDescriptor[],
  required: readonly AiCapability[],
  aiEnabled: boolean,
): AiProviderAvailability {
  if (!aiEnabled) return { status: "unavailable", reason: "ai-disabled" };

  for (const provider of providers) {
    if (!provider.enabled) continue;
    for (const model of provider.models) {
      if (model.enabled && required.every((capability) => model.capabilities.includes(capability))) {
        return { status: "available", providerId: provider.id, modelId: model.id };
      }
    }
  }
  return { status: "unavailable", reason: "no-eligible-provider" };
}

export function createAiUsageRecord(input: AiUsageRecord): AiUsageRecord {
  assertIdentifier(input.requestId, "requestId");
  assertIdentifier(input.providerId, "providerId");
  assertIdentifier(input.modelId, "modelId");
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error("currency must be ISO 4217 alphabetic code");
  for (const [name, value] of Object.entries({
    inputUnits: input.inputUnits,
    outputUnits: input.outputUnits,
    costMinorUnits: input.costMinorUnits,
  })) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  }
  return Object.freeze({ ...input });
}
