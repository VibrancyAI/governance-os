import { auth } from "@/app/(auth)/auth";
import { openai } from "@ai-sdk/openai";
import { Experimental_LanguageModelV1Middleware } from "ai";
import { z } from "zod";
import { hybridRetrieve } from "@/ai/retrieval";
import { dataRoomStructure, slugify } from "@/components/data-room-structure";
import { getFileMetadataForOrg, getOrgFileAssociations } from "@/app/db";

// schema for validating the custom provider metadata
const selectionSchema = z.object({
  files: z.object({
    selection: z.array(z.string()),
    orgId: z.string().optional(),
    presentSlugs: z.array(z.string()).optional(),
    metadata: z.any().optional(),
  }),
});

function sanitizeContext(input: string): string {
  // strip common prompt-injection phrases and system-like instructions
  const dangerous = [/ignore (all|any) previous instructions/i, /act as/i, /system prompt/i, /confidential/i];
  let out = input;
  for (const re of dangerous) out = out.replace(re, "");
  return out;
}

function classifyLocally(text: string): "question" | "statement" | "other" {
  const t = text.trim();
  if (!t) return "other";
  if (/[?]$/.test(t) || /\b(how|what|why|when|where|which|who)\b/i.test(t)) return "question";
  if (/^(draft|write|create|analyze|audit|assess|summarize|list|generate)\b/i.test(t)) return "statement";
  return "statement"; // default to enabling RAG for action prompts
}

function inferSlugsFromQuery(query: string): string[] {
  const t = query.toLowerCase();
  const items = dataRoomStructure.flatMap((s) => s.documents.map((d) => ({ label: d, slug: slugify(d) })));
  const hits = new Set<string>();
  for (const { label, slug } of items) {
    const l = label.toLowerCase();
    if (t.includes(l)) { hits.add(slug); continue; }
    const tokens = l.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    let matches = 0;
    for (const tok of tokens) {
      if (t.includes(tok)) matches++;
    }
    if (matches >= Math.min(2, tokens.length)) hits.add(slug);
    // hyphen form
    if (t.includes(slug.replace(/-/g, " "))) hits.add(slug);
  }
  return Array.from(hits);
}

function slugToLabel(slug: string): string {
  for (const s of dataRoomStructure) {
    for (const d of s.documents) {
      if (slugify(d) === slug) return d;
    }
  }
  return slug.replace(/-/g, " ");
}

export const ragMiddleware: Experimental_LanguageModelV1Middleware = {
  transformParams: async ({ params }) => {
    const session = await auth();

    if (!session) return params; // no user session

    const { prompt: messages, providerMetadata } = params;

    // validate the provider metadata with Zod:
    const { success, data } = selectionSchema.safeParse(providerMetadata);

    if (!success) return params; // no files selected

    const selection = data.files.selection;
    const orgId = (providerMetadata as any)?.files?.orgId as string | undefined;
    if (!orgId) return params;

    const recentMessage = messages.pop();

    if (!recentMessage || recentMessage.role !== "user") {
      if (recentMessage) {
        messages.push(recentMessage);
      }

      return params;
    }

    const lastUserMessageContent = recentMessage.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n");

    // Local classifier to decide if we should include RAG context
    const classification = classifyLocally(lastUserMessageContent);

    const shouldUseRag = classification === "question" || classification === "statement";
    if (!shouldUseRag) {
      messages.push(recentMessage);
      return params;
    }

    // Resolve intent slugs from query and map to associated filenames or metadata
    const intentSlugs = inferSlugsFromQuery(lastUserMessageContent);
    let resolvedSelection = new Set<string>(selection);
    const presentSlugs = new Set<string>((providerMetadata as any)?.files?.presentSlugs || []);
    if (intentSlugs.length > 0) {
      try {
        const assoc = await getOrgFileAssociations({ orgId });
        for (const slug of intentSlugs) {
          const row = (assoc || []).find((a: any) => a.labelSlug === slug);
          if (row?.fileName) resolvedSelection.add(row.fileName);
        }
        const metas = await getFileMetadataForOrg({ orgId });
        for (const m of metas || []) {
          const s = (m as any).slug as string | null;
          if (s && intentSlugs.includes(s)) {
            const fp = ((m as any).filePath || "") as string;
            const name = fp.startsWith(`${orgId}/`) ? fp.slice(`${orgId}/`.length) : (m as any).filename;
            if (name) resolvedSelection.add(name);
          }
        }
      } catch {}
    }

    // Fallback: if no files are selected and we have uploads, search across all org files
    if (resolvedSelection.size === 0) {
      try {
        const metas = await getFileMetadataForOrg({ orgId });
        for (const m of metas || []) {
          const name = (m as any).filename as string | undefined;
          if (name) resolvedSelection.add(name);
        }
      } catch {}
    }

    // Hybrid retrieval with file or slug filters
    const top = await hybridRetrieve({
      filters: {
        orgId,
        filePathnames: Array.from(resolvedSelection).length > 0 ? Array.from(resolvedSelection) : undefined,
        slugs: intentSlugs.length > 0 ? intentSlugs : undefined,
        query: lastUserMessageContent,
      },
      topK: 20,
    });

    // Add status preface so the model answers with text first
    const statusLine = (() => {
      const labels = intentSlugs.map(slugToLabel).join(", ");
      const missingIntent = intentSlugs.filter((s) => !presentSlugs.has(s));
      if (top.length === 0) {
        return `Status: No relevant evidence found for [${labels || "requested item"}] in the user's data room. After a brief answer, append ui-json with upload and assign actions ONLY for these missing items: [${missingIntent.map(slugToLabel).join(", ")}] (use canonical slugs).`;
      }
      const files = new Set(top.map((t) => t.filePath.split("/").slice(1).join("/")));
      // Include present slugs to discourage suggesting uploads for existing items
      const present = Array.from(presentSlugs).map(slugToLabel).join(", ");
      return `Status: Found relevant evidence for [${labels || "requested item"}] across ${files.size} file(s). Existing items include: [${present}]. Missing intent items (no dedicated evidence): [${missingIntent.map(slugToLabel).join(", ")}]. Do NOT recommend uploads for existing items. If an intent item is missing, after the prose append ui-json with upload and assign for that item only (canonical slugs). If the user asks "what files do we have", list filenames and short labels before any actions.`;
    })();

    messages.push({
      role: "user",
      content: [
        ...recentMessage.content,
        { type: "text", text: statusLine },
        { type: "text", text: "Relevant context from the user's data room (with sources):" },
        ...top.map((t) => ({ type: "text" as const, text: `Source: ${t.filePath}\n${sanitizeContext(t.content)}` })),
      ],
    });

    return { ...params, prompt: messages };
  },
};
