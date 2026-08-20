"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchApiResponse } from "@/lib/search-api";
import { useActiveShellContext } from "../authenticated-shell";

type ResultState = { key: string; data: SearchApiResponse | null; error: string | null };

async function loadSearch(query: string, signal?: AbortSignal): Promise<SearchApiResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: "no-store", signal });
  const body = await response.json() as SearchApiResponse | { error: string };
  if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Search could not be completed.");
  return body;
}

export function SearchWorkspace() {
  const context = useActiveShellContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedQuery = searchParams.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState({ origin: requestedQuery, value: requestedQuery });
  const [result, setResult] = useState<ResultState | null>(null);
  const query = draft.origin === requestedQuery ? draft.value : requestedQuery;
  useEffect(() => {
    if (requestedQuery.length < 2) return;
    const controller = new AbortController();
    loadSearch(requestedQuery, controller.signal).then((data) => setResult({ key: requestedQuery, data, error: null })).catch((caught: unknown) => {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setResult({ key: requestedQuery, data: null, error: caught instanceof Error ? caught.message : "Search could not be completed." });
    });
    return () => controller.abort();
  }, [context.memberId, requestedQuery]);

  const current = result?.key === requestedQuery ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = query.trim();
    if (next.length >= 2) router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  return <section aria-labelledby="search-title">
    <p className="eyebrow">Search</p>
    <h1 id="search-title">Find what is available to you</h1>
    <p>Results stay within {context.householdName} and your current access. Search never sends household content to an external provider.</p>
    <form className="quick-entry" onSubmit={submit} role="search">
      <div className="field-group"><label htmlFor="global-search-query">Search household records</label><input id="global-search-query" type="search" value={query} minLength={2} maxLength={120} onChange={(event) => setDraft({ origin: requestedQuery, value: event.target.value })} placeholder="Try ‘dinner’ or ‘laundry’" required /></div>
      <button className="primary-button" type="submit">Search</button>
    </form>
    {requestedQuery.length === 0 ? <div className="shell-card empty-state"><h2>Start with a word or phrase</h2><p>Search includes the calendar, lists you can access, and chores assigned to you.</p></div> : null}
    {requestedQuery.length === 1 ? <p className="calm-note" role="status">Enter at least two characters to search.</p> : null}
    {requestedQuery.length >= 2 && current === null ? <p role="status">Searching…</p> : null}
    {error !== null ? <p className="form-error" role="alert">{error}</p> : null}
    {data !== null ? data.groups.length === 0 ? <div className="shell-card empty-state"><h2>No matching records</h2><p>Try a different word. Results only include records available to you.</p></div> : <div className="search-groups">{data.groups.map((group) => <section className="shell-card" key={group.type} aria-labelledby={`search-group-${group.type}`}><h2 id={`search-group-${group.type}`}>{group.type}</h2><ul className="search-results">{group.results.map((item) => <li key={`${group.type}-${item.id}`}><Link href={item.deepLink}><strong>{item.title}</strong>{item.snippet === null ? null : <span>{item.snippet}</span>}</Link></li>)}</ul></section>)}</div> : null}
  </section>;
}
