import { Suspense } from "react";
import { AuthenticatedShell } from "../authenticated-shell";
import { CalendarWorkspace } from "./calendar-workspace";

export default function CalendarPage() {
  return <AuthenticatedShell current="calendar"><Suspense fallback={<p role="status">Loading calendar…</p>}><CalendarWorkspace /></Suspense></AuthenticatedShell>;
}
