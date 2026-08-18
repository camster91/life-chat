export type AnalyticsConsent = "unconfigured" | "granted" | "withdrawn";

export type ProductAnalyticsEvent = Readonly<{
  name: "feature.presented" | "navigation.completed" | "operation.outcome" | "feedback.opened";
  occurredAt: string;
  properties: Readonly<Record<string, string | number | boolean>>;
}>;

const forbiddenAnalyticsKey = /(household|member|user|name|email|phone|message|body|content|title|prompt|attachment|location|amount|currency|ip|device|token|secret|error)/i;
const controls = /[\r\n\u0000]/;

export function mayCollectProductAnalytics(consent: AnalyticsConsent, isAdult: boolean): boolean {
  return consent === "granted" && isAdult;
}

export function validateProductAnalyticsEvent(event: ProductAnalyticsEvent): ProductAnalyticsEvent {
  if (Number.isNaN(Date.parse(event.occurredAt))) throw new Error("Analytics event time must be an exact instant");
  for (const [key, value] of Object.entries(event.properties)) {
    if (forbiddenAnalyticsKey.test(key)) throw new Error(`Unsafe analytics property: ${key}`);
    if (typeof value === "string" && (value.length > 80 || controls.test(value))) {
      throw new Error(`Unsafe analytics property value: ${key}`);
    }
  }
  return Object.freeze({ ...event, properties: Object.freeze({ ...event.properties }) });
}
