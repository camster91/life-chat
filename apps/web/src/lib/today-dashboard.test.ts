import { describe, expect, it } from "vitest";
import { createTodayDashboard, type TodayDashboardItem } from "./today-dashboard";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const item = (id: string, label: string, date = "2026-08-18"): TodayDashboardItem => ({ id, householdId: "household_1", appId: "chores", label, date, deepLink: `/chores/${id}`, authorized: true });

describe("Today dashboard", () => {
  it("shows a calm, deterministic maximum of three authorized items for the selected local date", () => {
    const dashboard = createTodayDashboard({ context, date: "2026-08-18", timeZone: "America/Toronto", items: [item("3", "Wash dishes"), item("1", "Breakfast"), item("2", "Call dentist"), item("4", "Zebra task"), item("tomorrow", "Tomorrow", "2026-08-19")] });

    expect(dashboard.items.map((entry) => entry.label)).toEqual(["Breakfast", "Call dentist", "Wash dishes"]);
    expect(dashboard.overflowCount).toBe(1);
  });

  it("rejects a cross-household item or unsafe deep link before it becomes dashboard content", () => {
    expect(() => createTodayDashboard({ context, date: "2026-08-18", timeZone: "America/Toronto", items: [{ ...item("1", "Private"), householdId: "household_2" }] })).toThrow("household");
    expect(() => createTodayDashboard({ context, date: "2026-08-18", timeZone: "America/Toronto", items: [{ ...item("1", "Unsafe"), deepLink: "https://elsewhere.example" }] })).toThrow("application-relative");
  });

  it("keeps date-only semantics rather than accepting timestamps", () => {
    expect(() => createTodayDashboard({ context, date: "2026-08-18T00:00:00Z", timeZone: "America/Toronto", items: [] })).toThrow("YYYY-MM-DD");
  });

  it("requires an IANA household timezone", () => {
    expect(() => createTodayDashboard({ context, date: "2026-08-18", timeZone: "UTC-05:00", items: [] })).toThrow();
  });
});
