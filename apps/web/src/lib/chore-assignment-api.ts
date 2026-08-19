export type ChoreAssignmentApiResponse = Readonly<{
  id: string;
  title: string;
  dueDate: string | null;
  state: "assigned" | "completed";
  completedAt: string | null;
  canComplete: boolean;
}>;
