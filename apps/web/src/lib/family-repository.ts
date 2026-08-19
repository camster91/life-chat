import type { PrismaClient } from "../../generated/prisma/client";
import { createFamilyManagementState, type FamilyMemberSummary } from "./family-management";
import type { ActiveHouseholdContext } from "./identity-context";
import type { CapabilityGrant } from "./permission-engine";

export class FamilyAccessError extends Error {}

export async function loadFamilyDirectory(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
  now: Date;
}) {
  return database.$transaction(async (transaction) => {
    const actor = await transaction.member.findFirst({
      where: {
        id: input.actor.context.memberId,
        householdId: input.actor.context.householdId,
        authenticatedSubjectId: input.actor.context.authenticatedSubjectId,
        lifecycle: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
      },
      include: { household: { select: { name: true } } },
    });
    if (actor === null) throw new FamilyAccessError("The active member is no longer eligible to view Family.");
    const emptyState = createFamilyManagementState({ context: input.actor.context, role: actor.role, grants: input.actor.grants, now: input.now, members: [] });
    if (!emptyState.canReadMembers) return { householdName: actor.household.name, state: emptyState };
    const records = await transaction.member.findMany({ where: { householdId: actor.householdId }, orderBy: [{ lifecycle: "asc" }, { displayName: "asc" }, { id: "asc" }] });
    const summaries: FamilyMemberSummary[] = records.map((member) => ({
      memberId: member.id,
      householdId: member.householdId,
      displayName: member.displayName,
      role: member.role,
      lifecycle: member.lifecycle,
      expiresAt: member.expiresAt?.toISOString() ?? null,
      hasAccount: member.authenticatedSubjectId !== null,
      authorized: true,
    }));
    return { householdName: actor.household.name, state: createFamilyManagementState({ context: input.actor.context, role: actor.role, grants: input.actor.grants, now: input.now, members: summaries }) };
  }, { isolationLevel: "Serializable" });
}
