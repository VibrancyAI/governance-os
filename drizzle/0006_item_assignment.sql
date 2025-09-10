CREATE TABLE IF NOT EXISTS "ItemAssignment" (
  "orgId" text NOT NULL REFERENCES "public"."Organization"("id"),
  "labelSlug" text NOT NULL,
  "assigneeEmail" varchar(64) REFERENCES "public"."User"("email"),
  "assignedByEmail" varchar(64) NOT NULL REFERENCES "public"."User"("email"),
  "assignedAt" timestamp NOT NULL,
  CONSTRAINT "ItemAssignment_pk" PRIMARY KEY ("orgId", "labelSlug")
);


