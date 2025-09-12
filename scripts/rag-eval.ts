import { hybridRetrieve } from "@/ai/retrieval";

// Minimal RAG eval scaffold. In practice, drive with a JSON dataset.
async function main() {
  const orgId = process.env.EVAL_ORG_ID as string;
  const query = process.argv[2] || "What is our ARR?";
  if (!orgId) {
    console.error("Missing EVAL_ORG_ID env");
    process.exit(1);
  }
  const results = await hybridRetrieve({ filters: { orgId, filePathnames: [], query }, topK: 10 });
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
