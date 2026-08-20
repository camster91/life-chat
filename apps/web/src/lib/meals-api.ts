export type MealsApiResponse = Readonly<{ date: string; canManage: boolean; entries: readonly { id: string; mealSlot: "breakfast" | "lunch" | "dinner" | "other"; label: string }[] }>;
