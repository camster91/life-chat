import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma's PostgreSQL adapter parses timestamp-with-time-zone results from the
 * session's rendered wall time. Force UTC so exact instants round-trip without
 * inheriting the database host's local timezone.
 */
export function createPostgresAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString, options: "-c timezone=UTC" });
}
