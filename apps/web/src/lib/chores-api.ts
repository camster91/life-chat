export type ChoreWorkspaceApiResponse = Readonly<{
  householdName: string;
  canManage: boolean;
  members: readonly Readonly<{ id: string; displayName: string; role: "adult" | "child" }>[];
  assignments: readonly Readonly<{
    id: string;
    title: string;
    dueDate: string | null;
    state: "assigned" | "completed";
    assigneeName: string | null;
    deepLink: string;
  }>[];
}>;
