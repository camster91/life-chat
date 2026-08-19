export type SharedListApiSummary = Readonly<{
  id: string;
  title: string;
  version: number;
  openItemCount: number;
  updatedAt: string;
}>;

export type SharedListsApiResponse = Readonly<{
  householdName: string;
  canManage: boolean;
  lists: readonly SharedListApiSummary[];
}>;

export type SharedListItemApiSummary = Readonly<{
  id: string;
  label: string;
  position: number;
  state: "open" | "completed";
  assignedToActiveMember: boolean;
}>;

export type SharedListApiResponse = Readonly<{
  id: string;
  title: string;
  version: number;
  canManage: boolean;
  items: readonly SharedListItemApiSummary[];
}>;
