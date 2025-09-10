CREATE TABLE IF NOT EXISTS "OrgFileAssociation" (
  "orgId" text NOT NULL REFERENCES "public"."Organization"("id"),
  "labelSlug" text NOT NULL,
  "fileName" text,
  "workingUrl" text,
  CONSTRAINT "OrgFileAssociation_pk" PRIMARY KEY ("orgId", "labelSlug")
);


