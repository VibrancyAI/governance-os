import { auth } from "@/app/(auth)/auth";
import { insertChunks, deleteChunksByFilePath } from "@/app/db";
import { extractTextFromUrl } from "@/utils/extract";
import { openai } from "@ai-sdk/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { put } from "@vercel/blob";
import { embedMany } from "ai";

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

  const { downloadUrl } = await put(`${user.email}/${filename}`, request.body, {
    access: "public",
  });

  const content = await extractTextFromUrl(filename || "", downloadUrl);
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
  });
  const chunkedContent = await textSplitter.createDocuments([content]);

  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunkedContent.map((chunk) => chunk.pageContent),
  });

  // Upsert semantics: try insert; on conflict replace content/embedding
  try {
    await insertChunks({
      chunks: chunkedContent.map((chunk, i) => ({
        id: `${user.email}/${filename}/${i}`,
        filePath: `${user.email}/${filename}`,
        content: chunk.pageContent,
        embedding: embeddings[i],
      })),
    });
  } catch (e) {
    // Best-effort overwrite: delete old chunks for this file then reinsert
    // This avoids unique constraint violations when replacing files
    await deleteChunksByFilePath({ filePath: `${user.email}/${filename}` });
    await insertChunks({
      chunks: chunkedContent.map((chunk, i) => ({
        id: `${user.email}/${filename}/${i}`,
        filePath: `${user.email}/${filename}`,
        content: chunk.pageContent,
        embedding: embeddings[i],
      })),
    });
  }

  return Response.json({});
}
