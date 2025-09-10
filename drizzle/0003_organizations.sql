CREATE TABLE IF NOT EXISTS "Organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "ownerEmail" varchar(64) NOT NULL REFERENCES "public"."User"("email"),
  "createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Membership" (
  "orgId" text NOT NULL REFERENCES "public"."Organization"("id"),
  "userEmail" varchar(64) NOT NULL REFERENCES "public"."User"("email"),
  "role" varchar(16) NOT NULL,
  "createdAt" timestamp NOT NULL,
  CONSTRAINT "Membership_pk" PRIMARY KEY ("orgId", "userEmail")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Membership_user_idx" ON "Membership" ("userEmail");
CREATE INDEX IF NOT EXISTS "Membership_org_idx" ON "Membership" ("orgId");


