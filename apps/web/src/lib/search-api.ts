import type { SearchResultGroup } from "./global-search";

export type SearchApiResponse = Readonly<{
  query: string;
  groups: readonly SearchResultGroup[];
}>;
