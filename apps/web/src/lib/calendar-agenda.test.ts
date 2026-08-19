import { describe, expect, it } from "vitest";
import { createCalendarAgenda, type CalendarAgendaItem } from "./calendar-agenda";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const allDay: CalendarAgendaItem = { id: "all-day_1", householdId: "household_1", title: "School closed", deepLink: "/calendar?date=2026-08-18#calendar-item-all-day_1", kind: "all-day", startDate: "2026-08-18", endDateExclusive: "2026-08-19", localStart: null, localEnd: null, eventTimeZone: null, startInstant: null, endInstant: null, authorized: true };
const timed: CalendarAgendaItem = { id: "timed_1", householdId: "household_1", title: "Dinner", deepLink: "/calendar?date=2026-08-18#calendar-item-timed_1", kind: "timed", startDate: null, endDateExclusive: null, localStart: "2026-08-18T17:30", localEnd: "2026-08-18T18:30", eventTimeZone: "America/Toronto", startInstant: "2026-08-18T21:30:00Z", endInstant: "2026-08-18T22:30:00Z", authorized: true };

describe("calendar agenda", () => {
  it("keeps all-day records date-only and renders timed records in household local date", () => {
    expect(createCalendarAgenda({ context, householdTimeZone: "America/Toronto", date: "2026-08-18", items: [timed, allDay] }).map((item) => item.id)).toEqual(["all-day_1", "timed_1"]);
  });

  it("uses the household-view timezone without changing event source semantics", () => {
    const overseas: CalendarAgendaItem = { ...timed, id: "timed_2", localStart: "2026-08-19T00:30", localEnd: "2026-08-19T01:30", eventTimeZone: "Europe/London", startInstant: "2026-08-18T23:30:00Z", endInstant: "2026-08-19T00:30:00Z" };
    expect(createCalendarAgenda({ context, householdTimeZone: "America/Toronto", date: "2026-08-18", items: [overseas] }).map((item) => item.id)).toEqual(["timed_2"]);
  });

  it("rejects household leakage, unsafe links, and inconsistent DST-aware timed records", () => {
    expect(() => createCalendarAgenda({ context, householdTimeZone: "America/Toronto", date: "2026-08-18", items: [{ ...allDay, householdId: "household_2" }] })).toThrow("household");
    expect(() => createCalendarAgenda({ context, householdTimeZone: "America/Toronto", date: "2026-08-18", items: [{ ...allDay, deepLink: "https://outside.example" }] })).toThrow("application-relative");
    expect(() => createCalendarAgenda({ context, householdTimeZone: "America/Toronto", date: "2026-08-18", items: [{ ...timed, startInstant: "2026-08-18T22:30:00Z" }] })).toThrow("must match");
  });

  it("includes events that overlap the day and multi-day all-day ranges", () => {
    const overnight = { ...timed, id: "timed_overnight", localStart: "2026-08-17T23:30", localEnd: "2026-08-18T00:30", startInstant: "2026-08-18T03:30:00Z", endInstant: "2026-08-18T04:30:00Z" };
    const breakRange = { ...allDay, id: "all-day_range", startDate: "2026-08-17", endDateExclusive: "2026-08-20" };
    expect(createCalendarAgenda({ context, householdTimeZone: "America/Toronto", date: "2026-08-18", items: [overnight, breakRange] }).map((item) => item.id)).toEqual(["all-day_range", "timed_overnight"]);
  });
});
