import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { createMessage, getOrgFileAssociations, getFileMetadataForOrg } from "@/app/db";
import { streamText } from "ai";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";
import { buildAdvisorSystemPrompt } from "@/ai/prompt-builder";

export async function POST(request: Request) {
  const { id, messages, selectedFilePathnames, perspective } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orgId = await getCurrentOrgIdOrSetDefault(session.user!.email!);

  // Compute coverage from org file associations, file metadata slugs, and selected files
  const assoc = await getOrgFileAssociations({ orgId });
  const presentSlugs = new Set<string>();
  for (const row of assoc) {
    if (row.labelSlug) presentSlugs.add(row.labelSlug);
  }
  // include detected slugs from uploaded files (metadata extractor)
  try {
    const metas = await getFileMetadataForOrg({ orgId });
    for (const m of metas || []) {
      const s = (m as any).slug as string | null;
      if (s) presentSlugs.add(s);
    }
  } catch {}
  // also include normalized file pathnames (best-effort; they may not match slugs exactly)
  for (const path of selectedFilePathnames || []) {
    const normalized = path
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    presentSlugs.add(normalized);
  }

  const { prompt: systemPrompt } = buildAdvisorSystemPrompt({ perspective, coverage: { presentSlugs }, orgId });

  const result = streamText({
    model: customModel,
    system: systemPrompt,
    messages,
    temperature: 1,
    toolChoice: "none",
    experimental_providerMetadata: {
      files: {
        selection: selectedFilePathnames,
        // expose missing items to middleware-aware models
        metadata: {
          missing: selectedFilePathnames.length === 0 ? "all" : "partial",
        },
        orgId,
        presentSlugs: Array.from(presentSlugs),
      },
    },
    onFinish: async ({ text }) => {
      await createMessage({
        id,
        messages: [...messages, { role: "assistant", content: text }],
        author: session.user?.email!,
      });
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}
