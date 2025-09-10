ALTER TABLE "FileAssociation"
  ALTER COLUMN "fileName" DROP NOT NULL;
ALTER TABLE "FileAssociation"
  ADD COLUMN IF NOT EXISTS "workingUrl" text;


