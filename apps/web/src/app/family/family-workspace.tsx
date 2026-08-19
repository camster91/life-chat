"use client";

import { useEffect, useState } from "react";
import type { FamilyApiMember, FamilyApiResponse } from "@/lib/family-api";
import { useActiveShellContext } from "../authenticated-shell";

type Proposal = { actorMemberId: string; member: FamilyApiMember; lifecycle: "suspended" | "removed"; commandId: string };

async function loadFamily(signal?: AbortSignal): Promise<FamilyApiResponse> {
  const response = await fetch("/api/family", { cache: "no-store", signal });
  const body = await response.json() as FamilyApiResponse | { error: string };
  if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Family could not be loaded.");
  return body;
}

export function FamilyWorkspace() {
  const context = useActiveShellContext();
  const [result, setResult] = useState<{ memberId: string; family: FamilyApiResponse | null; error: string | null } | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadFamily(controller.signal).then((family) => setResult({ memberId: context.memberId, family, error: null })).catch((caught: unknown) => {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setResult({ memberId: context.memberId, family: null, error: caught instanceof Error ? caught.message : "Family could not be loaded." });
    });
    return () => controller.abort();
  }, [context.memberId]);

  const currentResult = result?.memberId === context.memberId ? result : null;
  const family = currentResult?.family ?? null;
  const error = currentResult?.error ?? null;
  const currentProposal = proposal?.actorMemberId === context.memberId ? proposal : null;

  const confirm = async () => {
    if (currentProposal === null) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/family/members/${encodeURIComponent(currentProposal.member.memberId)}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle: currentProposal.lifecycle, commandId: currentProposal.commandId, confirmed: true }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The member change could not be completed.");
      setResult({ memberId: context.memberId, family: await loadFamily(), error: null });
      setProposal(null);
    } catch (caught) {
      setResult({ memberId: context.memberId, family, error: caught instanceof Error ? caught.message : "The member change could not be completed." });
    } finally {
      setSaving(false);
    }
  };

  return <section aria-labelledby="family-title">
    <p className="eyebrow">Family</p>
    <h1 id="family-title">People and access, made clear</h1>
    <p>Membership and roles are scoped to this household. Important access changes always stop for review.</p>
    {error !== null ? <p className="form-error" role="alert">{error}</p> : null}
    {family === null ? error === null ? <p role="status">Loading family access…</p> : null : !family.canReadMembers ? <section className="shell-card empty-state"><h2>Directory access is limited</h2><p>Your role does not include the household member directory.</p></section> : <section className="feature-workspace" aria-labelledby="member-directory-heading">
      <div className="section-heading"><div><h2 id="member-directory-heading">{family.householdName}</h2><p>{family.members.length} {family.members.length === 1 ? "member" : "members"}</p></div></div>
      <ul className="family-members">{family.members.map((member) => <li key={member.memberId}>
        <div className="family-member-summary"><div><h3>{member.displayName}{member.isCurrent ? " (you)" : ""}</h3><p>{member.role} · {member.lifecycle}{member.hasAccount ? " · account linked" : " · no linked account"}</p></div></div>
        {family.canManageMembers && member.lifecycle === "active" && !member.isCurrent ? <div className="app-actions">
          <button className="secondary-button compact-button" type="button" onClick={() => setProposal({ actorMemberId: context.memberId, member, lifecycle: "suspended", commandId: crypto.randomUUID() })}>Review suspend</button>
          <button className="secondary-button compact-button" type="button" onClick={() => setProposal({ actorMemberId: context.memberId, member, lifecycle: "removed", commandId: crypto.randomUUID() })}>Review remove</button>
        </div> : null}
        {currentProposal?.member.memberId === member.memberId ? <div className="confirmation-panel" role="group" aria-label={`Confirm ${currentProposal.lifecycle} ${member.displayName}`}>
          <p><strong>{currentProposal.lifecycle === "removed" ? "Remove" : "Suspend"} {member.displayName}?</strong> This changes their household access. Last-adult safety is checked again when confirmed.</p>
          <div><button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => setProposal(null)}>Cancel</button><button className="primary-button compact-button" type="button" disabled={saving} aria-busy={saving} onClick={() => void confirm()}>Confirm</button></div>
        </div> : null}
      </li>)}</ul>
      {family.canManageMembers ? <p className="calm-note">Invitations, role changes, capability grants, and household preferences remain planned work.</p> : null}
    </section>}
  </section>;
}
