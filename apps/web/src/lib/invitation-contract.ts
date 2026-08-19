import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { BaselineRole } from "./permission-engine";

export type InvitationRecord = Readonly<{
  invitationId: string;
  householdId: string;
  issuerMemberId: string;
  tokenHash: string;
  intendedRole: BaselineRole;
  intendedDisplayName: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedSubjectId: string | null;
  acceptedMemberId: string | null;
}>;

export type NewInvitation = Readonly<{
  invitation: InvitationRecord;
  token: string;
}>;

export type AcceptedInvitation = Readonly<{
  invitationId: string;
  householdId: string;
  subjectId: string;
  member: Readonly<{
    memberId: string;
    displayName: string;
    role: BaselineRole;
    lifecycle: "active";
  }>;
}>;

export class InvitationStateError extends Error {}

function assertOpaqueId(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) {
    throw new InvitationStateError(`${name} must be a bounded opaque identifier.`);
  }
}

export function invitationTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function sameTokenHash(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function assertDisplayName(value: string): void {
  if (value.trim().length === 0 || value.length > 120 || /[\r\n\u0000]/.test(value)) {
    throw new InvitationStateError("Invitation display name must be bounded and control-character free.");
  }
}

export function createInvitation(input: {
  householdId: string;
  issuerMemberId: string;
  intendedRole: BaselineRole;
  intendedDisplayName: string;
  expiresAt: Date;
  now: Date;
}): NewInvitation {
  assertOpaqueId(input.householdId, "householdId");
  assertOpaqueId(input.issuerMemberId, "issuerMemberId");
  assertDisplayName(input.intendedDisplayName);
  if (input.expiresAt <= input.now) throw new InvitationStateError("Invitation expiry must be in the future.");

  const token = randomBytes(32).toString("base64url");
  return Object.freeze({
    token,
    invitation: Object.freeze({
      invitationId: randomUUID(),
      householdId: input.householdId,
      issuerMemberId: input.issuerMemberId,
      tokenHash: invitationTokenHash(token),
      intendedRole: input.intendedRole,
      intendedDisplayName: input.intendedDisplayName.trim(),
      expiresAt: new Date(input.expiresAt),
      acceptedAt: null,
      acceptedSubjectId: null,
      acceptedMemberId: null,
    }),
  });
}

export function acceptInvitation(input: {
  invitation: InvitationRecord;
  token: string;
  subjectId: string;
  now: Date;
}): AcceptedInvitation {
  assertOpaqueId(input.subjectId, "subjectId");
  if (input.invitation.acceptedAt !== null || input.invitation.acceptedMemberId !== null) {
    throw new InvitationStateError("Invitation has already been accepted.");
  }
  if (input.invitation.expiresAt <= input.now) throw new InvitationStateError("Invitation has expired.");
  if (!sameTokenHash(invitationTokenHash(input.token), input.invitation.tokenHash)) {
    throw new InvitationStateError("Invitation is invalid.");
  }

  return Object.freeze({
    invitationId: input.invitation.invitationId,
    householdId: input.invitation.householdId,
    subjectId: input.subjectId,
    member: Object.freeze({
      memberId: randomUUID(),
      displayName: input.invitation.intendedDisplayName,
      role: input.invitation.intendedRole,
      lifecycle: "active",
    }),
  });
}
