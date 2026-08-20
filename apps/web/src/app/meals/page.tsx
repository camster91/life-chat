import { AuthenticatedShell } from "../authenticated-shell";
import { MealsWorkspace } from "./meals-workspace";
export default function MealsPage() { return <AuthenticatedShell current="meals"><MealsWorkspace /></AuthenticatedShell>; }
