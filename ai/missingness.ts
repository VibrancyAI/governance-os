import { RubricPerspective } from "@/ai/rubrics";
import { listRequiredSlugsForPerspective, getChecklistBySlug } from "@/ai/checklist";

export type CoverageScore = {
  slug: string;
  presence: boolean;
  adequacy: "unknown" | "insufficient" | "sufficient";
  freshness: "unknown" | "stale" | "fresh";
  reasons: string[];
  nextSteps: string[];
};

export function scoreCoverage({ perspective, presentSlugs, metadataBySlug }: { perspective: RubricPerspective; presentSlugs: Set<string>; metadataBySlug?: Map<string, { asOfDate?: Date | null }> }) {
  const required = listRequiredSlugsForPerspective(perspective);
  const results: CoverageScore[] = [];
  const now = new Date();
  for (const slug of required) {
    const presence = presentSlugs.has(slug);
    const reasons: string[] = [];
    const nextSteps: string[] = [];

    let adequacy: CoverageScore["adequacy"] = "unknown";
    // heuristic: presence implies adequacy unknown; can be refined via LLM-based content checks later
    if (!presence) {
      adequacy = "insufficient";
      reasons.push("No associated file uploaded");
      nextSteps.push(`Upload evidence for ${getChecklistBySlug(slug)?.title || slug}`);
    }

    let freshness: CoverageScore["freshness"] = "unknown";
    const meta = metadataBySlug?.get(slug);
    if (meta?.asOfDate) {
      const ageDays = Math.floor((now.getTime() - new Date(meta.asOfDate).getTime()) / (1000 * 60 * 60 * 24));
      freshness = ageDays <= 90 ? "fresh" : "stale";
      if (freshness === "stale") {
        reasons.push(`Evidence older than 90 days (${ageDays}d)`);
        nextSteps.push("Upload updated version");
      }
    }

    results.push({ slug, presence, adequacy, freshness, reasons, nextSteps });
  }
  return results;
}
