ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" text;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
-- name already exists as NOT NULL, keep as-is for idempotency

CREATE TABLE IF NOT EXISTS "UserProfile" (
  "email" varchar(64) PRIMARY KEY NOT NULL REFERENCES "public"."User"("email"),
  "displayName" text,
  "avatarUrl" text
);


