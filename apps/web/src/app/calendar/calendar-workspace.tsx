"use client";

import { Temporal } from "@js-temporal/polyfill";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CalendarApiItem, CalendarApiResponse } from "@/lib/calendar-api";
import { useActiveShellContext } from "../authenticated-shell";

function adjacentDate(date: string, days: number): string {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

function itemTime(item: CalendarApiItem, locale: string): string {
  if (item.kind === "all-day") return "All day";
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: item.eventTimeZone! });
  return `${formatter.format(new Date(item.startInstant!))}–${formatter.format(new Date(item.endInstant!))} · ${item.eventTimeZone}`;
}

export function CalendarWorkspace() {
  const context = useActiveShellContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDate = searchParams.get("date");
  const requestKey = requestedDate ?? "";
  const [result, setResult] = useState<{ key: string; agenda: CalendarApiResponse | null; error: string | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = requestedDate === null ? "" : `?date=${encodeURIComponent(requestedDate)}`;
    fetch(`/api/calendar${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as CalendarApiResponse | { error: string };
        if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Calendar could not be loaded.");
        setResult({ key: requestKey, agenda: body, error: null });
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setResult({ key: requestKey, agenda: null, error: caught instanceof Error ? caught.message : "Calendar could not be loaded." });
      });
    return () => controller.abort();
  }, [context.memberId, requestKey, requestedDate]);

  const currentResult = result?.key === requestKey ? result : null;
  const agenda = currentResult?.agenda ?? null;
  const error = currentResult?.error ?? null;

  return <section aria-labelledby="calendar-title">
    <p className="eyebrow">Calendar</p>
    <h1 id="calendar-title">A calm view of the day</h1>
    <p>Household and personal events you can access appear together, interpreted in the household timezone.</p>
    {agenda === null ? error === null ? <p role="status">Loading calendar…</p> : <div><p className="form-error" role="alert">{error}</p><Link className="secondary-button inline-button" href="/calendar">Open today</Link></div> : <>
      <div className="calendar-controls" aria-label="Choose agenda date">
        <Link className="secondary-button compact-button" href={`/calendar?date=${adjacentDate(agenda.date, -1)}`} aria-label="Previous day">Previous</Link>
        <label className="field-group"><span>Date</span><input type="date" value={agenda.date} onChange={(event) => { if (event.target.value !== "") router.push(`/calendar?date=${event.target.value}`); }} /></label>
        <Link className="secondary-button compact-button" href={`/calendar?date=${adjacentDate(agenda.date, 1)}`} aria-label="Next day">Next</Link>
      </div>
      <section className="shell-card calendar-agenda" aria-labelledby="agenda-heading">
        <div className="section-heading"><div><h2 id="agenda-heading">{new Intl.DateTimeFormat(agenda.locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${agenda.date}T12:00:00Z`))}</h2><p>{agenda.timeZone}</p></div><span>{agenda.items.length} {agenda.items.length === 1 ? "item" : "items"}</span></div>
        {agenda.items.length === 0 ? <p className="calm-note">Nothing is scheduled for this day.</p> : <ol className="calendar-items">{agenda.items.map((item) => <li id={`calendar-item-${item.id}`} key={item.id}>
          <div><span className="calendar-time">{itemTime(item, agenda.locale)}</span><h3>{item.title}</h3></div>
          <Link href={item.deepLink} aria-label={`Open ${item.title}`}>Open</Link>
        </li>)}</ol>}
      </section>
    </>}
  </section>;
}
