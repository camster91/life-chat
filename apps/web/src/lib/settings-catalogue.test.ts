import { describe, expect, it } from "vitest";
import { createSettingsCatalogue } from "./settings-catalogue";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const input = (role: "adult" | "child" | "guest") => ({ context, role, grants: [], now: new Date("2026-08-18T12:00:00Z") });

describe("settings catalogue", () => {
  it("shows an adult each explicitly authorized section", () => {
    expect(createSettingsCatalogue(input("adult")).map((section) => section.id)).toEqual(["profile", "notifications", "household", "privacy", "export", "ai"]);
  });
  it("keeps a child to self settings and a guest to no settings by default", () => {
    expect(createSettingsCatalogue(input("child")).map((section) => section.id)).toEqual(["profile", "notifications"]);
    expect(createSettingsCatalogue(input("guest"))).toEqual([]);
  });
});
