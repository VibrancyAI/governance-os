import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { getChunksByFilePaths } from "@/app/db";

export type RetrievalFilters = {
  orgId: string;
  filePathnames?: string[];
  slugs?: string[];
  section?: string;
  since?: Date;
  currency?: string;
  query?: string;
};

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function hybridRetrieve({ filters, topK = 20 }: { filters: RetrievalFilters; topK?: number }) {
  const query = (filters.query || "").slice(0, 2000);
  let filePaths: string[] | undefined = undefined;
  if (filters.filePathnames && filters.filePathnames.length > 0) {
    filePaths = filters.filePathnames.map((p) => `${filters.orgId}/${p}`);
  }
  if (!filePaths) return [] as Array<{ content: string; filePath: string }>;

  const { embeddings } = await embedMany({ model: openai.embedding("text-embedding-3-small"), values: [query] });
  const q = embeddings[0] as unknown as number[];

  const candidates = await getChunksByFilePaths({ filePaths });

  const keyword = query.toLowerCase();
  const filtered = candidates.filter((c) => {
    if (filters.section && c.section && c.section !== filters.section) return false;
    if (filters.slugs && filters.slugs.length > 0 && c.slug && !filters.slugs.includes(c.slug)) return false;
    if (filters.since && c.asOfDate && new Date(c.asOfDate) < filters.since) return false;
    return true;
  });

  const scoredDense = filtered.map((c) => {
    const dense = cosineSim(q as any, (c.embedding as unknown as number[]) || []);
    // small keyword boost; also detect roadmap synonyms when query suggests roadmap
    const txt = c.content.toLowerCase();
    const kwMatch = keyword && keyword.length > 2 ? (txt.includes(keyword) ? 0.06 : 0) : 0;
    const roadmapBoost = /roadmap|prd|product requirements/i.test(filters.query || "") && /(roadmap|prd|product requirements)/i.test(c.content) ? 0.04 : 0;
    const kw = kwMatch + roadmapBoost;
    return { filePath: c.filePath, content: c.content, dense, boost: kw, score: dense + kw };
  });
  scoredDense.sort((a, b) => b.score - a.score);
  const preTop = scoredDense.slice(0, Math.min(200, scoredDense.length));

  // Statistical rerank: blend dense similarity, keyword boost, and recency
  const reranked = preTop.map((c) => {
    // recency boost based on asOfDate if available on chunk (optional, may be null)
    const recency = 0; // placeholder; chunk metadata not available in this scope
    const combined = 0.9 * c.score + 0.1 * recency;
    return { content: c.content, filePath: c.filePath, score: combined };
  });
  reranked.sort((a, b) => b.score - a.score);
  return reranked.slice(0, topK);
}
