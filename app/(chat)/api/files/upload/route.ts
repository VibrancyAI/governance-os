import { auth } from "@/app/(auth)/auth";
import { insertChunks, deleteChunksByFilePath, getMembership, upsertFileMetadata, insertExtractedEntities } from "@/app/db";
import { extractTextFromUrl } from "@/utils/extract";
import { openai } from "@ai-sdk/openai";
import { put } from "@vercel/blob";
import { embedMany } from "ai";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";
import { smartSplitText } from "@/utils/chunk";
import { extractMetadata } from "@/utils/metadata";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  let session = await auth();

  if (!session) {
    return Response.redirect("/login");
  }

  const { user } = session;
  if (!user) {
    return Response.redirect("/login");
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  const orgId = await getCurrentOrgIdOrSetDefault(user.email!);
  const membership = await getMembership({ orgId, email: user.email! });
  if (!membership || !["owner", "operator"].includes(membership.role)) {
    return new Response("Forbidden", { status: 403 });
  }
  const { downloadUrl } = await put(`${orgId}/${filename}`, request.body, {
    access: "public",
  });

  const content = await extractTextFromUrl(filename || "", downloadUrl);

  // Extract metadata/entities first (for coverage and filtering)
  const meta = extractMetadata(filename || "", content);
  await upsertFileMetadata({ orgId, filePath: `${orgId}/${filename}`, filename: filename || "", slug: meta.slug, currency: meta.currency, asOfDate: meta.asOfDate, extractedEntities: meta.entities });
  await insertExtractedEntities({ orgId, filePath: `${orgId}/${filename}`, entities: meta.entities });

  // Smart chunking with content-aware sizes
  const chunked = smartSplitText(content);

  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunked.map((c) => c.content),
  });

  // Overwrite semantics: delete then insert to avoid stale chunks/conflicts
  await deleteChunksByFilePath({ filePath: `${orgId}/${filename}` });
  await insertChunks({
    chunks: chunked.map((chunk, i) => ({
      id: `${orgId}/${filename}/${i}`,
      filePath: `${orgId}/${filename}`,
      section: chunk.section || null,
      slug: meta.slug || null,
      sourceUrl: downloadUrl,
      asOfDate: (meta.asOfDate ?? null) as any,
      content: chunk.content,
      embedding: embeddings[i],
    })),
  });

  return Response.json({});
}
