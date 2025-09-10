CREATE TABLE IF NOT EXISTS "FileAssociation" (
  "userEmail" varchar(64) NOT NULL,
  "labelSlug" text NOT NULL,
  "fileName" text NOT NULL,
  CONSTRAINT "FileAssociation_pk" PRIMARY KEY ("userEmail", "labelSlug"),
  CONSTRAINT "FileAssociation_user_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."User"("email") ON DELETE NO ACTION ON UPDATE NO ACTION
);


