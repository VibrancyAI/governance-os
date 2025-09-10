CREATE TABLE IF NOT EXISTS "Invite" (
  "token" text PRIMARY KEY NOT NULL,
  "orgId" text NOT NULL REFERENCES "public"."Organization"("id"),
  "email" varchar(64) NOT NULL,
  "role" varchar(16) NOT NULL,
  "inviterEmail" varchar(64) NOT NULL REFERENCES "public"."User"("email"),
  "createdAt" timestamp NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "acceptedAt" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Invite_email_idx" ON "Invite" ("email");
CREATE INDEX IF NOT EXISTS "Invite_org_idx" ON "Invite" ("orgId");


