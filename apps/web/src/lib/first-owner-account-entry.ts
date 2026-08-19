import type { PrismaClient } from "../../generated/prisma/client";
import { bootstrapFirstOwner } from "./identity-repository";
import type { InvitationAccountProvisioner } from "./invitation-account-entry";

export class FirstOwnerAccountEntryError extends Error {}

export async function bootstrapFirstOwnerAccount(database: PrismaClient, input: {
  localOperatorConfirmed: boolean;
  email: string;
  password: string;
  householdName: string;
  displayName: string;
  now: Date;
  provisioner: InvitationAccountProvisioner;
}) {
  if (!input.localOperatorConfirmed) throw new FirstOwnerAccountEntryError("Explicit local operator confirmation is required.");
  if (await database.household.count() !== 0) throw new FirstOwnerAccountEntryError("First-owner setup is no longer available.");

  let provisioned: Awaited<ReturnType<InvitationAccountProvisioner["create"]>>;
  try {
    provisioned = await input.provisioner.create({ email: input.email, password: input.password, name: input.displayName });
  } catch {
    throw new FirstOwnerAccountEntryError("The first-owner account could not be provisioned.");
  }

  try {
    return await bootstrapFirstOwner(database, {
      localOperatorConfirmed: true,
      subjectId: provisioned.subjectId,
      householdName: input.householdName,
      displayName: input.displayName,
      now: input.now,
    });
  } catch {
    try {
      await provisioned.rollback();
    } catch {
      throw new FirstOwnerAccountEntryError("First-owner setup needs operator recovery.");
    }
    throw new FirstOwnerAccountEntryError("First-owner setup could not be completed.");
  }
}
