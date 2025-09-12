"use client";

import useSWR from "swr";
import { fetcher } from "@/utils/functions";

export function CoverageSummary({ perspective = "founder" as "founder" | "investor_diligence" | "acquirer_mna" }) {
  const { data } = useSWR<{ coveragePct: number; topGaps: Array<{ slug: string; reasons: string[] }> }>(`/api/coverage?perspective=${perspective}`, fetcher, { fallbackData: { coveragePct: 0, topGaps: [] } });

  return (
    <div className="w-full max-w-[900px] mx-auto mb-4 px-4 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Data room coverage</div>
            <div className="text-2xl font-semibold text-slate-800">{data?.coveragePct ?? 0}%</div>
          </div>
          <div className="text-xs text-slate-500">Perspective: {perspective}</div>
        </div>
        {data?.topGaps && data.topGaps.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-slate-700 mb-2">Top gaps</div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.topGaps.slice(0, 6).map((g) => (
                <li key={g.slug} className="text-sm text-slate-700 border border-slate-200 rounded-lg p-2 bg-slate-50/60">
                  <div className="font-medium">{g.slug}</div>
                  {g.reasons && g.reasons.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">{g.reasons[0]}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
