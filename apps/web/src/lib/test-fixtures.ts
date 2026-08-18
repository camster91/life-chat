export type FixtureMember = Readonly<{
  memberId: string;
  householdId: string;
  role: "adult" | "child" | "guest";
  lifecycle: "active" | "suspended";
  expiresAt: string | null;
}>;

export type HouseholdFixture = Readonly<{
  householdId: string;
  timezone: string;
  members: readonly FixtureMember[];
  enabledApps: readonly string[];
}>;

export type LifeChatFixture = Readonly<{
  now: string;
  households: readonly HouseholdFixture[];
}>;

const fixture: LifeChatFixture = Object.freeze({
  now: "2026-08-18T12:00:00.000Z",
  households: Object.freeze([
    Object.freeze({
      householdId: "fixture-household-a",
      timezone: "Etc/UTC",
      enabledApps: Object.freeze(["shared-lists", "chores"]),
      members: Object.freeze([
        Object.freeze({ memberId: "fixture-adult-a", householdId: "fixture-household-a", role: "adult", lifecycle: "active", expiresAt: null }),
        Object.freeze({ memberId: "fixture-child-a", householdId: "fixture-household-a", role: "child", lifecycle: "active", expiresAt: null }),
        Object.freeze({ memberId: "fixture-guest-a", householdId: "fixture-household-a", role: "guest", lifecycle: "active", expiresAt: "2026-08-20T12:00:00.000Z" }),
        Object.freeze({ memberId: "fixture-suspended-a", householdId: "fixture-household-a", role: "child", lifecycle: "suspended", expiresAt: null }),
      ]),
    }),
    Object.freeze({
      householdId: "fixture-household-b",
      timezone: "Etc/UTC",
      enabledApps: Object.freeze([]),
      members: Object.freeze([
        Object.freeze({ memberId: "fixture-adult-b", householdId: "fixture-household-b", role: "adult", lifecycle: "active", expiresAt: null }),
      ]),
    }),
  ]),
});

export function createLifeChatFixture(): LifeChatFixture {
  return fixture;
}
