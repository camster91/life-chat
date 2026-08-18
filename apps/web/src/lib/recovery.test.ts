import { describe, expect, it } from "vitest";
import { createExportManifest, offlineIntentDisposition, verifyExportManifest } from "./recovery";

describe("offline, recovery, and export rules", () => {
  it("keeps consequential intents online and marks conflicting shared edits for review", () => {
    expect(offlineIntentDisposition("completion")).toBe("queue-for-server-review");
    expect(offlineIntentDisposition("field-update")).toBe("conflict-required");
    expect(offlineIntentDisposition("ai-confirmation")).toBe("online-only");
    expect(offlineIntentDisposition("membership-change")).toBe("online-only");
  });

  it("creates and verifies a portable, checksummed export manifest", () => {
    const files = [{ path: "records/lists.json", content: new TextEncoder().encode('{"id":"list-a"}') }];
    const manifest = createExportManifest({ householdId: "household-a", generatedAt: "2026-08-18T12:00:00.000Z", files });
    expect(manifest.files[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyExportManifest(manifest, files)).toBe(true);
    expect(verifyExportManifest(manifest, [{ path: "records/lists.json", content: new TextEncoder().encode("altered") }])).toBe(false);
  });

  it("rejects unsafe export paths and duplicate package entries", () => {
    expect(() => createExportManifest({ householdId: "household-a", generatedAt: "2026-08-18T12:00:00.000Z", files: [{ path: "../secret", content: new Uint8Array() }] })).toThrow(RangeError);
    expect(() => createExportManifest({ householdId: "household-a", generatedAt: "2026-08-18T12:00:00.000Z", files: [
      { path: "records/a.json", content: new Uint8Array() }, { path: "records/a.json", content: new Uint8Array() },
    ] })).toThrow(RangeError);
  });
});
