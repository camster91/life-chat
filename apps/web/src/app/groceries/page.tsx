import { AuthenticatedShell } from "../authenticated-shell"; import { GroceriesWorkspace } from "./groceries-workspace";
export default function GroceriesPage() { return <AuthenticatedShell current="groceries"><GroceriesWorkspace /></AuthenticatedShell>; }
