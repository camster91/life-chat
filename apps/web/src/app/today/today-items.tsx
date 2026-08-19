"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TodayApiResponse } from "../../lib/today-api";

export function TodayItems({ memberId }: { memberId: string }) {
  const [dashboard, setDashboard] = useState<TodayApiResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/today", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Today unavailable");
        setDashboard(await response.json() as TodayApiResponse);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => controller.abort();
  }, [memberId]);

  if (failed) return <section className="today-summary" aria-labelledby="today-items-title"><h3 id="today-items-title">Today</h3><p role="alert">Today could not be loaded. No household action was taken.</p></section>;
  if (dashboard === null) return <section className="today-summary" aria-labelledby="today-items-title"><h3 id="today-items-title">Today</h3><p role="status">Loading your authorized items…</p></section>;
  return <section className="today-summary" aria-labelledby="today-items-title">
    <div><h3 id="today-items-title">Today</h3><p className="context-date">{dashboard.date} · {dashboard.timeZone}</p></div>
    {dashboard.items.length === 0
      ? <p>Nothing assigned for today.</p>
      : <ul className="today-list">{dashboard.items.map((item) => <li key={item.id}><span>{item.label}</span><Link href={item.deepLink}>Open</Link></li>)}</ul>}
    {dashboard.overflowCount > 0 ? <p>{dashboard.overflowCount} more item{dashboard.overflowCount === 1 ? "" : "s"} available in the source app.</p> : null}
  </section>;
}
