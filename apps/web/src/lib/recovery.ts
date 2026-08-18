import { createHash } from "node:crypto";

export type OfflineIntentKind = "completion" | "append" | "field-update" | "reorder" | "delete" | "membership-change" | "money-change" | "ai-confirmation" | "external-delivery";

export function offlineIntentDisposition(kind: OfflineIntentKind): "queue-for-server-review" | "conflict-required" | "online-only" {
  if (kind === "completion" || kind === "append") return "queue-for-server-review";
  if (kind === "field-update" || kind === "reorder") return "conflict-required";
  return "online-only";
}

export type ExportFile = { path: string; content: Uint8Array };
export type ExportManifest = {
  formatVersion: 1;
  householdId: string;
  generatedAt: string;
  files: readonly { path: string; byteLength: number; sha256: string }[];
};

function assertExportPath(path: string): void {
  if (!/^(records|attachments|audit)\/[A-Za-z0-9._/-]+$/.test(path) || path.includes("..") || path.includes("//") || path.includes("\\")) {
    throw new RangeError("Export paths must be relative, portable record, attachment, or audit paths.");
  }
}

function checksum(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createExportManifest(input: { householdId: string; generatedAt: string; files: readonly ExportFile[] }): ExportManifest {
  if (input.householdId.trim().length === 0) throw new RangeError("householdId is required.");
  const seen = new Set<string>();
  const files = input.files.map((file) => {
    assertExportPath(file.path);
    if (seen.has(file.path)) throw new RangeError("Export file paths must be unique.");
    seen.add(file.path);
    return { path: file.path, byteLength: file.content.byteLength, sha256: checksum(file.content) };
  });
  return Object.freeze({ formatVersion: 1, householdId: input.householdId, generatedAt: input.generatedAt, files: Object.freeze(files) });
}

export function verifyExportManifest(manifest: ExportManifest, files: readonly ExportFile[]): boolean {
  if (manifest.files.length !== files.length) return false;
  const byPath = new Map(files.map((file) => [file.path, file]));
  return manifest.files.every((entry) => {
    const file = byPath.get(entry.path);
    return file !== undefined && file.content.byteLength === entry.byteLength && checksum(file.content) === entry.sha256;
  });
}
