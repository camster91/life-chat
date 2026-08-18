import { describe, expect, it } from "vitest";
import { assertIanaTimeZone, localDateTimeToInstant, parseDateOnly } from "./date-time";

describe("date and timezone contract", () => {
  it("keeps date-only values free of timezones", () => {
    expect(parseDateOnly("2026-08-18").toString()).toBe("2026-08-18");
    expect(() => parseDateOnly("2026-08-18T00:00:00Z")).toThrow(RangeError);
  });

  it("resolves a valid local household time to its UTC instant", () => {
    expect(localDateTimeToInstant({ localDateTime: "2026-03-08T03:30", timeZone: "America/Toronto" })).toBe("2026-03-08T07:30:00Z");
  });

  it("rejects skipped and repeated DST wall-clock times until a caller resolves them", () => {
    expect(() => localDateTimeToInstant({ localDateTime: "2026-03-08T02:30", timeZone: "America/Toronto" })).toThrow(RangeError);
    expect(() => localDateTimeToInstant({ localDateTime: "2026-11-01T01:30", timeZone: "America/Toronto" })).toThrow(RangeError);
  });

  it("requires a valid IANA timezone", () => {
    expect(assertIanaTimeZone("America/Toronto")).toBe("America/Toronto");
    expect(() => assertIanaTimeZone("UTC-05:00")).toThrow(RangeError);
  });
});
