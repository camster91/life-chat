export type OperationalSeverity = "debug" | "info" | "warn" | "error";
export type SafeOperationalMetadata = Readonly<Record<string, string | number | boolean | null>>;

export type OperationalEvent = Readonly<{
  occurredAt: string;
  severity: OperationalSeverity;
  code: string;
  component: string;
  outcome: "succeeded" | "failed" | "degraded";
  correlationId: string | null;
  metadata: SafeOperationalMetadata;
}>;

const forbiddenKey = /(password|secret|token|authorization|cookie|session|prompt|message|body|attachment|content|email|phone|card|credential|api.?key|connection|string)/i;
const controls = /[\r\n\u0000]/;

function assertSafeMetadata(metadata: SafeOperationalMetadata): void {
  for (const [key, value] of Object.entries(metadata)) {
    if (forbiddenKey.test(key)) throw new Error(`Unsafe operational metadata key: ${key}`);
    if (typeof value === "string" && (value.length > 256 || controls.test(value))) {
      throw new Error(`Unsafe operational metadata value: ${key}`);
    }
  }
}

export function createOperationalEvent(input: OperationalEvent): OperationalEvent {
  if (input.code.trim().length === 0 || input.component.trim().length === 0) {
    throw new Error("Operational code and component are required");
  }
  if (Number.isNaN(Date.parse(input.occurredAt))) throw new Error("Operational event time must be an exact instant");
  assertSafeMetadata(input.metadata);
  return Object.freeze({ ...input, metadata: Object.freeze({ ...input.metadata }) });
}
