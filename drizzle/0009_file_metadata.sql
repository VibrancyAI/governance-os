-- File metadata and extracted entities tables; extends Chunk with metadata columns

ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "section" text;
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "sourceUrl" text;
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "asOfDate" timestamp;

CREATE TABLE IF NOT EXISTS "FileMetadata" (
  "orgId" text NOT NULL REFERENCES "Organization"("id"),
  "filePath" text NOT NULL,
  "filename" text NOT NULL,
  "slug" text,
  "section" text,
  "currency" text,
  "asOfDate" timestamp,
  "extractedEntities" json
);

CREATE TABLE IF NOT EXISTS "ExtractedEntity" (
  "orgId" text NOT NULL REFERENCES "Organization"("id"),
  "filePath" text NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "confidence" real,
  "unit" text,
  "asOfDate" timestamp
);
