CREATE TYPE "SharedListPurpose" AS ENUM ('general', 'grocery');
ALTER TABLE "shared_lists" ADD COLUMN "purpose" "SharedListPurpose" NOT NULL DEFAULT 'general';
