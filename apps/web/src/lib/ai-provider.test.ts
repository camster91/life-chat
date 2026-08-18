import { describe, expect, it } from "vitest";
import { createAiUsageRecord, findEligibleAiModel, type AiProviderDescriptor } from "./ai-provider";

const providers: AiProviderDescriptor[] = [
  {
    id: "provider-a",
    enabled: true,
    models: [{ id: "text-only", enabled: true, capabilities: ["text-generation"] }],
  },
  {
    id: "provider-b",
    enabled: true,
    models: [{ id: "tools", enabled: true, capabilities: ["text-generation", "structured-tools"] }],
  },
];

describe("AI provider boundary", () => {
  it("selects an enabled model only when it declares every required capability", () => {
    expect(findEligibleAiModel(providers, ["text-generation", "structured-tools"], true)).toEqual({
      status: "available",
      providerId: "provider-b",
      modelId: "tools",
    });
  });

  it("makes lack of AI configuration an explicit non-AI fallback", () => {
    expect(findEligibleAiModel(providers, ["text-generation"], false)).toEqual({
      status: "unavailable",
      reason: "ai-disabled",
    });
    expect(findEligibleAiModel([], ["text-generation"], true)).toEqual({
      status: "unavailable",
      reason: "no-eligible-provider",
    });
  });

  it("records only bounded usage metadata, not prompts or provider payloads", () => {
    expect(
      createAiUsageRecord({
        requestId: "request_1",
        providerId: "provider-a",
        modelId: "model_1",
        inputUnits: 10,
        outputUnits: 20,
        currency: "USD",
        costMinorUnits: 3,
        outcome: "succeeded",
      }),
    ).toMatchObject({ providerId: "provider-a", costMinorUnits: 3 });
    expect(() =>
      createAiUsageRecord({
        requestId: "request_1",
        providerId: "provider-a",
        modelId: "model_1",
        inputUnits: -1,
        outputUnits: 20,
        currency: "US",
        costMinorUnits: 3,
        outcome: "succeeded",
      }),
    ).toThrow("currency");
  });
});
