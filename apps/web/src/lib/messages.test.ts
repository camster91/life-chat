import { describe, expect, it } from "vitest";
import { createMessageThreadList, proposeMessageSend, type MessageThreadSummary } from "./messages";
import { defaultMiniAppConfiguration } from "./mini-app-registry";
const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration.messages.enabled = true;
const thread: MessageThreadSummary = { id: "thread_1", householdId: "household_1", activeMemberIsParticipant: true, unreadCount: 2, deepLink: "/messages/thread_1", authorized: true };
const input = (role: "adult" | "child" | "guest") => ({ context, role, grants: [], now: new Date("2026-08-18T12:00:00Z"), configuration });
describe("Messages", () => {
  it("shows participant metadata and produces a body-free send review", () => { expect(createMessageThreadList({ ...input("child"), threads: [thread] })).toEqual([thread]); expect(proposeMessageSend({ ...input("child"), thread, body: "Meet after dinner" })).toEqual({ threadId: "thread_1", bodyLength: 17, requiresConfirmation: true }); });
  it("denies guests and disabled app participation", () => { expect(() => createMessageThreadList({ ...input("guest"), threads: [thread] })).toThrow("may not participate"); expect(() => createMessageThreadList({ ...input("adult"), configuration: defaultMiniAppConfiguration(), threads: [thread] })).toThrow("enabled and eligible"); });
  it("rejects nonparticipants, cross-household threads, and invalid body", () => { expect(() => createMessageThreadList({ ...input("adult"), threads: [{ ...thread, activeMemberIsParticipant: false }] })).toThrow("active participant"); expect(() => createMessageThreadList({ ...input("adult"), threads: [{ ...thread, householdId: "household_2" }] })).toThrow("active participant"); expect(() => proposeMessageSend({ ...input("adult"), thread, body: " " })).toThrow("between 1 and 4000"); });
});
