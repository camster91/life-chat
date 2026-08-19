-- A person can hold at most one membership in a household. PostgreSQL permits
-- multiple NULL values here, preserving pending members without an account.
CREATE UNIQUE INDEX "members_householdId_authenticatedSubjectId_key"
  ON "members"("householdId", "authenticatedSubjectId");
