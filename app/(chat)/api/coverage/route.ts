import { auth } from "@/app/(auth)/auth";
import { getCurrentOrgIdOrSetDefault } from "@/app/api/orgs/_utils";
import { getFileMetadataForOrg, getOrgFileAssociations } from "@/app/db";
import { scoreCoverage } from "@/ai/missingness";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const perspective = (url.searchParams.get("perspective") || "founder") as "founder" | "investor_diligence" | "acquirer_mna";

  const orgId = await getCurrentOrgIdOrSetDefault(session.user.email);
  const [metaRows, assoc] = await Promise.all([
    getFileMetadataForOrg({ orgId }),
    getOrgFileAssociations({ orgId }),
  ]);
  const presentSlugs = new Set<string>(assoc.map((a) => a.labelSlug));
  const metadataBySlug = new Map<string, { asOfDate?: Date | null }>();
  for (const m of metaRows) if (m.slug) metadataBySlug.set(m.slug, { asOfDate: (m as any).asOfDate });

  const coverage = scoreCoverage({ perspective, presentSlugs, metadataBySlug });
  const present = coverage.filter((c) => c.presence).length;
  const coveragePct = Math.round((present / Math.max(1, coverage.length)) * 100);

  const gaps = coverage
    .filter((c) => !c.presence || c.freshness === "stale" || c.adequacy !== "sufficient")
    .slice(0, 20);

  return Response.json({ coveragePct, coverage, topGaps: gaps });
}
