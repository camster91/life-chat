import type { ActiveHouseholdContext } from "./identity-context";

export type ParityControlTotal = Readonly<{
  targetType: string;
  recordCount: number;
  opaqueChecksum: string;
}>;

export type MigrationParityInput = Readonly<{
  migrationId: string;
  targetHouseholdId: string;
  expected: readonly ParityControlTotal[];
  observed: readonly ParityControlTotal[];
}>;

export type MigrationParityDifference = Readonly<{
  targetType: string;
  expectedCount: number | null;
  observedCount: number | null;
  checksumMatches: boolean | null;
}>;

export type MigrationParityReport = Readonly<{
  migrationId: string;
  targetHouseholdId: string;
  verified: boolean;
  differences: readonly MigrationParityDifference[];
  retirementAuthorized: false;
}>;

function assertControlTotal(total: ParityControlTotal): void {
  if (total.targetType.trim().length === 0 || total.targetType.length > 200) throw new Error("Parity target type must be bounded");
  if (!Number.isSafeInteger(total.recordCount) || total.recordCount < 0) throw new Error("Parity record count must be a non-negative integer");
  if (total.opaqueChecksum.trim().length === 0 || total.opaqueChecksum.length > 200) throw new Error("Parity checksum must be bounded");
}

function indexTotals(totals: readonly ParityControlTotal[]): Map<string, ParityControlTotal> {
  const indexed = new Map<string, ParityControlTotal>();
  for (const total of totals) {
    assertControlTotal(total);
    if (indexed.has(total.targetType)) throw new Error("Parity totals must contain each target type once");
    indexed.set(total.targetType, total);
  }
  return indexed;
}

/** Compares only approved aggregate evidence; it reads and writes no migration data. */
export function reconcileMigrationParity(input: MigrationParityInput, context: ActiveHouseholdContext): MigrationParityReport {
  if (input.migrationId.trim().length === 0 || input.migrationId.length > 200) throw new Error("Migration ID must be bounded");
  if (input.targetHouseholdId !== context.householdId) throw new Error("Parity target household must match active context");
  const expected = indexTotals(input.expected);
  const observed = indexTotals(input.observed);
  const types = [...new Set([...expected.keys(), ...observed.keys()])].sort();
  const differences = types.flatMap((targetType): MigrationParityDifference[] => {
    const expectedTotal = expected.get(targetType);
    const observedTotal = observed.get(targetType);
    if (expectedTotal === undefined || observedTotal === undefined) {
      return [{ targetType, expectedCount: expectedTotal?.recordCount ?? null, observedCount: observedTotal?.recordCount ?? null, checksumMatches: null }];
    }
    if (expectedTotal.recordCount !== observedTotal.recordCount || expectedTotal.opaqueChecksum !== observedTotal.opaqueChecksum) {
      return [{ targetType, expectedCount: expectedTotal.recordCount, observedCount: observedTotal.recordCount, checksumMatches: expectedTotal.opaqueChecksum === observedTotal.opaqueChecksum }];
    }
    return [];
  });

  return { migrationId: input.migrationId, targetHouseholdId: context.householdId, verified: differences.length === 0, differences, retirementAuthorized: false };
}
