import { scoreCoverage } from "@/ai/missingness";
import { getChecklistBySlug } from "@/ai/checklist";
import { getChunksByFilePaths, getFileMetadataForOrg, getOrgFileAssociations, getEntitiesForOrg, setAssignment, getOrgMembers } from "@/app/db";
import { tool } from "ai";
import { z } from "zod";

async function tool_scoreCoverage_exec({ orgId, perspective }: { orgId: string; perspective: "founder" | "investor_diligence" | "acquirer_mna" }) {
  const metaRows = await getFileMetadataForOrg({ orgId });
  const assoc = await getOrgFileAssociations({ orgId });
  const presentSlugs = new Set<string>(assoc.map((a) => a.labelSlug));
  const metadataBySlug = new Map<string, { asOfDate?: Date | null }>();
  for (const m of metaRows) if (m.slug) metadataBySlug.set(m.slug, { asOfDate: (m as any).asOfDate });
  return scoreCoverage({ perspective, presentSlugs, metadataBySlug });
}

async function tool_findEvidence_exec({ orgId, slug }: { orgId: string; slug: string }) {
  const assoc = await getOrgFileAssociations({ orgId });
  const matches = assoc.filter((a) => a.labelSlug === slug);
  if (matches.length === 0) return [] as Array<{ filePath: string; content: string }>;
  const filePaths = matches.map((m) => `${orgId}/${m.fileName}`);
  const chunks = await getChunksByFilePaths({ filePaths });
  return chunks.map((c) => ({ filePath: c.filePath, content: c.content }));
}

async function tool_generateTemplate_exec({ slug, perspective }: { slug: string; perspective: string }) {
  const item = getChecklistBySlug(slug);
  return {
    title: item?.title || slug,
    sections: ["Summary", "Key Data", "Assumptions", "Risks", "Appendix"],
    acceptanceCriteria: item?.acceptanceCriteria || [],
    perspective,
  };
}

async function tool_extractEntities_exec({ orgId, filePath }: { orgId: string; filePath: string }) {
  const rows = await getEntitiesForOrg({ orgId });
  const filtered = rows.filter((r) => r.filePath === filePath);
  return filtered.map((r) => ({ key: (r as any).key, value: (r as any).value, confidence: (r as any).confidence, unit: (r as any).unit, asOfDate: (r as any).asOfDate }));
}

async function tool_createAssignment_exec({ orgId, slug, assigneeEmail }: { orgId: string; slug: string; assigneeEmail: string }) {
  const members = await getOrgMembers({ orgId });
  if (!members.find((m) => m.userEmail === assigneeEmail)) {
    return { ok: false, error: "Assignee not in org" };
  }
  await setAssignment({ orgId, labelSlug: slug, assigneeEmail, assignedByEmail: assigneeEmail });
  return { ok: true };
}

export const advisorTools = {
  scoreCoverage: tool({
    description: "Compute presence/adequacy/freshness coverage for required items in the active perspective.",
    parameters: z.object({
      orgId: z.string(),
      perspective: z.enum(["founder", "investor_diligence", "acquirer_mna"]),
    }),
    execute: tool_scoreCoverage_exec as any,
  }),
  findEvidence: tool({
    description: "Find RAG chunks for a checklist slug, returning filePath and content.",
    parameters: z.object({ orgId: z.string(), slug: z.string() }),
    execute: tool_findEvidence_exec as any,
  }),
  extractEntities: tool({
    description: "Return previously extracted entities for a file.",
    parameters: z.object({ orgId: z.string(), filePath: z.string() }),
    execute: tool_extractEntities_exec as any,
  }),
  generateTemplate: tool({
    description: "Return a template skeleton for a checklist item.",
    parameters: z.object({ slug: z.string(), perspective: z.string() }),
    execute: tool_generateTemplate_exec as any,
  }),
  createAssignment: tool({
    description: "Create an assignment for a checklist slug and assignee email.",
    parameters: z.object({ orgId: z.string(), slug: z.string(), assigneeEmail: z.string().email() }),
    execute: tool_createAssignment_exec as any,
  }),
};
