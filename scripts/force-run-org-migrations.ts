import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL not set");
  const sql = postgres(url, { max: 1 });
  const dir = path.resolve(process.cwd(), "drizzle");
  const files = [
    "0003_organizations.sql",
    "0004_invites.sql",
    "0005_org_file_association.sql",
    "0006_item_assignment.sql",
    "0007_org_logo_user_profile.sql",
    "0008_item_assignment_many.sql",
    "0009_file_metadata.sql",
  ];
  for (const f of files) {
    const fp = path.join(dir, f);
    const exists = fs.existsSync(fp);
    if (!exists) {
      console.log(`skip: ${f} not found`);
      continue;
    }
    const sqlText = fs.readFileSync(fp, "utf8");
    console.log(`\n--- applying ${f} ---`);
    await sql.unsafe(sqlText);
    console.log(`applied ${f}`);
  }
  await sql.end({ timeout: 5 });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


