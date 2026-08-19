import type { PrismaClient } from "../../generated/prisma/client";
import { acceptHouseholdInvitation } from "./identity-repository";
import { invitationTokenHash } from "./invitation-contract";

export class InvitationAccountEntryError extends Error {
  constructor(message: string, readonly reason: "invalid-invitation" | "account-unavailable" | "acceptance-failed") {
    super(message);
  }
}

export type InvitationAccountProvisioner = {
  create(input: { email: string; password: string; name: string }): Promise<{
    subjectId: string;
    setCookies: readonly string[];
    rollback(): Promise<void>;
  }>;
};

function boundedToken(token: string): string {
  if (token.trim().length < 20 || token.length > 200 || /\s/.test(token)) {
    throw new InvitationAccountEntryError("The invitation is not available.", "invalid-invitation");
  }
  return token;
}

export async function inspectAvailableInvitation(database: PrismaClient, input: { token: string; now: Date }) {
  const token = boundedToken(input.token);
  const invitation = await database.invitation.findUnique({
    where: { tokenHash: invitationTokenHash(token) },
    include: { household: { select: { name: true } } },
  });
  if (invitation === null || invitation.acceptedAt !== null || invitation.acceptedMemberId !== null || invitation.expiresAt <= input.now) {
    throw new InvitationAccountEntryError("The invitation is not available.", "invalid-invitation");
  }
  return {
    token,
    invitationId: invitation.id,
    householdName: invitation.household.name,
    displayName: invitation.intendedDisplayName,
    role: invitation.intendedRole,
    expiresAt: invitation.expiresAt,
  } as const;
}

export async function acceptInvitationForNewAccount(database: PrismaClient, input: {
  token: string;
  email: string;
  password: string;
  now: Date;
  provisioner: InvitationAccountProvisioner;
}) {
  const invitation = await inspectAvailableInvitation(database, { token: input.token, now: input.now });
  let provisioned: Awaited<ReturnType<InvitationAccountProvisioner["create"]>>;
  try {
    provisioned = await input.provisioner.create({ email: input.email, password: input.password, name: invitation.displayName });
  } catch {
    throw new InvitationAccountEntryError("The account could not be created or linked.", "account-unavailable");
  }

  try {
    const accepted = await acceptHouseholdInvitation(database, { token: invitation.token, subjectId: provisioned.subjectId, now: input.now });
    return { accepted, setCookies: provisioned.setCookies } as const;
  } catch {
    try {
      await provisioned.rollback();
    } catch {
      throw new InvitationAccountEntryError("Account provisioning needs operator recovery.", "acceptance-failed");
    }
    throw new InvitationAccountEntryError("The invitation could not be accepted.", "acceptance-failed");
  }
}
